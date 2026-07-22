import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@/components/ui';
import { mapAuthError } from '../api/authErrors';
import { CAPTCHA_CONFIGURED, isCaptchaSubmissionReady } from '../config';
import type { AuthFormErrors } from '../types';
import CaptchaChallenge from './CaptchaChallenge';
import GoogleAuthAction from './GoogleAuthAction';
import { useAuth } from './useAuth';

interface LoginFormProps {
  onForgotPassword: () => void;
}

export default function LoginForm({ onForgotPassword }: LoginFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  const resetCaptchaChallenge = () => {
    setCaptchaToken(null);
    setCaptchaResetKey((current) => current + 1);
  };

  const validateForm = (): boolean => {
    const newErrors: AuthFormErrors = {};

    if (!email) {
      newErrors.email = t('Email is required');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t('Please enter a valid email');
    }

    if (!password) {
      newErrors.password = t('Password is required');
    }

    if (!CAPTCHA_CONFIGURED) {
      newErrors.general = t('Security check unavailable. Please try again later.');
    } else if (!isCaptchaSubmissionReady(captchaToken)) {
      newErrors.general = t('Complete the security check.');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    if (!validateForm()) return;

    setLoading(true);
    const { error } = await signIn(email, password, captchaToken ?? undefined);
    resetCaptchaChallenge();

    if (error) {
      const mapped = mapAuthError(error, 'login');
      setErrors(mapped.field ? { [mapped.field]: mapped.message } : { general: mapped.message });
      setLoading(false);
      return;
    }

    navigate('/app/dashboard');
  };

  const handleGoogleLogin = async () => {
    setErrors({});
    setLoading(true);

    const { error } = await signInWithGoogle();

    if (error) {
      const mapped = mapAuthError(error, 'oauth');
      setErrors({ general: mapped.message });
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-(--mc-color-accent)">
          Match Control
        </p>
        <h2 className="text-2xl font-extrabold tracking-[-0.025em] text-(--mc-color-text)">
          {t('Bienvenido de nuevo')}
        </h2>
        <p className="mt-2 text-sm leading-6 text-(--mc-color-text-secondary)">
          {t('Ingresa tus credenciales para acceder a RefLab')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          label={t('Correo Electrónico')}
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
            label={t('Contraseña')}
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
              {t('¿Olvidaste tu contraseña?')}
            </button>
          </div>
        </div>

        <CaptchaChallenge
          key={captchaResetKey}
          onTokenChange={setCaptchaToken}
          onError={() => setErrors((current) => ({
            ...current,
            general: t('Security check unavailable. Please try again later.'),
          }))}
        />

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          loadingText={t('Iniciando sesión...')}
        >
          {t('Iniciar Sesión')}
        </Button>

        <GoogleAuthAction
          buttonLabel="Google"
          dividerLabel="o continuar con"
          loading={loading}
          onClick={handleGoogleLogin}
        />
      </form>
    </div>
  );
}
