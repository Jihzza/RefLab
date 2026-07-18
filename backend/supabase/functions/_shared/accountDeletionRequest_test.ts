import {
  type AccountDeletionRequestDependencies,
  handleAccountDeletionEnqueueRequest,
} from "./accountDeletionRequest.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function request(confirmation = "DELETE", expectedUserId = "user-id") {
  return new Request("https://example.test/delete-account", {
    method: "POST",
    headers: {
      "Authorization": "Bearer test-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      confirmation,
      expected_user_id: expectedUserId,
    }),
  });
}

function dependencies(
  overrides: Partial<AccountDeletionRequestDependencies> = {},
): AccountDeletionRequestDependencies {
  return {
    authenticate: () =>
      Promise.resolve({
        user: {
          id: "user-id",
        },
        error: null,
      }),
    jobExists: () => Promise.resolve(false),
    sessionIsRecentlyReauthenticated: () => Promise.resolve(true),
    enqueue: () => Promise.resolve(),
    revokeRefreshSessions: () => Promise.resolve(),
    ...overrides,
  };
}

Deno.test("server requires the exact confirmation literal and current-session reauthentication", async () => {
  let enqueueCount = 0;
  let revocationCount = 0;
  let sessionProofCount = 0;
  const guardedDependencies = {
    sessionIsRecentlyReauthenticated: () => {
      sessionProofCount += 1;
      return Promise.resolve(false);
    },
    enqueue: () => {
      enqueueCount += 1;
      return Promise.resolve();
    },
    revokeRefreshSessions: () => {
      revocationCount += 1;
      return Promise.resolve();
    },
  };
  const wrongConfirmation = await handleAccountDeletionEnqueueRequest(
    request("delete"),
    dependencies(guardedDependencies),
  );
  assert(wrongConfirmation.status === 400, "wrong literal was not rejected");
  assert(enqueueCount === 0, "wrong literal reached durable enqueue");
  assert(
    Number(sessionProofCount) === 0,
    "wrong literal inspected session proof",
  );

  const stale = await handleAccountDeletionEnqueueRequest(
    request(),
    dependencies(guardedDependencies),
  );
  assert(stale.status === 403, "stale authentication was not rejected");
  const staleBody = await stale.json();
  assert(
    staleBody.code === "reauthentication_required",
    "stale response omitted its machine-readable code",
  );
  assert(
    Number(sessionProofCount) === 1,
    "current session proof was not checked once",
  );
  assert(enqueueCount === 0, "stale authentication reached durable enqueue");
  assert(revocationCount === 0, "rejected request revoked active sessions");
});

Deno.test("server fails closed when the session-bound RPC is unavailable", async () => {
  let enqueueCount = 0;
  let revocationCount = 0;
  const response = await handleAccountDeletionEnqueueRequest(
    request(),
    dependencies({
      sessionIsRecentlyReauthenticated: () =>
        Promise.reject(new Error("RPC missing")),
      enqueue: () => {
        enqueueCount += 1;
        return Promise.resolve();
      },
      revokeRefreshSessions: () => {
        revocationCount += 1;
        return Promise.resolve();
      },
    }),
  );

  assert(response.status === 503, "missing session RPC did not fail closed");
  const body = await response.json();
  assert(
    body.code === "reauthentication_check_unavailable",
    "unavailable proof omitted its machine-readable code",
  );
  assert(enqueueCount === 0, "unavailable proof reached durable enqueue");
  assert(revocationCount === 0, "unavailable proof revoked active sessions");
});

Deno.test("server classifies unavailable Auth verification before enqueue", async () => {
  let jobLookupCount = 0;
  let enqueueCount = 0;
  let revocationCount = 0;
  const response = await handleAccountDeletionEnqueueRequest(
    request(),
    dependencies({
      authenticate: () => Promise.reject(new Error("Auth unavailable")),
      jobExists: () => {
        jobLookupCount += 1;
        return Promise.resolve(false);
      },
      enqueue: () => {
        enqueueCount += 1;
        return Promise.resolve();
      },
      revokeRefreshSessions: () => {
        revocationCount += 1;
        return Promise.resolve();
      },
    }),
  );

  assert(response.status === 503, "Auth outage did not fail closed");
  const body = await response.json();
  assert(
    body.code === "auth_verification_unavailable",
    "Auth outage omitted its pre-enqueue code",
  );
  assert(jobLookupCount === 0, "Auth outage inspected deletion status");
  assert(enqueueCount === 0, "Auth outage reached durable enqueue");
  assert(revocationCount === 0, "Auth outage revoked active sessions");
});

Deno.test("server separates unavailable deletion status from ambiguous enqueue", async () => {
  let sessionProofCount = 0;
  let enqueueCount = 0;
  let revocationCount = 0;
  const response = await handleAccountDeletionEnqueueRequest(
    request(),
    dependencies({
      jobExists: () => Promise.reject(new Error("status read unavailable")),
      sessionIsRecentlyReauthenticated: () => {
        sessionProofCount += 1;
        return Promise.resolve(true);
      },
      enqueue: () => {
        enqueueCount += 1;
        return Promise.resolve();
      },
      revokeRefreshSessions: () => {
        revocationCount += 1;
        return Promise.resolve();
      },
    }),
  );

  assert(response.status === 503, "status outage did not fail closed");
  const body = await response.json();
  assert(
    body.code === "deletion_status_check_unavailable",
    "status outage was misclassified as an ambiguous enqueue",
  );
  assert(sessionProofCount === 0, "status outage inspected session proof");
  assert(enqueueCount === 0, "status outage reached durable enqueue");
  assert(revocationCount === 0, "status outage revoked active sessions");
});

Deno.test("server binds deletion to the explicitly expected authenticated account", async () => {
  let jobLookupCount = 0;
  let enqueueCount = 0;
  let revocationCount = 0;
  const response = await handleAccountDeletionEnqueueRequest(
    request("DELETE", "account-a"),
    dependencies({
      jobExists: () => {
        jobLookupCount += 1;
        return Promise.resolve(false);
      },
      enqueue: () => {
        enqueueCount += 1;
        return Promise.resolve();
      },
      revokeRefreshSessions: () => {
        revocationCount += 1;
        return Promise.resolve();
      },
    }),
  );

  assert(response.status === 403, "mismatched account was not rejected");
  const body = await response.json();
  assert(
    body.code === "account_identity_mismatch",
    "identity rejection omitted its machine-readable code",
  );
  assert(jobLookupCount === 0, "identity mismatch inspected deletion jobs");
  assert(enqueueCount === 0, "identity mismatch reached durable enqueue");
  assert(revocationCount === 0, "identity mismatch revoked another session");
});

Deno.test("delete endpoint enqueues only worker work and revokes refresh sessions", async () => {
  let enqueueCount = 0;
  let revocationCount = 0;
  const response = await handleAccountDeletionEnqueueRequest(
    request(),
    dependencies({
      enqueue: () => {
        enqueueCount += 1;
        return Promise.resolve();
      },
      revokeRefreshSessions: () => {
        revocationCount += 1;
        return Promise.resolve();
      },
    }),
  );
  assert(response.status === 202, "new deletion request was not accepted");
  assert(enqueueCount === 1, "request did not enqueue exactly one worker job");
  assert(revocationCount === 1, "refresh sessions were not revoked once");
  const body = await response.json();
  assert(body.accepted === true, "accepted response omitted durable state");
  assert(
    body.already_requested === false,
    "new request was incorrectly classified as a retry",
  );
});

Deno.test("response loss retries acknowledge the durable job without a second enqueue", async () => {
  let durableJobExists = false;
  let enqueueCount = 0;
  let revocationCount = 0;
  let sessionProofCount = 0;
  const deps = dependencies({
    jobExists: () => Promise.resolve(durableJobExists),
    sessionIsRecentlyReauthenticated: () => {
      sessionProofCount += 1;
      return Promise.resolve(true);
    },
    enqueue: () => {
      enqueueCount += 1;
      durableJobExists = true;
      return Promise.reject(
        new Error("database response was lost after commit"),
      );
    },
    revokeRefreshSessions: () => {
      revocationCount += 1;
      return Promise.resolve();
    },
  });

  const ambiguous = await handleAccountDeletionEnqueueRequest(request(), deps);
  assert(
    ambiguous.status === 503,
    "lost response was not treated as ambiguous",
  );
  const ambiguousBody = await ambiguous.json();
  assert(
    ambiguousBody.code === "deletion_enqueue_ambiguous",
    "ambiguous response omitted its machine-readable code",
  );

  const retry = await handleAccountDeletionEnqueueRequest(request(), deps);
  assert(retry.status === 202, "durable response-loss retry was not accepted");
  const retryBody = await retry.json();
  assert(
    retryBody.already_requested === true,
    "retry did not report the existing durable request",
  );
  assert(enqueueCount === 1, "retry attempted to enqueue a second job");
  assert(
    sessionProofCount === 1,
    "durable retry unnecessarily required another session proof",
  );
  assert(revocationCount === 1, "retry did not revoke refresh sessions once");
});

Deno.test("a pre-commit transport failure is retried instead of being reported as accepted", async () => {
  let durableJobExists = false;
  let enqueueCount = 0;
  const deps = dependencies({
    jobExists: () => Promise.resolve(durableJobExists),
    enqueue: () => {
      enqueueCount += 1;
      if (enqueueCount === 1) {
        return Promise.reject(
          new Error("database request failed before commit"),
        );
      }
      durableJobExists = true;
      return Promise.resolve();
    },
  });

  const firstAttempt = await handleAccountDeletionEnqueueRequest(
    request(),
    deps,
  );
  assert(
    firstAttempt.status === 503,
    "pre-commit failure was incorrectly reported as accepted",
  );
  assert(!durableJobExists, "pre-commit failure unexpectedly created a job");

  const retry = await handleAccountDeletionEnqueueRequest(request(), deps);
  assert(retry.status === 202, "safe retry was not accepted");
  const retryBody = await retry.json();
  assert(
    retryBody.already_requested === false,
    "pre-commit retry was incorrectly classified as an existing job",
  );
  assert(enqueueCount === 2, "pre-commit failure did not retry the enqueue");
});

Deno.test("a durable job survives ambiguous session revocation and retries idempotently", async () => {
  let durableJobExists = false;
  let enqueueCount = 0;
  let revocationCount = 0;
  const deps = dependencies({
    jobExists: () => Promise.resolve(durableJobExists),
    enqueue: () => {
      enqueueCount += 1;
      durableJobExists = true;
      return Promise.resolve();
    },
    revokeRefreshSessions: () => {
      revocationCount += 1;
      return revocationCount === 1
        ? Promise.reject(new Error("Auth response was lost"))
        : Promise.resolve();
    },
  });

  const ambiguous = await handleAccountDeletionEnqueueRequest(request(), deps);
  assert(ambiguous.status === 503, "revocation loss was not ambiguous");
  const ambiguousBody = await ambiguous.json();
  assert(
    ambiguousBody.code === "deletion_session_revocation_ambiguous",
    "revocation ambiguity omitted its machine-readable code",
  );
  assert(durableJobExists, "revocation failure discarded the durable job");

  const retry = await handleAccountDeletionEnqueueRequest(request(), deps);
  assert(retry.status === 202, "revocation retry was not accepted");
  const retryBody = await retry.json();
  assert(
    retryBody.already_requested === true,
    "revocation retry did not reuse its durable job",
  );
  assert(enqueueCount === 1, "revocation retry enqueued duplicate work");
  assert(revocationCount === 2, "revocation was not retried exactly once");
});
