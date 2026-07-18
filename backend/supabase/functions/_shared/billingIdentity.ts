const MAX_USER_ID_LENGTH = 128;

/**
 * Bind every billing request to the identity captured with its bearer token.
 * This closes the account-switch race where a browser could otherwise combine
 * an operation selected by account A with a later account B session.
 */
export function billingRequestMatchesAuthenticatedUser(
  body: unknown,
  authenticatedUserId: string,
): boolean {
  if (!body || typeof body !== "object") return false;
  const expectedUserId = (body as { expected_user_id?: unknown })
    .expected_user_id;
  return typeof expectedUserId === "string" &&
    expectedUserId.length > 0 &&
    expectedUserId.length <= MAX_USER_ID_LENGTH &&
    expectedUserId === authenticatedUserId;
}
