import { useState } from "react";
import { useAuth } from "./useAuth";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { mapAuthError } from "../api/authErrors";

interface ForgotPasswordProps {
  onBackToLogin: () => void;
  onPendingChange?: (pending: boolean) => void;
}

/**
 * ForgotPassword - Form to request a password reset email
 *
 * Flow:
 * 1. User enters their email
 * 2. We call Supabase resetPassword
 * 3. Supabase sends an email with a reset link
 * 4. User clicks link → goes to /reset-password page (Step 2.5)
 */
export default function ForgotPassword({ onBackToLogin, onPendingChange }: ForgotPasswordProps) {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();

  // Form state
  const [email, setEmail] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const setRequestPending = (pending: boolean) => {
    setLoading(pending);
    onPendingChange?.(pending);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous state
    setError("");
    setSuccessMessage("");

    // Basic validation
    if (!email) {
      setError(t("Email is required"));
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t("Please enter a valid email"));
      return;
    }

    setRequestPending(true);

    try {
      const { error: resetError } = await resetPassword(email);

      if (resetError) {
        setError(mapAuthError(resetError, 'reset').message);
        setRequestPending(false);
        return;
      }

      // Supabase does not reveal whether an email exists.
      setSuccessMessage(
        t("If an account exists with this email, you will receive a password reset link.")
      );
      setRequestPending(false);
    } catch (caughtError) {
      setError(mapAuthError(
        caughtError instanceof Error ? caughtError : new Error('Password reset failed'),
        'reset',
      ).message);
      setRequestPending(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBackToLogin}
        disabled={loading}
        className="mc-focus-ring -ml-2 mb-5 inline-flex min-h-10 items-center gap-2 rounded-(--mc-radius-button) px-2 text-sm font-semibold text-(--mc-color-accent) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-accent-soft) disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("Back to login")}
      </button>

      <h2 className="text-2xl font-extrabold tracking-[-0.025em] text-(--mc-color-text)">
        {t("Reset your password")}
      </h2>
      <p className="mb-6 mt-2 text-sm leading-6 text-(--mc-color-text-secondary)">
        {t("Enter your email address and we'll send you a link to reset your password.")}
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {successMessage && (
          <div role="status" className="rounded-(--mc-radius-input) border border-(--mc-color-success)/40 bg-(--mc-color-success)/10 px-3 py-2.5 text-sm leading-5 text-(--mc-color-success)">
            {successMessage}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-(--mc-radius-input) border border-(--mc-color-danger)/45 bg-(--mc-color-danger)/10 px-3 py-2.5 text-sm leading-5 text-(--mc-color-danger)">
            {error}
          </div>
        )}

        <Input
          id="forgot-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading}
          label={t("Email")}
          placeholder="tu@exemplo.com"
        />

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          loadingText={t("Sending...")}
        >
          {t("Send reset link")}
        </Button>
      </form>
    </div>
  );
}
