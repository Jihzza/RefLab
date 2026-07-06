import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { useAuth } from "./useAuth";
import { useTranslation } from "react-i18next";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

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
      <button
        type="button"
        onClick={onBackToLogin}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-(--brand-yellow) hover:text-(--brand-yellow-soft) hover:underline"
      >
        <ArrowLeft size={15} aria-hidden="true" /> {t("Back to login")}
      </button>

      <h2 className="text-xl font-bold text-(--text-primary) mb-2">{t("Reset your password")}</h2>
      <p className="text-(--text-secondary) text-sm mb-5">
        {t("Enter your email address and we'll send you a link to reset your password.")}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {successMessage && (
          <div
            role="status"
            className="p-3 rounded-(--radius-input) bg-(--success)/10 border border-(--success)/20 text-(--success) text-sm"
          >
            {successMessage}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-3 rounded-(--radius-input) bg-(--error)/10 border border-(--error)/20 text-(--error) text-sm text-center"
          >
            {error}
          </div>
        )}

        <Input
          id="forgot-email"
          type="email"
          label={t("Email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          placeholder="nome@exemplo.com"
          autoComplete="email"
          leftIcon={<Mail size={17} />}
        />

        <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
          {loading ? t("Sending...") : t("Send reset link")}
        </Button>
      </form>
    </div>
  );
}
