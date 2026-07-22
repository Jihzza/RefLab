import { describe, expect, it } from "vitest";
import { mapAuthError } from "./authErrors";

describe("delete-account error mapping", () => {
  it("turns the recent-login requirement into an actionable Portuguese message", () => {
    const result = mapAuthError(
      new Error("REAUTHENTICATION_REQUIRED: Please sign in again before deleting your account."),
      "delete-account",
    );

    expect(result.message).toContain("15 minutos");
    expect(result.message).toContain("volta a iniciar sessão");
  });

  it("explains when another deletion request already owns the operation", () => {
    const result = mapAuthError(
      new Error("ACCOUNT_DELETION_ALREADY_IN_PROGRESS: request already running"),
      "delete-account",
    );

    expect(result.message).toContain("já está em curso");
    expect(result.message).toContain("tenta novamente");
  });
});
