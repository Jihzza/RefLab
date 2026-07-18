import { billingRequestMatchesAuthenticatedUser } from "./billingIdentity.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("billing identity requires the captured authenticated owner", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  assert(
    billingRequestMatchesAuthenticatedUser(
      { expected_user_id: userId },
      userId,
    ),
    "matching expected user should be accepted",
  );
  assert(
    !billingRequestMatchesAuthenticatedUser({}, userId),
    "missing expected user must fail closed",
  );
  assert(
    !billingRequestMatchesAuthenticatedUser(
      { expected_user_id: "22222222-2222-4222-8222-222222222222" },
      userId,
    ),
    "a different expected user must be rejected",
  );
});

Deno.test("billing identity rejects malformed request bodies", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  for (const body of [
    null,
    [],
    { expected_user_id: null },
    { expected_user_id: "" },
    { expected_user_id: "x".repeat(129) },
  ]) {
    assert(
      !billingRequestMatchesAuthenticatedUser(body, userId),
      "malformed expected user must fail closed",
    );
  }
});
