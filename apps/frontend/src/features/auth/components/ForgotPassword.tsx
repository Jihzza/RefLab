import { useState } from "react";
import { useAuth } from "./useAuth";
import { useTranslation } from "react-i18next";

interface ForgotPasswordProps {
  onBackToLogin: () => void;
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
export default function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();

  // Form state
  const [email, setEmail] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

    setLoading(true);

    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    // Success - show message
    // Note: Supabase doesn't reveal if email exists for security reasons
    setSuccessMessage(
      t("If an account exists with this email, you will receive a password reset link.")
    );
    setLoading(false);
  };

  return (
    <div>
      {/* Back to login link */}
      <button
        type="button"
        onClick={onBackToLogin}
        className="mb-4 text-sm text-(--brand-yellow) hover:text-(--brand-yellow-soft) hover:underline flex items-center gap-1"
      >
        <span>&larr;</span> {t("Back to login")}
      </button>

      <h2 className="text-xl font-bold text-(--text-primary) mb-2">{t("Reset your password")}</h2>
      <p className="text-(--text-secondary) text-sm mb-4">
        {t("Enter your email address and we'll send you a link to reset your password.")}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Success message */}
        {successMessage && (
          <div className="p-3 rounded-(--radius-input) bg-(--success)/10 border border-(--success)/20 text-(--success) text-sm">
            {successMessage}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-(--radius-input) bg-(--error)/10 border border-(--error)/20 text-(--error) text-sm text-center">{error}</div>
        )}

        {/* Email field */}
        <div className="space-y-2">
          <label htmlFor="forgot-email" className="block text-sm font-medium text-(--text-secondary)">
            {t("Email")}
          </label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 outline-none transition-all
              bg-(--bg-surface-2) 
              border border-(--border-subtle) 
              rounded-(--radius-input) 
              text-(--text-primary) 
              placeholder-(--text-muted)
              focus:border-(--brand-yellow) 
              focus:ring-1 focus:ring-(--brand-yellow)
              disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="tu@exemplo.com"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 font-bold transition-all transform active:scale-[0.98]
            bg-(--brand-yellow) 
            text-(--bg-primary) 
            rounded-(--radius-button)
            hover:bg-(--brand-yellow-soft) 
            hover:shadow-[0_0_15px_rgb(var(--brand-yellow)/0.3)]
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t("Sending...") : t("Send reset link")}
        </button>
      </form>
    </div>
  );
}
