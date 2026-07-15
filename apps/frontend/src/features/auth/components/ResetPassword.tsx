import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { mapAuthError } from "../api/authErrors";
import { useTranslation } from "react-i18next";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { Button, Input } from "@/components/ui";
import PublicAuthFrame from "@/features/landing/components/PublicAuthFrame";

/**
 * ResetPassword - Page for setting a new password after clicking reset link
 *
 * Flow:
 * 1. User clicks reset link in email
 * 2. Link redirects to: /reset-password?code=xxx (PKCE flow)
 * 3. Supabase client automatically exchanges the code (detectSessionInUrl: true)
 * 4. PASSWORD_RECOVERY event fires, setting recoveryMode=true in AuthProvider
 * 5. User is temporarily authenticated and can set a new password
 * 6. After setting password, redirect to dashboard
 *
 * Important: This page should only be accessible via the email reset link.
 */
export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updatePassword, user, recoveryMode, clearRecoveryMode } = useAuth();

  // Form state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Check if user arrived via a valid reset link.
  // With PKCE, detectSessionInUrl exchanges the code automatically and the
  // PASSWORD_RECOVERY event sets recoveryMode=true in AuthProvider.
  const canResetPassword = Boolean(user && recoveryMode);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (user && recoveryMode) {
        setError("");
      } else {
        setError(
          t("Invalid or expired reset link. Please request a new password reset.")
        );
      }
    }, user && recoveryMode ? 0 : 5000);

    return () => window.clearTimeout(timer);
  }, [recoveryMode, t, user]);

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => {
      navigate("/app/dashboard", { replace: true });
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [navigate, success])

  const validateForm = (): boolean => {
    if (!password) {
      setError(t("Password is required"));
      return false;
    }

    if (password.length < 6) {
      setError(t("Password must be at least 6 characters"));
      return false;
    }

    if (password !== confirmPassword) {
      setError(t("Passwords do not match"));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!canResetPassword) {
      setError(t("Invalid or expired reset link. Please request a new password reset."));
      return;
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      const { error: updateError } = await updatePassword(password);

      if (updateError) {
        const mapped = mapAuthError(updateError, 'update-password');
        setError(mapped.message);
        setLoading(false);
        return;
      }

      clearRecoveryMode();
      setSuccess(true);
      setLoading(false);
    } catch (err) {
      const mapped = mapAuthError(
        err instanceof Error ? err : new Error('Failed to update password'),
        'update-password'
      );
      setError(mapped.message);
      setLoading(false);
    }
  };

  // Show success message and redirect
  if (success) {
    return (
      <PublicAuthFrame compact>
        <div className="p-6 text-center sm:p-8" role="status">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full border border-(--mc-color-success)/40 bg-(--mc-color-success)/10 text-(--mc-color-success)">
            <CheckCircle2 className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.025em] text-(--mc-color-text)">
            {t("Password updated!")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-(--mc-color-text-secondary)">
            {t("Redirecting you to the dashboard...")}
          </p>
        </div>
      </PublicAuthFrame>
    );
  }

  return (
    <PublicAuthFrame compact>
      <div className="p-5 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-[-0.025em] text-(--mc-color-text)">
            {t("Set new password")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-(--mc-color-text-secondary)">
            {t("Enter your new password below.")}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {!canResetPassword && !error && (
            <div role="status" className="flex items-center gap-2 rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas)/55 px-3 py-2.5 text-sm text-(--mc-color-text-secondary)">
              <LoaderCircle className="size-4 animate-spin text-(--mc-color-accent) motion-reduce:animate-none" aria-hidden="true" />
              <span>{t("Loading...")}</span>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-(--mc-radius-input) border border-(--mc-color-danger)/45 bg-(--mc-color-danger)/10 px-3 py-2.5 text-sm leading-5 text-(--mc-color-danger)">
              {error}
            </div>
          )}

          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading || !canResetPassword}
            label={t("New Password")}
            placeholder="••••••••"
            hint={t("Minimum 6 characters")}
          />

          <Input
            id="confirm-new-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={loading || !canResetPassword}
            label={t("Confirm New Password")}
            placeholder="••••••••"
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={loading}
            loadingText={t("Updating...")}
            disabled={!canResetPassword}
          >
            {t("Update password")}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate("/")}
              disabled={loading}
              className="mc-focus-ring min-h-10 rounded-lg px-2 text-sm font-semibold text-(--mc-color-accent) hover:text-(--mc-color-accent-soft) disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("Back to login")}
            </button>
          </div>
        </form>
      </div>
    </PublicAuthFrame>
  );
}
