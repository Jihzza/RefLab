import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.110.7";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import {
  type AccountDeletionJob,
  type AccountDeletionPhase,
  authLookupConfirmsAbsence,
  buildBillingCustomerCreateParams,
  buildMessageMediaDeletionPlan,
  chunkForBoundedConcurrency,
  isAccountDeletionPhase,
  retainExistingStorageObjectPaths,
  storageObjectParentPrefixes,
} from "./accountDeletionState.ts";
import { handleAccountDeletionEnqueueRequest } from "./accountDeletionRequest.ts";

function isClosedSubscription(status: string) {
  return status === "canceled" || status === "incomplete_expired";
}

function isMissingStripeResource(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const stripeError = error as { code?: string; statusCode?: number };
  return stripeError.code === "resource_missing" ||
    stripeError.statusCode === 404;
}

function isDeletedStripeCustomer(
  customer: Stripe.Customer | Stripe.DeletedCustomer,
): customer is Stripe.DeletedCustomer {
  return "deleted" in customer && customer.deleted === true;
}

async function expireCheckoutIfOpen(
  stripe: Stripe,
  checkoutSessionId: string,
) {
  try {
    await stripe.checkout.sessions.expire(checkoutSessionId);
  } catch (expireError) {
    if (isMissingStripeResource(expireError)) return;

    // Completion/expiry can race the list call. A non-open latest state is
    // safe because the authoritative subscription sweep runs immediately
    // afterwards and cancels any subscription that completion created.
    try {
      const latest = await stripe.checkout.sessions.retrieve(checkoutSessionId);
      if (latest.status !== "open") return;
    } catch (retrieveError) {
      if (isMissingStripeResource(retrieveError)) return;
    }

    throw expireError;
  }
}

type StorageListItem = {
  id: string | null;
  name: string;
  metadata: Record<string, unknown> | null;
};

async function listStorageObjectPaths(
  supabaseAdmin: SupabaseClient,
  bucket: string,
  prefix: string,
  heartbeat: () => Promise<void>,
  recursive = true,
  depth = 0,
): Promise<string[]> {
  if (depth > 12) {
    throw new Error(`Storage prefix is nested too deeply in ${bucket}`);
  }

  const paths: string[] = [];
  const pageSize = 100;
  let offset = 0;

  while (true) {
    await heartbeat();
    const { data, error } = await supabaseAdmin.storage.from(bucket).list(
      prefix,
      {
        limit: pageSize,
        offset,
        sortBy: { column: "name", order: "asc" },
      },
    );
    if (error) throw new Error(`Failed to list ${bucket}: ${error.message}`);

    const page = (data ?? []) as StorageListItem[];
    for (const item of page) {
      if (!item.name) continue;
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id || item.metadata) {
        paths.push(path);
      } else if (recursive) {
        paths.push(
          ...await listStorageObjectPaths(
            supabaseAdmin,
            bucket,
            path,
            heartbeat,
            true,
            depth + 1,
          ),
        );
      }
    }

    if (page.length < pageSize) break;
    offset += page.length;
  }

  return paths;
}

async function discoverExistingReferencedStorageObjects(
  supabaseAdmin: SupabaseClient,
  bucket: string,
  referencedPaths: readonly string[],
  heartbeat: () => Promise<void>,
) {
  const listedPaths: string[] = [];
  for (
    const prefixBatch of chunkForBoundedConcurrency(
      storageObjectParentPrefixes(referencedPaths),
      10,
    )
  ) {
    await heartbeat();
    listedPaths.push(
      ...(
        await Promise.all(
          prefixBatch.map((prefix) =>
            listStorageObjectPaths(
              supabaseAdmin,
              bucket,
              prefix,
              heartbeat,
              false,
            )
          ),
        )
      ).flat(),
    );
  }

  return retainExistingStorageObjectPaths(referencedPaths, listedPaths);
}

async function discoverDeletionBoundStorageObjects(
  supabaseAdmin: SupabaseClient,
  userId: string,
  heartbeat: () => Promise<void>,
) {
  const pageSize = 1000;
  const conversationsById = new Map<string, {
    id: string;
    user_a_id: string | null;
    user_b_id: string | null;
  }>();
  for (const endpointColumn of ["user_a_id", "user_b_id"] as const) {
    for (let offset = 0;; offset += pageSize) {
      await heartbeat();
      const { data, error } = await supabaseAdmin
        .from("conversations")
        .select("id, user_a_id, user_b_id")
        .eq(endpointColumn, userId)
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) {
        throw new Error(
          `Failed to discover message conversations: ${error.message}`,
        );
      }
      for (const conversation of data ?? []) {
        conversationsById.set(conversation.id, conversation);
      }
      if ((data ?? []).length < pageSize) break;
    }
  }

  type MessageMediaRow = {
    id: string;
    conversation_id: string;
    sender_id: string;
    media_url: string | null;
  };
  const messagesById = new Map<string, MessageMediaRow>();
  for (let offset = 0;; offset += pageSize) {
    await heartbeat();
    const { data, error } = await supabaseAdmin
      .from("messages")
      .select("id, conversation_id, sender_id, media_url")
      .eq("sender_id", userId)
      .not("media_url", "is", null)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) {
      throw new Error(`Failed to discover message media: ${error.message}`);
    }
    for (const message of data ?? []) messagesById.set(message.id, message);
    if ((data ?? []).length < pageSize) break;
  }

  const ownerPlan = buildMessageMediaDeletionPlan(
    userId,
    [...conversationsById.values()],
    [...messagesById.values()],
    Deno.env.get("SUPABASE_URL") ?? null,
  );

  // A conversation whose other endpoint is already null will be removed by
  // cleanup_empty_tombstone_conversation when this profile disappears. Capture
  // every sender's referenced media before that cascade removes the manifest.
  // Active survivor conversations deliberately keep counterpart media.
  for (
    const batch of chunkForBoundedConcurrency(
      ownerPlan.doomedConversationIds,
      50,
    )
  ) {
    for (let offset = 0;; offset += pageSize) {
      await heartbeat();
      const { data, error } = await supabaseAdmin
        .from("messages")
        .select("id, conversation_id, sender_id, media_url")
        .in("conversation_id", batch)
        .not("media_url", "is", null)
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) {
        throw new Error(
          `Failed to discover doomed-conversation media: ${error.message}`,
        );
      }
      for (const message of data ?? []) messagesById.set(message.id, message);
      if ((data ?? []).length < pageSize) break;
    }
  }

  const messagePlan = buildMessageMediaDeletionPlan(
    userId,
    [...conversationsById.values()],
    [...messagesById.values()],
    Deno.env.get("SUPABASE_URL") ?? null,
  );

  const [profilePaths, postPaths, legacyMessagePaths] = await Promise.all([
    listStorageObjectPaths(supabaseAdmin, "profile-media", userId, heartbeat),
    listStorageObjectPaths(supabaseAdmin, "post-media", userId, heartbeat),
    // Legacy message uploads were direct children of <sender-id>. Do not
    // recurse, so even a pathological conversation-ID collision cannot
    // delete another participant's nested current-format objects.
    listStorageObjectPaths(
      supabaseAdmin,
      "message-media",
      userId,
      heartbeat,
      false,
    ),
  ]);

  // Bound storage API fan-out for accounts with many conversations. A lease
  // heartbeat between batches prevents a long discovery from being taken over
  // while this worker is still making progress.
  const ownerConversationMessagePaths: string[][] = [];
  for (
    const batch of chunkForBoundedConcurrency(
      messagePlan.ownerConversationIds,
      10,
    )
  ) {
    await heartbeat();
    ownerConversationMessagePaths.push(
      ...await Promise.all(
        batch.map((conversationId) =>
          listStorageObjectPaths(
            supabaseAdmin,
            "message-media",
            `${conversationId}/${userId}`,
            heartbeat,
          )
        ),
      ),
    );
  }

  const discoveredMessagePaths = new Set([
    ...legacyMessagePaths,
    ...ownerConversationMessagePaths.flat(),
  ]);
  const referencedCandidates = messagePlan.referencedPaths.filter((path) =>
    !discoveredMessagePaths.has(path)
  );
  const existingReferencedPaths =
    await discoverExistingReferencedStorageObjects(
      supabaseAdmin,
      "message-media",
      referencedCandidates,
      heartbeat,
    );

  return {
    "profile-media": [...new Set(profilePaths)],
    "post-media": [...new Set(postPaths)],
    "message-media": [
      ...new Set([
        ...legacyMessagePaths,
        ...ownerConversationMessagePaths.flat(),
        ...existingReferencedPaths,
      ]),
    ],
  };
}

async function removeStorageObjects(
  supabaseAdmin: SupabaseClient,
  objectsByBucket: Record<string, string[]>,
  heartbeat: () => Promise<void>,
) {
  const batchSize = 100;
  for (const [bucket, paths] of Object.entries(objectsByBucket)) {
    for (let index = 0; index < paths.length; index += batchSize) {
      await heartbeat();
      const batch = paths.slice(index, index + batchSize);
      const { error } = await supabaseAdmin.storage.from(bucket).remove(batch);
      if (error) {
        throw new Error(`Failed to delete ${bucket}: ${error.message}`);
      }
    }
  }
}

function countStorageObjects(objectsByBucket: Record<string, string[]>) {
  return Object.values(objectsByBucket).reduce(
    (total, paths) => total + paths.length,
    0,
  );
}

async function purgeDeletionBoundStorageObjects(
  supabaseAdmin: SupabaseClient,
  userId: string,
  heartbeat: () => Promise<void>,
) {
  // Discover as late as possible, then verify after every sweep. This closes
  // the practical race where another tab finishes an upload while billing is
  // being canceled. If uploads keep appearing, fail closed and retain the
  // account rather than knowingly orphaning personal media.
  const maxSweeps = 3;

  for (let sweep = 0; sweep < maxSweeps; sweep += 1) {
    await heartbeat();
    const deletionBoundObjects = await discoverDeletionBoundStorageObjects(
      supabaseAdmin,
      userId,
      heartbeat,
    );

    if (countStorageObjects(deletionBoundObjects) === 0) return;
    await removeStorageObjects(supabaseAdmin, deletionBoundObjects, heartbeat);
  }

  await heartbeat();
  const remainingObjects = await discoverDeletionBoundStorageObjects(
    supabaseAdmin,
    userId,
    heartbeat,
  );
  if (countStorageObjects(remainingObjects) > 0) {
    throw new Error(
      "Deletion-bound storage objects kept appearing during account deletion",
    );
  }
}

const deletionLeaseSeconds = 15 * 60;

export type DeletionContext = {
  supabaseAdmin: SupabaseClient;
  userId: string;
  leaseId: string;
  job: AccountDeletionJob;
};

export class AccountDeletionError extends Error {
  constructor(
    readonly status: number,
    readonly publicMessage: string,
    readonly code: string,
    message = publicMessage,
  ) {
    super(message);
    this.name = "AccountDeletionError";
  }
}

function parseDeletionJob(value: unknown): AccountDeletionJob {
  if (!value || typeof value !== "object") {
    throw new Error("Account deletion RPC returned no job");
  }

  const candidate = value as Partial<AccountDeletionJob>;
  if (
    typeof candidate.user_id !== "string" ||
    !isAccountDeletionPhase(candidate.phase) ||
    typeof candidate.lease_id !== "string" ||
    typeof candidate.lease_expires_at !== "string" ||
    typeof candidate.attempt_count !== "number"
  ) {
    throw new Error("Account deletion RPC returned an invalid job");
  }

  return candidate as AccountDeletionJob;
}

export async function acquireDeletionLease(
  supabaseAdmin: SupabaseClient,
  userId: string,
  leaseId: string,
) {
  const { data, error } = await supabaseAdmin
    .rpc("acquire_account_deletion_lease", {
      p_user_id: userId,
      p_lease_id: leaseId,
      p_lease_seconds: deletionLeaseSeconds,
    })
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to acquire account deletion lease: ${error.message}`,
    );
  }
  return data ? parseDeletionJob(data) : null;
}

export async function claimNextDeletionJob(
  supabaseAdmin: SupabaseClient,
  leaseId: string,
) {
  const { data, error } = await supabaseAdmin
    .rpc("claim_next_account_deletion_job", {
      p_lease_id: leaseId,
      p_lease_seconds: deletionLeaseSeconds,
    })
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to claim account deletion job: ${error.message}`);
  }
  return data ? parseDeletionJob(data) : null;
}

async function renewDeletionLease(context: DeletionContext) {
  const { data, error } = await context.supabaseAdmin.rpc(
    "renew_account_deletion_lease",
    {
      p_user_id: context.userId,
      p_lease_id: context.leaseId,
      p_lease_seconds: deletionLeaseSeconds,
    },
  );

  if (error) {
    throw new Error(`Failed to renew account deletion lease: ${error.message}`);
  }
  if (data !== true) {
    throw new AccountDeletionError(
      409,
      "Account deletion was resumed by another request. Please try again.",
      "lease_lost",
    );
  }
}

async function advanceDeletionPhase(
  context: DeletionContext,
  expectedPhase: AccountDeletionPhase,
  nextPhase: AccountDeletionPhase,
) {
  await renewDeletionLease(context);

  const { data, error } = await context.supabaseAdmin
    .rpc("advance_account_deletion_phase", {
      p_user_id: context.userId,
      p_lease_id: context.leaseId,
      p_expected_phase: expectedPhase,
      p_next_phase: nextPhase,
    })
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to advance account deletion: ${error.message}`);
  }
  if (!data) {
    throw new AccountDeletionError(
      409,
      "Account deletion was resumed by another request. Please try again.",
      "phase_or_lease_changed",
    );
  }

  const job = parseDeletionJob(data);
  context.job = job;
  return job;
}

export async function releaseDeletionAfterFailure(
  context: DeletionContext,
  errorCode: string,
) {
  const { error: releaseError } = await context.supabaseAdmin.rpc(
    "release_account_deletion_lease",
    {
      p_user_id: context.userId,
      p_lease_id: context.leaseId,
      p_error: `${context.job.phase}:${errorCode}`,
    },
  );
  if (releaseError) {
    // A process kill or database outage is still recoverable: the next worker
    // may take over after the 15-minute lease expires.
    console.error(
      "delete-account: failed to release deletion lease",
      releaseError,
    );
  }
}

type BillingProvisioningIntent = {
  intent_id: string;
  idempotency_key: string;
  customer_email: string | null;
  stripe_customer_id: string | null;
  created_at: string;
};

async function recordRecoveredCustomer(
  context: DeletionContext,
  intentId: string,
  customerId: string,
) {
  const { data, error } = await context.supabaseAdmin.rpc(
    "record_account_deletion_provisioned_customer",
    {
      p_user_id: context.userId,
      p_lease_id: context.leaseId,
      p_intent_id: intentId,
      p_stripe_customer_id: customerId,
    },
  );
  if (error) {
    throw new Error(
      `Failed to record recovered billing customer: ${error.message}`,
    );
  }
  if (data !== true) {
    throw new AccountDeletionError(
      409,
      "Account deletion was resumed by another request. Please try again.",
      "lease_lost_during_billing_recovery",
    );
  }
}

async function searchStripeCustomersForUser(
  stripe: Stripe,
  userId: string,
  heartbeat: () => Promise<void>,
) {
  const customers: Stripe.Customer[] = [];
  let page: string | undefined;

  do {
    await heartbeat();
    const result = await stripe.customers.search({
      query: `metadata['supabase_user_id']:'${userId}'`,
      limit: 100,
      ...(page ? { page } : {}),
    });
    customers.push(...result.data);
    if (!result.has_more) break;
    page = result.next_page ?? undefined;
    if (!page) {
      throw new Error("Stripe returned an invalid customer search page");
    }
  } while (page);

  return customers;
}

async function closeStripeCustomer(
  stripe: Stripe,
  customerId: string,
  cancelIfLive: (subscriptionId: string) => Promise<void>,
  heartbeat: () => Promise<void>,
) {
  await heartbeat();
  let customerExists = true;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    customerExists = !isDeletedStripeCustomer(customer);
  } catch (customerError) {
    if (isMissingStripeResource(customerError)) customerExists = false;
    else throw customerError;
  }
  if (!customerExists) return;

  let checkoutCursor: string | undefined;
  do {
    await heartbeat();
    const checkoutPage = await stripe.checkout.sessions.list({
      customer: customerId,
      status: "open",
      limit: 100,
      ...(checkoutCursor ? { starting_after: checkoutCursor } : {}),
    });
    for (const session of checkoutPage.data) {
      if (session.mode === "subscription") {
        await heartbeat();
        await expireCheckoutIfOpen(stripe, session.id);
      }
    }
    if (!checkoutPage.has_more) break;
    checkoutCursor = checkoutPage.data.at(-1)?.id;
    if (!checkoutCursor) {
      throw new Error("Stripe returned an invalid checkout page");
    }
  } while (checkoutCursor);

  let subscriptionCursor: string | undefined;
  do {
    await heartbeat();
    const subscriptionPage = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
      ...(subscriptionCursor ? { starting_after: subscriptionCursor } : {}),
    });
    for (const subscription of subscriptionPage.data) {
      await cancelIfLive(subscription.id);
    }
    if (!subscriptionPage.has_more) break;
    subscriptionCursor = subscriptionPage.data.at(-1)?.id;
    if (!subscriptionCursor) {
      throw new Error("Stripe returned an invalid subscription page");
    }
  } while (subscriptionCursor);

  // Stripe has no portal-session revoke endpoint. Deleting the customer is
  // the final billing barrier and is retry-safe.
  await heartbeat();
  try {
    await stripe.customers.del(customerId);
  } catch (customerError) {
    if (!isMissingStripeResource(customerError)) throw customerError;
  }
}

async function closeBilling(context: DeletionContext) {
  if (context.job.phase === "requested") {
    await advanceDeletionPhase(context, "requested", "billing_closing");
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    console.error("account-deletion: STRIPE_SECRET_KEY is not configured");
    throw new AccountDeletionError(
      503,
      "Billing cancellation is temporarily unavailable",
      "stripe_config_missing",
    );
  }

  const [customerResult, subscriptionsResult, intentsResult] = await Promise
    .all([
      context.supabaseAdmin
        .from("stripe_customers")
        .select("stripe_customer_id")
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabaseAdmin
        .from("stripe_subscriptions")
        .select("stripe_subscription_id")
        .eq("user_id", context.userId),
      context.supabaseAdmin
        .from("billing_customer_provisioning_intents")
        .select(
          "intent_id, idempotency_key, customer_email, stripe_customer_id, created_at",
        )
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true }),
    ]);

  if (customerResult.error) {
    throw new Error(
      `Failed to load billing account: ${customerResult.error.message}`,
    );
  }
  if (subscriptionsResult.error) {
    throw new Error(
      `Failed to load subscriptions: ${subscriptionsResult.error.message}`,
    );
  }
  if (intentsResult.error) {
    throw new Error(
      `Failed to load billing provisioning intents: ${intentsResult.error.message}`,
    );
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2024-04-10",
    httpClient: Stripe.createFetchHttpClient(),
  });
  const heartbeat = () => renewDeletionLease(context);
  const customerIds = new Set<string>();
  const mappedCustomerId = customerResult.data?.stripe_customer_id;
  if (mappedCustomerId) customerIds.add(mappedCustomerId);

  const intents = (intentsResult.data ?? []) as BillingProvisioningIntent[];
  for (const intent of intents) {
    if (intent.stripe_customer_id) customerIds.add(intent.stripe_customer_id);
  }

  try {
    // This search is mandatory on every billing-phase retry. It reconciles
    // customers created by historical checkout code that never wrote a local
    // mapping. Search failure retains billing_closing and fails closed.
    const discoveredCustomers = await searchStripeCustomersForUser(
      stripe,
      context.userId,
      heartbeat,
    );
    for (const customer of discoveredCustomers) customerIds.add(customer.id);

    for (const intent of intents) {
      if (intent.stripe_customer_id) continue;

      let customer = discoveredCustomers.find((candidate) =>
        candidate.metadata?.provisioning_intent_id === intent.intent_id
      );

      if (!customer) {
        const intentAgeMs = Date.now() - new Date(intent.created_at).getTime();
        if (!Number.isFinite(intentAgeMs)) {
          throw new Error(
            "Billing provisioning intent has an invalid timestamp",
          );
        }
        // A fresh intent is protected by Stripe's minimum idempotency-key
        // retention. For an old intent, the successful metadata search above
        // must happen first because Stripe may already have pruned the key.
        const createParams: Stripe.CustomerCreateParams =
          buildBillingCustomerCreateParams(
            context.userId,
            intent.intent_id,
            intent.customer_email,
          );
        await heartbeat();
        customer = await stripe.customers.create(createParams, {
          idempotencyKey: intent.idempotency_key,
        });
      }

      await recordRecoveredCustomer(context, intent.intent_id, customer.id);
      customerIds.add(customer.id);
    }

    const canceledSubscriptionIds = new Set<string>();
    const cancelIfLive = async (subscriptionId: string) => {
      if (canceledSubscriptionIds.has(subscriptionId)) return;
      await heartbeat();

      let subscription: Stripe.Subscription;
      try {
        subscription = await stripe.subscriptions.retrieve(subscriptionId);
      } catch (stripeError) {
        if (isMissingStripeResource(stripeError)) {
          canceledSubscriptionIds.add(subscriptionId);
          return;
        }
        throw stripeError;
      }

      if (!isClosedSubscription(subscription.status)) {
        try {
          await stripe.subscriptions.cancel(subscriptionId);
        } catch (stripeError) {
          let latest: Stripe.Subscription;
          try {
            latest = await stripe.subscriptions.retrieve(subscriptionId);
          } catch (retrieveError) {
            if (isMissingStripeResource(retrieveError)) {
              canceledSubscriptionIds.add(subscriptionId);
              return;
            }
            throw stripeError;
          }
          if (!isClosedSubscription(latest.status)) throw stripeError;
        }
      }

      canceledSubscriptionIds.add(subscriptionId);
    };

    for (const row of subscriptionsResult.data ?? []) {
      await cancelIfLive(row.stripe_subscription_id);
    }
    for (const customerId of customerIds) {
      await closeStripeCustomer(stripe, customerId, cancelIfLive, heartbeat);
    }
  } catch (stripeError) {
    if (stripeError instanceof AccountDeletionError) throw stripeError;
    console.error("account-deletion: failed to close billing", stripeError);
    throw new AccountDeletionError(
      502,
      "Failed to cancel billing before account deletion",
      "billing_close_failed",
    );
  }

  await advanceDeletionPhase(context, "billing_closing", "billing_closed");
}

async function confirmAuthUserAbsentAfterDeleteError(
  context: DeletionContext,
) {
  const { data, error } = await context.supabaseAdmin.auth.admin.getUserById(
    context.userId,
  );
  if (authLookupConfirmsAbsence(data, error)) return true;
  if (error) {
    throw new Error(
      `Failed to confirm auth deletion outcome: ${error.message}`,
    );
  }
  return false;
}

export async function runAccountDeletionWorkflow(context: DeletionContext) {
  if (
    context.job.phase === "requested" || context.job.phase === "billing_closing"
  ) {
    await closeBilling(context);
  }

  if (context.job.phase === "billing_closed") {
    try {
      await purgeDeletionBoundStorageObjects(
        context.supabaseAdmin,
        context.userId,
        () => renewDeletionLease(context),
      );
    } catch (storageError) {
      if (storageError instanceof AccountDeletionError) throw storageError;
      console.error(
        "account-deletion: failed to purge deletion-bound storage",
        storageError,
      );
      throw new AccountDeletionError(
        500,
        "Failed to remove account data",
        "storage_purge_failed",
      );
    }

    await advanceDeletionPhase(context, "billing_closed", "storage_purged");
  }

  if (context.job.phase === "storage_purged") {
    await advanceDeletionPhase(context, "storage_purged", "auth");
  }
  if (context.job.phase !== "auth") {
    throw new Error(`Unsupported account deletion phase: ${context.job.phase}`);
  }

  await renewDeletionLease(context);
  const { error: deleteError } = await context.supabaseAdmin.auth.admin
    .deleteUser(
      context.userId,
    );
  if (deleteError) {
    // A timeout can hide a successful GoTrue deletion. Verify the source of
    // truth: absence from getUserById means the operation succeeded and the
    // auth.users cascade already removed the durable job.
    if (await confirmAuthUserAbsentAfterDeleteError(context)) return;
    console.error("account-deletion: failed to delete auth user", deleteError);
    throw new AccountDeletionError(
      500,
      "Failed to delete account",
      "auth_delete_failed",
    );
  }
}

export function handleDeleteAccountRequest(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  let supabaseAdmin: SupabaseClient | null = null;

  const requireConfig = () => {
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase environment is not configured");
    }
    return { supabaseUrl, anonKey, serviceRoleKey };
  };
  const getAdminClient = () => {
    if (supabaseAdmin) return supabaseAdmin;
    const config = requireConfig();
    supabaseAdmin = createClient(config.supabaseUrl, config.serviceRoleKey);
    return supabaseAdmin;
  };
  const createAuthenticatedClient = (authorization: string) => {
    const config = requireConfig();
    return createClient(config.supabaseUrl, config.anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  };

  return handleAccountDeletionEnqueueRequest(req, {
    authenticate: async (authorization) => {
      const accessToken = authorization.replace(/^Bearer\s+/i, "");
      if (!accessToken || accessToken === authorization) {
        return { user: null, error: new Error("Malformed bearer token") };
      }
      const supabaseUser = createAuthenticatedClient(authorization);
      const { data: { user }, error } = await supabaseUser.auth.getUser(
        accessToken,
      );
      return { user, error };
    },
    jobExists: async (userId) => {
      const { data, error } = await getAdminClient()
        .from("account_deletion_jobs")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        throw new Error(
          `Failed to inspect account deletion job: ${error.message}`,
        );
      }
      return data !== null;
    },
    sessionIsRecentlyReauthenticated: async (authorization) => {
      const { data, error } = await createAuthenticatedClient(authorization)
        .rpc("account_deletion_session_is_recent");
      if (error) {
        throw new Error(
          `Failed to verify recent account reauthentication: ${error.message}`,
        );
      }
      return data === true;
    },
    enqueue: async (userId) => {
      const { data, error } = await getAdminClient()
        .rpc("request_account_deletion", { p_user_id: userId })
        .maybeSingle();
      if (error) {
        throw new Error(`Failed to request account deletion: ${error.message}`);
      }
      if (!data) throw new Error("Account deletion request returned no job");
    },
    revokeRefreshSessions: async (authorization) => {
      const config = requireConfig();
      const accessToken = authorization.replace(/^Bearer\s+/i, "");
      const supabaseAuth = createClient(config.supabaseUrl, config.anonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });
      const { error } = await supabaseAuth.auth.admin.signOut(
        accessToken,
        "global",
      );
      // A response-loss retry may arrive after the first global sign-out. In
      // that case Auth legitimately reports an absent/invalid session and the
      // desired idempotent postcondition has already been reached.
      if (
        error &&
        (error.status === undefined || ![401, 403, 404].includes(error.status))
      ) {
        throw new Error(`Failed to revoke account sessions: ${error.message}`);
      }
    },
    logError: (message, error) => console.error(message, error),
  });
}
