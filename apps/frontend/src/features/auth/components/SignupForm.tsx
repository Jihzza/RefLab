import { useState } from "react";
import { Mail, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "./useAuth";
import { mapAuthError } from "../api/authErrors";
import type { AuthFormErrors } from "../types";
import { useTranslation } from "react-i18next";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import GoogleButton from "./GoogleButton";

/**
 * SignupForm - Email/password registration form with Google OAuth option
 *
 * Features:
 * - Email, password, and confirm password fields
 * - Password strength validation (minimum 6 characters)
 * - "Sign up with Google" button
 * - Field-specific error messages
 * - Shows success message after signup (email confirmation required)
 */
export default function SignupForm() {
  const { t } = useTranslation();
  const { signUp, signInWithGoogle } = useAuth();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [successMessage, setSuccessMessage] = useState("");

  // Validate form before submission
  const validateForm = (): boolean => {
    const newErrors: AuthFormErrors = {};

    if (!email) {
      newErrors.email = t("Email is required");
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t("Please enter a valid email");
    }

    if (!password) {
      newErrors.password = t("Password is required");
    } else if (password.length < 6) {
      newErrors.password = t("Password must be at least 6 characters");
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t("Please confirm your password");
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t("Passwords do not match");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle email/password signup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous state
    setErrors({});
    setSuccessMessage("");

    // Validate
    if (!validateForm()) return;

    setLoading(true);

    const { error } = await signUp(email, password);

    if (error) {
      const mapped = mapAuthError(error, 'signup');
      setErrors(mapped.field ? { [mapped.field]: mapped.message } : { general: mapped.message });
      setLoading(false);
      return;
    }

    // Success - show confirmation message
    // User needs to confirm their email before they can log in
    setSuccessMessage(
      t("Account created! Please check your email to confirm your account.")
    );
    setLoading(false);

    // Clear form
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  // Handle Google OAuth signup (same as login - Google handles both)
  const handleGoogleSignup = async () => {
    setErrors({});
    setSuccessMessage("");
    setLoading(true);

    const { error } = await signInWithGoogle();

    if (error) {
      const mapped = mapAuthError(error, 'oauth');
      setErrors({ general: mapped.message });
      setLoading(false);
    }
    // Note: If successful, user will be redirected to Google
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {successMessage && (
        <div
          role="status"
          className="p-3 rounded-(--radius-input) bg-(--success)/10 border border-(--success)/20 text-(--success) text-sm"
        >
          {successMessage}
        </div>
      )}

      {errors.general && (
        <div
          role="alert"
          className="p-3 rounded-(--radius-input) bg-(--error)/10 border border-(--error)/20 text-(--error) text-sm text-center"
        >
          {errors.general}
        </div>
      )}

      <Input
        id="signup-email"
        type="email"
        label={t("Email")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        placeholder="nome@exemplo.com"
        autoComplete="email"
        leftIcon={<Mail size={17} />}
        error={errors.email}
      />

      <Input
        id="signup-password"
        type="password"
        label={t("Password")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
        placeholder="••••••••"
        autoComplete="new-password"
        leftIcon={<Lock size={17} />}
        error={errors.password}
        hint={!errors.password ? t("Minimum 6 characters") : undefined}
      />

      <Input
        id="signup-confirm"
        type="password"
        label={t("Confirm Password")}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        disabled={loading}
        placeholder="••••••••"
        autoComplete="new-password"
        leftIcon={<ShieldCheck size={17} />}
        error={errors.confirmPassword}
      />

      <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
        {loading ? t("Creating account...") : t("Create account")}
      </Button>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-(--border-subtle)" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-(--bg-surface) text-xs text-(--text-muted)">{t("or")}</span>
        </div>
      </div>

      <GoogleButton onClick={handleGoogleSignup} disabled={loading} label={t("Continue with Google")} />
    </form>
  );
}
