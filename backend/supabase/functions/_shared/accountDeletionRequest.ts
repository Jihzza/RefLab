export const ACCOUNT_DELETION_CONFIRMATION = "DELETE";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export type AccountDeletionRequestUser = {
  id: string;
};

export type AccountDeletionRequestDependencies = {
  authenticate: (
    authorization: string,
  ) => Promise<{ user: AccountDeletionRequestUser | null; error: unknown }>;
  jobExists: (userId: string) => Promise<boolean>;
  sessionIsRecentlyReauthenticated: (
    authorization: string,
  ) => Promise<boolean>;
  enqueue: (userId: string) => Promise<void>;
  revokeRefreshSessions: (authorization: string) => Promise<void>;
  logError?: (message: string, error: unknown) => void;
};

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...headers,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Authenticates and durably enqueues deletion. The request endpoint never runs
 * Stripe, Storage, or Auth deletion itself; only the autonomous worker does.
 */
export async function handleAccountDeletionEnqueueRequest(
  req: Request,
  dependencies: AccountDeletionRequestDependencies,
) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed", code: "method_not_allowed" },
      405,
      {
        "Allow": "POST, OPTIONS",
      },
    );
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return jsonResponse(
      { error: "Missing authorization header", code: "authorization_missing" },
      401,
    );
  }

  let authenticated: Awaited<
    ReturnType<AccountDeletionRequestDependencies["authenticate"]>
  >;
  try {
    authenticated = await dependencies.authenticate(authorization);
  } catch (error) {
    dependencies.logError?.("delete-account: Auth verification failed", error);
    return jsonResponse(
      {
        error: "Account deletion is temporarily unavailable",
        code: "auth_verification_unavailable",
      },
      503,
    );
  }

  if (authenticated.error || !authenticated.user) {
    return jsonResponse(
      {
        error: "Invalid, expired, or deleted account session",
        code: "account_not_found_or_session_invalid",
      },
      401,
    );
  }

  const body = await req.json().catch(() => null) as
    | { confirmation?: unknown; expected_user_id?: unknown }
    | null;
  if (body?.confirmation !== ACCOUNT_DELETION_CONFIRMATION) {
    return jsonResponse(
      {
        error:
          `Type ${ACCOUNT_DELETION_CONFIRMATION} to confirm account deletion`,
        code: "confirmation_mismatch",
      },
      400,
    );
  }

  const user = authenticated.user;
  if (
    typeof body?.expected_user_id !== "string" ||
    body.expected_user_id !== user.id
  ) {
    return jsonResponse(
      {
        error: "The authenticated account changed before deletion",
        code: "account_identity_mismatch",
      },
      403,
    );
  }

  let alreadyRequested: boolean;
  try {
    // A response-loss retry acknowledges the already-durable request without
    // trying to take the worker's lease and without requiring a newer sign-in.
    alreadyRequested = await dependencies.jobExists(user.id);
  } catch (error) {
    dependencies.logError?.(
      "delete-account: deletion status check unavailable",
      error,
    );
    return jsonResponse(
      {
        error: "Account deletion is temporarily unavailable",
        code: "deletion_status_check_unavailable",
      },
      503,
    );
  }

  if (!alreadyRequested) {
    let recentlyReauthenticated = false;
    try {
      recentlyReauthenticated = await dependencies
        .sessionIsRecentlyReauthenticated(authorization);
    } catch (error) {
      dependencies.logError?.(
        "delete-account: session reauthentication proof unavailable",
        error,
      );
      return jsonResponse(
        {
          error: "Account deletion is temporarily unavailable",
          code: "reauthentication_check_unavailable",
        },
        503,
      );
    }

    if (!recentlyReauthenticated) {
      return jsonResponse(
        {
          error: "Sign in again before deleting your account",
          code: "reauthentication_required",
        },
        403,
      );
    }

    try {
      await dependencies.enqueue(user.id);
    } catch (error) {
      // The database call may have committed even if its response was lost. The
      // client therefore treats this as ambiguous, keeps its local tombstone,
      // and retries without claiming success until it receives a 202 response.
      dependencies.logError?.(
        "delete-account: failed to confirm durable enqueue",
        error,
      );
      return jsonResponse(
        {
          error: "Account deletion could not be confirmed",
          code: "deletion_enqueue_ambiguous",
        },
        503,
      );
    }
  }

  try {
    // Global Auth sign-out invalidates every refresh session. Already-issued
    // access JWTs remain valid until exp, so database read/write contracts
    // must still reject callers whose durable deletion job exists.
    await dependencies.revokeRefreshSessions(authorization);
  } catch (error) {
    dependencies.logError?.(
      "delete-account: failed to confirm refresh-session revocation",
      error,
    );
    return jsonResponse(
      {
        error: "Account deletion is queued, but session revocation is pending",
        code: "deletion_session_revocation_ambiguous",
      },
      503,
    );
  }

  return jsonResponse(
    { accepted: true, already_requested: alreadyRequested },
    202,
  );
}
