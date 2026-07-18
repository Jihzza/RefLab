import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { mapAuthError } from "../api/authErrors";
import type { AuthFormErrors } from "../types";
import { useTranslation } from "react-i18next";
import { Button, Input } from "@/components/ui";
import { persistAuthReturnTo, resolveAuthReturnTo } from "../utils/authNavigation";
import { MIN_PASSWORD_LENGTH } from "../config";
import {
  clearPendingLegalAcceptance,
} from "../utils/legalAcceptanceIntent";

interface SignupFormProps {
  onPendingChange?: (pending: boolean) => void;
}

/**
 * SignupForm - Email/password registration form with Google OAuth option
 *
 * Features:
 * - Email, password, and confirm password fields
 * - Password length validation aligned with the launch policy
 * - "Sign up with Google" button
 * - Field-specific error messages
 * - Shows success message after signup (email confirmation required)
 */
export default function SignupForm({ onPendingChange }: SignupFormProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { signUp, signInWithGoogle } = useAuth();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [successMessage, setSuccessMessage] = useState("");

  const setRequestPending = (pending: boolean) => {
    setLoading(pending);
    onPendingChange?.(pending);
  };

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
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = t("Password must be at least {{count}} characters", {
        count: MIN_PASSWORD_LENGTH,
      });
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t("Please confirm your password");
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t("Passwords do not match");
    }

    if (!legalAccepted) {
      newErrors.legal = t("You must explicitly accept the Terms of Service and acknowledge the Privacy Policy.");
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

    setRequestPending(true);

    try {
      const returnTo = persistAuthReturnTo(resolveAuthReturnTo(location.search));
      clearPendingLegalAcceptance();
      const { error } = await signUp(email, password, returnTo);

      if (error) {
        clearPendingLegalAcceptance();
        const mapped = mapAuthError(error, 'signup');
        setErrors(mapped.field ? { [mapped.field]: mapped.message } : { general: mapped.message });
        setRequestPending(false);
        return;
      }

      // User needs to confirm their email before they can log in.
      setSuccessMessage(
        t("Account created! Please check your email to confirm your account.")
      );
      setRequestPending(false);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setLegalAccepted(false);
    } catch (caughtError) {
      clearPendingLegalAcceptance();
      const mapped = mapAuthError(
        caughtError instanceof Error ? caughtError : new Error('Account creation failed'),
        'signup',
      );
      setErrors(mapped.field ? { [mapped.field]: mapped.message } : { general: mapped.message });
      setRequestPending(false);
    }
  };

  // Handle Google OAuth signup (same as login - Google handles both)
  const handleGoogleSignup = async () => {
    setErrors({});
    setSuccessMessage("");

    if (!legalAccepted) {
      setErrors({
        legal: t("You must explicitly accept the Terms of Service and acknowledge the Privacy Policy."),
      });
      return;
    }

    setRequestPending(true);

    try {
      const returnTo = persistAuthReturnTo(resolveAuthReturnTo(location.search));
      clearPendingLegalAcceptance();
      const { error } = await signInWithGoogle(returnTo);

      if (!error) return;

      const mapped = mapAuthError(error, 'oauth');
      clearPendingLegalAcceptance();
      setErrors({ general: mapped.message });
      setRequestPending(false);
    } catch (caughtError) {
      clearPendingLegalAcceptance();
      const mapped = mapAuthError(
        caughtError instanceof Error ? caughtError : new Error('Authentication failed'),
        'oauth',
      );
      setErrors({ general: mapped.message });
      setRequestPending(false);
    }
    // Note: If successful, user will be redirected to Google
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold tracking-[-0.025em] text-(--mc-color-text)">
          {t("Create account")}
        </h2>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {successMessage && (
        <div role="status" className="rounded-(--mc-radius-input) border border-(--mc-color-success)/40 bg-(--mc-color-success)/10 px-3 py-2.5 text-sm leading-5 text-(--mc-color-success)">
          {successMessage}
        </div>
      )}

      {errors.general && (
        <div role="alert" className="rounded-(--mc-radius-input) border border-(--mc-color-danger)/45 bg-(--mc-color-danger)/10 px-3 py-2.5 text-sm leading-5 text-(--mc-color-danger)">
          {errors.general}
        </div>
      )}

        <Input
          id="signup-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading}
          label={t("Email")}
          placeholder="tu@exemplo.com"
          error={errors.email}
        />

        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={loading}
          minLength={MIN_PASSWORD_LENGTH}
          label={t("Password")}
          placeholder="••••••••"
          hint={t("Minimum {{count}} characters", { count: MIN_PASSWORD_LENGTH })}
          error={errors.password}
        />

        <Input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={loading}
          minLength={MIN_PASSWORD_LENGTH}
          label={t("Confirm Password")}
          placeholder="••••••••"
          error={errors.confirmPassword}
        />

        <div>
          <div className="flex items-start gap-3">
            <input
              id="signup-legal-acceptance"
              type="checkbox"
              checked={legalAccepted}
              onChange={(event) => {
                setLegalAccepted(event.target.checked);
                if (event.target.checked) {
                  setErrors((current) => ({ ...current, legal: undefined }));
                }
              }}
              disabled={loading}
              required
              aria-invalid={Boolean(errors.legal)}
              aria-describedby={errors.legal ? "signup-legal-error" : undefined}
              className="mc-focus-ring mt-0.5 size-5 shrink-0 cursor-pointer rounded border-(--mc-color-border-strong) accent-(--mc-color-accent) disabled:cursor-not-allowed disabled:opacity-50"
            />
            <label
              htmlFor="signup-legal-acceptance"
              className="text-xs leading-5 text-(--mc-color-text-muted)"
            >
              {t('I have read and agree to the')}{' '}
              <a
                href="/terms"
                target="_blank"
                rel="noreferrer"
                className="mc-focus-ring rounded-sm font-semibold text-(--mc-color-info) underline underline-offset-2"
              >
                {t('Terms of Service')}
              </a>{' '}
              {t('and acknowledge the')}{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="mc-focus-ring rounded-sm font-semibold text-(--mc-color-info) underline underline-offset-2"
              >
                {t('Privacy Policy')}
              </a>.
            </label>
          </div>
          {errors.legal && (
            <p id="signup-legal-error" role="alert" className="mt-2 text-xs leading-5 text-(--mc-color-danger)">
              {errors.legal}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          loadingText={t("Creating account...")}
        >
          {t("Create account")}
        </Button>

        <div className="relative py-1" aria-hidden="true">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-(--mc-color-border)" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-[0.12em]">
            <span className="bg-(--mc-color-surface) px-3 text-(--mc-color-text-muted)">
              {t("or")}
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={handleGoogleSignup}
          disabled={loading}
          leadingIcon={(
            <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
        >
          {t("Continue with Google")}
        </Button>
      </form>
    </div>
  );
}
