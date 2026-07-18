export const ACCOUNT_DELETION_PHASES = [
  "requested",
  "billing_closing",
  "billing_closed",
  "storage_purged",
  "auth",
] as const;

export type AccountDeletionPhase = typeof ACCOUNT_DELETION_PHASES[number];

export type AccountDeletionJob = {
  user_id: string;
  phase: AccountDeletionPhase;
  lease_id: string;
  lease_expires_at: string;
  attempt_count: number;
};

export function isAccountDeletionPhase(
  value: unknown,
): value is AccountDeletionPhase {
  return typeof value === "string" &&
    ACCOUNT_DELETION_PHASES.includes(value as AccountDeletionPhase);
}

export function nextAccountDeletionPhase(
  phase: AccountDeletionPhase,
): AccountDeletionPhase | null {
  switch (phase) {
    case "requested":
      return "billing_closing";
    case "billing_closing":
      return "billing_closed";
    case "billing_closed":
      return "storage_purged";
    case "storage_purged":
      return "auth";
    case "auth":
      return null;
  }
}

export function deletionLeaseIsClaimable(
  leaseId: string | null,
  leaseExpiresAt: string | null,
  nowMs: number,
) {
  if (leaseId === null && leaseExpiresAt === null) return true;
  if (leaseId === null || leaseExpiresAt === null) return false;
  const expiryMs = Date.parse(leaseExpiresAt);
  return Number.isFinite(expiryMs) && expiryMs <= nowMs;
}

export function authLookupConfirmsAbsence(
  data: { user?: unknown | null } | null,
  error: unknown,
) {
  if (error && typeof error === "object") {
    const candidate = error as { status?: number; code?: string };
    return candidate.status === 404 || candidate.code === "user_not_found";
  }
  return !error && !data?.user;
}

export function chunkForBoundedConcurrency<T>(
  values: readonly T[],
  batchSize: number,
) {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("batch size must be a positive integer");
  }
  const batches: T[][] = [];
  for (let index = 0; index < values.length; index += batchSize) {
    batches.push(values.slice(index, index + batchSize));
  }
  return batches;
}

export type DeletionConversationRow = {
  id: string;
  user_a_id: string | null;
  user_b_id: string | null;
};

export type DeletionMessageMediaRow = {
  conversation_id: string;
  sender_id: string;
  media_url: string | null;
};

export type MessageMediaDeletionPlan = {
  /** Current-format orphan sweep remains scoped to this deleting owner. */
  ownerConversationIds: string[];
  /** These conversations disappear when the deleting profile is removed. */
  doomedConversationIds: string[];
  /** Exact referenced paths safe to remove even outside a conversation prefix. */
  referencedPaths: string[];
};

export function storageObjectParentPrefixes(paths: readonly string[]) {
  const prefixes = new Set<string>();
  for (const path of paths) {
    const separatorIndex = path.lastIndexOf("/");
    if (separatorIndex > 0) prefixes.add(path.slice(0, separatorIndex));
  }
  return [...prefixes].sort();
}

/**
 * Database references are a manifest, not proof that an object still exists.
 * Intersecting them with a fresh Storage listing keeps retries idempotent: an
 * object removed by a prior sweep must not keep the worker permanently stuck.
 */
export function retainExistingStorageObjectPaths(
  referencedPaths: readonly string[],
  discoveredPaths: readonly string[],
) {
  const references = new Set(referencedPaths);
  return [...new Set(discoveredPaths.filter((path) => references.has(path)))]
    .sort();
}

function isSafeStorageObjectPath(value: string) {
  if (
    !value || value.length > 1024 || value.startsWith("/") ||
    value.includes("\\") || /^[a-z][a-z\d+.-]*:/i.test(value)
  ) {
    return false;
  }
  const segments = value.split("/");
  return segments.every((segment) =>
    segment.length > 0 && segment !== "." && segment !== ".."
  );
}

function normalizeMessageMediaObjectPath(
  value: string,
  supabaseOrigin: string | null,
) {
  if (!/^[a-z][a-z\d+.-]*:/i.test(value)) {
    return isSafeStorageObjectPath(value) ? value : null;
  }
  if (!supabaseOrigin) return null;

  try {
    const expectedOrigin = new URL(supabaseOrigin).origin;
    const parsed = new URL(value);
    if (
      parsed.origin !== expectedOrigin || parsed.username || parsed.password
    ) {
      return null;
    }

    const prefixes = [
      "/storage/v1/object/public/message-media/",
      "/storage/v1/object/authenticated/message-media/",
      "/storage/v1/object/sign/message-media/",
    ];
    const prefix = prefixes.find((candidate) =>
      parsed.pathname.startsWith(candidate)
    );
    if (!prefix) return null;
    const path = decodeURIComponent(parsed.pathname.slice(prefix.length));
    return isSafeStorageObjectPath(path) ? path : null;
  } catch {
    return null;
  }
}

/**
 * Build the message-media manifest before Auth/profile cascades remove its DB
 * references. With the launch schema, a two-endpoint conversation survives as
 * a tombstone; a conversation is doomed only when its other endpoint is
 * already null. Never sweep the surviving participant's general owner prefix.
 */
export function buildMessageMediaDeletionPlan(
  userId: string,
  conversations: readonly DeletionConversationRow[],
  messages: readonly DeletionMessageMediaRow[],
  supabaseOrigin: string | null = null,
): MessageMediaDeletionPlan {
  const ownerConversationIds = new Set<string>();
  const doomedConversationIds = new Set<string>();

  for (const conversation of conversations) {
    const deletingUserIsA = conversation.user_a_id === userId;
    const deletingUserIsB = conversation.user_b_id === userId;
    if (!deletingUserIsA && !deletingUserIsB) continue;

    ownerConversationIds.add(conversation.id);
    const otherEndpoint = deletingUserIsA
      ? conversation.user_b_id
      : conversation.user_a_id;
    if (otherEndpoint === null) doomedConversationIds.add(conversation.id);
  }

  const referencedPaths = new Set<string>();
  for (const message of messages) {
    const deletingOwner = message.sender_id === userId;
    const doomedConversation = doomedConversationIds.has(
      message.conversation_id,
    );
    if (!deletingOwner && !doomedConversation) continue;
    if (deletingOwner) ownerConversationIds.add(message.conversation_id);

    const storedValue = message.media_url;
    if (!storedValue) continue;
    const path = normalizeMessageMediaObjectPath(
      storedValue,
      supabaseOrigin,
    );
    if (!path) continue;

    const currentOwnerPrefix =
      `${message.conversation_id}/${message.sender_id}/`;
    const legacyOwnerPrefix = `${message.sender_id}/`;
    if (
      path.startsWith(currentOwnerPrefix) ||
      path.startsWith(legacyOwnerPrefix)
    ) {
      referencedPaths.add(path);
    }
  }

  return {
    ownerConversationIds: [...ownerConversationIds].sort(),
    doomedConversationIds: [...doomedConversationIds].sort(),
    referencedPaths: [...referencedPaths].sort(),
  };
}

export function buildBillingCustomerCreateParams(
  userId: string,
  intentId: string,
  customerEmail: string | null,
) {
  return {
    metadata: {
      supabase_user_id: userId,
      provisioning_intent_id: intentId,
    },
    ...(customerEmail ? { email: customerEmail } : {}),
  };
}
