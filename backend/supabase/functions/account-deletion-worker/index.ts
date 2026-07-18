import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";
import {
  AccountDeletionError,
  claimNextDeletionJob,
  type DeletionContext,
  releaseDeletionAfterFailure,
  runAccountDeletionWorkflow,
} from "../_shared/accountDeletionWorkflow.ts";

const workerSecretHeader = "x-account-deletion-worker-secret";

async function digestSecret(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value),
    ),
  );
}

export async function workerAuthorizationStatus(
  configuredSecret: string | undefined,
  candidateSecret: string | null,
) {
  // Fail closed on missing or operationally weak configuration. The runbook
  // provisions a 32-byte random value (base64 is longer than 32 characters).
  if (!configuredSecret || configuredSecret.length < 32) return 503;
  if (!candidateSecret) return 401;

  const [expected, candidate] = await Promise.all([
    digestSecret(configuredSecret),
    digestSecret(candidateSecret),
  ]);
  let difference = expected.length ^ candidate.length;
  const length = Math.max(expected.length, candidate.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (expected[index] ?? 0) ^ (candidate[index] ?? 0);
  }
  return difference === 0 ? 200 : 401;
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleAccountDeletionWorkerRequest(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Allow": "POST", "Content-Type": "application/json" },
    });
  }

  const authorizationStatus = await workerAuthorizationStatus(
    Deno.env.get("ACCOUNT_DELETION_WORKER_SECRET"),
    req.headers.get(workerSecretHeader),
  );
  if (authorizationStatus === 503) {
    console.error(
      "account-deletion-worker: dedicated worker secret is not configured",
    );
    return jsonResponse({ error: "Worker is not configured" }, 503);
  }
  if (authorizationStatus !== 200) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "account-deletion-worker: Supabase environment is not configured",
    );
    return jsonResponse({ error: "Worker is not configured" }, 503);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const leaseId = crypto.randomUUID();
  let context: DeletionContext | null = null;

  try {
    const job = await claimNextDeletionJob(supabaseAdmin, leaseId);
    if (!job) return jsonResponse({ processed: false }, 200);

    context = {
      supabaseAdmin,
      userId: job.user_id,
      leaseId,
      job,
    };
    await runAccountDeletionWorkflow(context);
    return jsonResponse({ processed: true }, 200);
  } catch (error) {
    const errorCode = error instanceof AccountDeletionError
      ? error.code
      : "unexpected_worker_failure";
    if (context) await releaseDeletionAfterFailure(context, errorCode);
    console.error(
      "account-deletion-worker: job failed and remains resumable",
      error,
    );
    return jsonResponse(
      { error: "Deletion job failed and will be retried" },
      500,
    );
  }
}

if (import.meta.main) {
  serve(handleAccountDeletionWorkerRequest);
}
