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

describe("password policy error mapping", () => {
  it("does not expose the raw Supabase weak-password error during signup", () => {
    const result = mapAuthError(
      new Error("Weak password: Password should be at least 10 characters."),
      "signup",
    );

    expect(result.field).toBe("password");
    expect(result.message).toContain("10 caracteres");
    expect(result.message).toContain("uma letra e um número");
  });

  it("uses the same policy message during password recovery", () => {
    const result = mapAuthError(
      new Error("Password must be at least 10 characters"),
      "update-password",
    );

    expect(result.message).toContain("10 caracteres");
  });
});
