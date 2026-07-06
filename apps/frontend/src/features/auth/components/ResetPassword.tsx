import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { mapAuthError } from "../api/authErrors";
import { useTranslation } from "react-i18next";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

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
  const { updatePassword, user, recoveryMode } = useAuth();

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
  useEffect(() => {
    // If the exchange succeeded, clear any prior error
    if (user || recoveryMode) {
      setError("");
      return;
    }

    // Give Supabase time to exchange the code and fire the recovery event
    const timer = setTimeout(() => {
      if (!user && !recoveryMode) {
        setError(
          t("Invalid or expired reset link. Please request a new password reset.")
        );
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [user, recoveryMode]);

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

      // Success!
      setSuccess(true);
      setLoading(false);

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate("/app/dashboard", { replace: true });
      }, 2000);
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
      <div className="min-h-screen flex items-center justify-center px-4 bg-(--bg-primary)">
        <div className="w-full max-w-md text-center">
          <div className="p-4 rounded-(--radius-card) bg-(--success)/10 border border-(--success)/20 text-(--success)">
            <h2 className="text-lg font-semibold mb-2">{t("Password updated!")}</h2>
            <p>{t("Redirecting you to the dashboard...")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-(--bg-primary)">
      <div className="w-full max-w-md card-console p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-(--text-primary)">{t("Set new password")}</h1>
          <p className="mt-2 text-(--text-secondary)">
            {t("Enter your new password below.")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="p-3 rounded-(--radius-input) bg-(--error)/10 border border-(--error)/20 text-(--error) text-sm text-center">
              {error}
            </div>
          )}

          {/* New password field */}
          <Input
            id="new-password"
            type="password"
            label={t("New Password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || !user}
            placeholder="••••••••"
            autoComplete="new-password"
            hint={t("Minimum 6 characters")}
          />

          {/* Confirm password field */}
          <Input
            id="confirm-new-password"
            type="password"
            label={t("Confirm New Password")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading || !user}
            placeholder="••••••••"
            autoComplete="new-password"
          />

          {/* Submit button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={loading || !user}
          >
            {loading ? t("Updating...") : t("Update password")}
          </Button>

          {/* Back to login link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-sm font-medium text-(--brand-yellow) hover:text-(--brand-yellow-soft) hover:underline"
            >
              {t("Back to login")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
