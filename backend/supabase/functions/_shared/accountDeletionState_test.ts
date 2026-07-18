import {
  ACCOUNT_DELETION_PHASES,
  type AccountDeletionPhase,
  authLookupConfirmsAbsence,
  buildBillingCustomerCreateParams,
  buildMessageMediaDeletionPlan,
  chunkForBoundedConcurrency,
  deletionLeaseIsClaimable,
  isAccountDeletionPhase,
  nextAccountDeletionPhase,
  retainExistingStorageObjectPaths,
  storageObjectParentPrefixes,
} from "./accountDeletionState.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("account deletion phases are exhaustive and monotonic", () => {
  const visited: string[] = [];
  let phase: AccountDeletionPhase = ACCOUNT_DELETION_PHASES[0];

  while (true) {
    visited.push(phase);
    const next = nextAccountDeletionPhase(phase);
    if (!next) break;
    phase = next;
  }

  assert(
    JSON.stringify(visited) === JSON.stringify(ACCOUNT_DELETION_PHASES),
    "the state machine must visit every phase exactly once",
  );
});

Deno.test("released jobs remain autonomously claimable in every phase", () => {
  for (const phase of ACCOUNT_DELETION_PHASES) {
    assert(
      deletionLeaseIsClaimable(null, null, Date.now()),
      `released ${phase} job was not claimable`,
    );
  }
});

Deno.test("process-kill takeover is allowed after expiry in every phase", () => {
  const now = Date.parse("2026-07-18T12:00:00.000Z");
  for (const phase of ACCOUNT_DELETION_PHASES) {
    assert(
      deletionLeaseIsClaimable(
        `killed-worker-${phase}`,
        "2026-07-18T11:59:59.000Z",
        now,
      ),
      `expired ${phase} lease was not claimable`,
    );
    assert(
      !deletionLeaseIsClaimable(
        `active-worker-${phase}`,
        "2026-07-18T12:00:01.000Z",
        now,
      ),
      `active ${phase} lease was stolen`,
    );
  }
});

Deno.test("corrupt half-leases fail closed", () => {
  const now = Date.now();
  assert(
    !deletionLeaseIsClaimable("lease", null, now),
    "missing expiry was accepted",
  );
  assert(
    !deletionLeaseIsClaimable(null, new Date(now).toISOString(), now),
    "missing lease id was accepted",
  );
  assert(
    !deletionLeaseIsClaimable("lease", "invalid", now),
    "invalid expiry was accepted",
  );
});

Deno.test("ambiguous auth deletion succeeds only when lookup confirms absence", () => {
  assert(
    authLookupConfirmsAbsence({ user: null }, null),
    "empty successful lookup did not confirm absence",
  );
  assert(
    authLookupConfirmsAbsence(null, { status: 404 }),
    "404 lookup did not confirm absence",
  );
  assert(
    authLookupConfirmsAbsence(null, { code: "user_not_found" }),
    "user_not_found lookup did not confirm absence",
  );
  assert(
    !authLookupConfirmsAbsence({ user: { id: "still-present" } }, null),
    "existing auth user was treated as absent",
  );
  assert(
    !authLookupConfirmsAbsence(null, { status: 503 }),
    "ambiguous lookup outage was treated as absence",
  );
});

Deno.test("storage discovery batches preserve order and cap fan-out", () => {
  const conversations = Array.from(
    { length: 37 },
    (_, index) => `conversation-${index}`,
  );
  const batches = chunkForBoundedConcurrency(conversations, 10);
  assert(batches.length === 4, "unexpected conversation batch count");
  assert(
    batches.every((batch) => batch.length <= 10),
    "conversation batch exceeded cap",
  );
  assert(
    JSON.stringify(batches.flat()) === JSON.stringify(conversations),
    "conversation batching lost or reordered work",
  );
});

Deno.test("DM media plan purges both senders only when the conversation is doomed", () => {
  const deletingUser = "10000000-0000-4000-8000-000000000001";
  const survivor = "20000000-0000-4000-8000-000000000002";
  const previouslyDeleted = "30000000-0000-4000-8000-000000000003";
  const plan = buildMessageMediaDeletionPlan(
    deletingUser,
    [
      {
        id: "active-conversation",
        user_a_id: deletingUser,
        user_b_id: survivor,
      },
      {
        id: "doomed-conversation",
        user_a_id: deletingUser,
        user_b_id: null,
      },
      {
        id: "unrelated-conversation",
        user_a_id: survivor,
        user_b_id: previouslyDeleted,
      },
    ],
    [
      {
        conversation_id: "active-conversation",
        sender_id: deletingUser,
        media_url: `active-conversation/${deletingUser}/owned.webp`,
      },
      {
        conversation_id: "active-conversation",
        sender_id: survivor,
        media_url: `active-conversation/${survivor}/must-survive.webp`,
      },
      {
        conversation_id: "doomed-conversation",
        sender_id: deletingUser,
        media_url: `doomed-conversation/${deletingUser}/owned.webp`,
      },
      {
        conversation_id: "doomed-conversation",
        sender_id: previouslyDeleted,
        media_url: `doomed-conversation/${previouslyDeleted}/counterpart.webp`,
      },
      {
        conversation_id: "doomed-conversation",
        sender_id: previouslyDeleted,
        media_url: `${previouslyDeleted}/legacy-counterpart.webp`,
      },
      {
        conversation_id: "doomed-conversation",
        sender_id: previouslyDeleted,
        media_url:
          `https://project.supabase.co/storage/v1/object/public/message-media/doomed-conversation/${previouslyDeleted}/absolute.webp?legacy=1`,
      },
      {
        conversation_id: "doomed-conversation",
        sender_id: previouslyDeleted,
        media_url: "https://tracker.example/not-storage.webp",
      },
      {
        conversation_id: "doomed-conversation",
        sender_id: previouslyDeleted,
        media_url:
          `https://project.supabase.co.evil.example/storage/v1/object/public/message-media/doomed-conversation/${previouslyDeleted}/evil.webp`,
      },
      {
        conversation_id: "unrelated-conversation",
        sender_id: survivor,
        media_url: `unrelated-conversation/${survivor}/unrelated.webp`,
      },
    ],
    "https://project.supabase.co",
  );

  assert(
    JSON.stringify(plan.doomedConversationIds) ===
      JSON.stringify(["doomed-conversation"]),
    "active survivor conversation was incorrectly classified as doomed",
  );
  assert(
    plan.referencedPaths.includes(
      `active-conversation/${deletingUser}/owned.webp`,
    ),
    "deleting sender media was omitted from an active conversation",
  );
  assert(
    !plan.referencedPaths.includes(
      `active-conversation/${survivor}/must-survive.webp`,
    ),
    "survivor media was deleted from an active conversation",
  );
  assert(
    plan.referencedPaths.includes(
      `doomed-conversation/${previouslyDeleted}/counterpart.webp`,
    ),
    "current-format counterpart media was omitted from a doomed conversation",
  );
  assert(
    plan.referencedPaths.includes(
      `${previouslyDeleted}/legacy-counterpart.webp`,
    ),
    "counterpart media was omitted from a doomed conversation",
  );
  assert(
    plan.referencedPaths.includes(
      `doomed-conversation/${previouslyDeleted}/absolute.webp`,
    ),
    "verified first-party absolute URL was not normalized to its object path",
  );
  assert(
    !plan.referencedPaths.some((path) =>
      path.includes("not-storage") || path.includes("evil.webp")
    ),
    "external or look-alike URL was treated as a Storage object path",
  );
  assert(
    !plan.referencedPaths.some((path) => path.includes("unrelated.webp")),
    "unrelated conversation media entered the deletion manifest",
  );
});

Deno.test("DM media retries retain only referenced objects that still exist", () => {
  const removedReference = "conversation/sender/removed.webp";
  const existingReference = "conversation/sender/existing.webp";
  const legacyReference = "sender/legacy.webp";

  assert(
    JSON.stringify(
      storageObjectParentPrefixes([
        removedReference,
        existingReference,
        legacyReference,
      ]),
    ) === JSON.stringify(["conversation/sender", "sender"]),
    "referenced paths were not grouped into bounded Storage listings",
  );
  assert(
    JSON.stringify(
      retainExistingStorageObjectPaths(
        [removedReference, existingReference, legacyReference],
        [existingReference, "conversation/sender/unreferenced.webp"],
      ),
    ) === JSON.stringify([existingReference]),
    "removed or unreferenced media survived the fresh Storage intersection",
  );
  assert(
    retainExistingStorageObjectPaths(
      [removedReference, existingReference],
      [],
    ).length === 0,
    "a removed DB reference would keep a retry permanently stuck",
  );
});

Deno.test("durable intent builds the exact Stripe customer parameters", () => {
  const withEmail = buildBillingCustomerCreateParams(
    "user-id",
    "intent-id",
    "stored@example.test",
  );
  assert(
    withEmail.email === "stored@example.test",
    "stored email was not replayed",
  );
  assert(
    withEmail.metadata.supabase_user_id === "user-id",
    "user metadata drifted",
  );
  assert(
    withEmail.metadata.provisioning_intent_id === "intent-id",
    "intent metadata drifted",
  );

  const withoutEmail = buildBillingCustomerCreateParams(
    "user-id",
    "intent-id",
    null,
  );
  assert(!("email" in withoutEmail), "null email must be omitted, not changed");
});

Deno.test("untrusted phase values fail closed", () => {
  assert(isAccountDeletionPhase("billing_closed"), "known phase was rejected");
  assert(!isAccountDeletionPhase("complete"), "unknown phase was accepted");
  assert(!isAccountDeletionPhase(null), "non-string phase was accepted");
});
