import { workerAuthorizationStatus } from "./index.ts";

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

Deno.test("scheduled deletion worker fails closed without its dedicated secret", async () => {
  assertEquals(
    await workerAuthorizationStatus(undefined, "candidate"),
    503,
    "missing server secret must disable the worker",
  );
  assertEquals(
    await workerAuthorizationStatus("too-short", "too-short"),
    503,
    "weak configured secrets must disable the worker",
  );
});

Deno.test("scheduled deletion worker rejects missing and incorrect credentials", async () => {
  assertEquals(
    await workerAuthorizationStatus(
      "configured-secret-at-least-32-characters",
      null,
    ),
    401,
    "missing request secret must be unauthorized",
  );
  assertEquals(
    await workerAuthorizationStatus(
      "configured-secret-at-least-32-characters",
      "incorrect-secret-at-least-32-characters",
    ),
    401,
    "incorrect request secret must be unauthorized",
  );
});

Deno.test("scheduled deletion worker accepts only the exact dedicated secret", async () => {
  assertEquals(
    await workerAuthorizationStatus(
      "configured-secret-at-least-32-characters",
      "configured-secret-at-least-32-characters",
    ),
    200,
    "matching request secret must be authorized",
  );
});
