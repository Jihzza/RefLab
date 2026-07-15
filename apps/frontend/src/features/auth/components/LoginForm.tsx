import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { mapAuthError } from "../api/authErrors";
import type { AuthFormErrors } from "../types";
import { useTranslation } from "react-i18next";
import { Button, Input } from "@/components/ui";
import {
  consumeAuthReturnTo,
  persistAuthReturnTo,
  resolveAuthReturnTo,
} from "../utils/authNavigation";

interface LoginFormProps {
  onForgotPassword: () => void;
  onPendingChange?: (pending: boolean) => void;
}

/**
 * LoginForm - Email/password login form with Google OAuth option
 *
 * Features:
 * - Email and password fields with validation
 * - "Sign in with Google" button
 * - Field-specific error messages (red text under inputs)
 * - Loading state while authenticating
 * - Redirects to /app/dashboard on success
 */
export default function LoginForm({ onForgotPassword, onPendingChange }: LoginFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithGoogle } = useAuth();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<AuthFormErrors>({});

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
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle email/password login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});

    // Validate
    if (!validateForm()) return;

    setRequestPending(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        const mapped = mapAuthError(error, 'login');
        setErrors(mapped.field ? { [mapped.field]: mapped.message } : { general: mapped.message });
        setRequestPending(false);
        return;
      }

      const returnTo = consumeAuthReturnTo(location.search);
      setRequestPending(false);
      navigate(returnTo, { replace: true });
    } catch (caughtError) {
      const mapped = mapAuthError(
        caughtError instanceof Error ? caughtError : new Error('Authentication failed'),
        'login',
      );
      setErrors(mapped.field ? { [mapped.field]: mapped.message } : { general: mapped.message });
      setRequestPending(false);
    }
  };

  // Handle Google OAuth login
  const handleGoogleLogin = async () => {
    setErrors({});
    setRequestPending(true);

    try {
      const returnTo = persistAuthReturnTo(resolveAuthReturnTo(location.search));
      const { error } = await signInWithGoogle(returnTo);

      if (!error) return;

      const mapped = mapAuthError(error, 'oauth');
      setErrors({ general: mapped.message });
      setRequestPending(false);
    } catch (caughtError) {
      const mapped = mapAuthError(
        caughtError instanceof Error ? caughtError : new Error('Authentication failed'),
        'oauth',
      );
      setErrors({ general: mapped.message });
      setRequestPending(false);
    }
    // Note: If successful, user will be redirected to Google
    // No need to navigate here - the callback page handles it
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold tracking-[-0.025em] text-(--mc-color-text)">
          {t("Bienvenido de nuevo")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-(--mc-color-text-secondary)">
          {t("Ingresa tus credenciales para acceder a RefLab")}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {errors.general && (
          <div role="alert" className="rounded-(--mc-radius-input) border border-(--mc-color-danger)/45 bg-(--mc-color-danger)/10 px-3 py-2.5 text-sm leading-5 text-(--mc-color-danger)">
            {errors.general}
          </div>
        )}

        <Input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading}
          label={t("Correo Electrónico")}
          placeholder="nome@exemplo.com"
          error={errors.email}
        />

        <div>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
            label={t("Contraseña")}
            placeholder="••••••••"
            error={errors.password}
          />
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={onForgotPassword}
              disabled={loading}
              className="mc-focus-ring min-h-9 rounded-lg px-1 text-sm font-semibold text-(--mc-color-accent) hover:text-(--mc-color-accent-soft) disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("¿Olvidaste tu contraseña?")}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          loadingText={t("Iniciando sesión...")}
        >
          {t("Iniciar Sesión")}
        </Button>

        <div className="relative py-1" aria-hidden="true">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-(--mc-color-border)" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-[0.12em]">
            <span className="bg-(--mc-color-surface) px-3 text-(--mc-color-text-muted)">
              {t("o continuar con")}
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={handleGoogleLogin}
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
          Google
        </Button>
      </form>
    </div>
  );
};
