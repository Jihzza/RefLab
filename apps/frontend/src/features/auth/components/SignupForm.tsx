import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@/components/ui';
import { mapAuthError } from '../api/authErrors';
import { CAPTCHA_CONFIGURED, isCaptchaSubmissionReady } from '../config';
import { meetsPasswordPolicy, PASSWORD_REQUIREMENT_KEY } from '../passwordPolicy';
import type { AuthFormErrors } from '../types';
import CaptchaChallenge from './CaptchaChallenge';
import GoogleAuthAction from './GoogleAuthAction';
import { useAuth } from './useAuth';

export default function SignupForm() {
  const { t } = useTranslation();
  const { signUp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
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
    } else if (!meetsPasswordPolicy(password)) {
      newErrors.password = t(PASSWORD_REQUIREMENT_KEY);
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t('Please confirm your password');
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t('Passwords do not match');
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
    setSuccessMessage('');
    if (!validateForm()) return;

    setLoading(true);
    const { error, requiresEmailConfirmation } = await signUp(
      email,
      password,
      captchaToken ?? undefined,
    );
    resetCaptchaChallenge();

    if (error) {
      const mapped = mapAuthError(error, 'signup');
      setErrors(mapped.field ? { [mapped.field]: mapped.message } : { general: mapped.message });
      setLoading(false);
      return;
    }

    setSuccessMessage(
      requiresEmailConfirmation
        ? t('Account created! Please check your email to confirm your account.')
        : t('Account created! You can start using RefLab now.'),
    );
    setLoading(false);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleGoogleSignup = async () => {
    setErrors({});
    setSuccessMessage('');
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
          {t('Create account')}
        </h2>
        <p className="mt-2 text-sm leading-6 text-(--mc-color-text-secondary)">
          {t('Sign up')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {successMessage && (
          <div role="status" className="rounded-(--mc-radius-input) border border-(--mc-color-success)/45 bg-(--mc-color-success)/10 px-3 py-2.5 text-sm leading-5 text-(--mc-color-success)">
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
          label={t('Email')}
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
          label={t('Password')}
          placeholder="••••••••"
          hint={t(PASSWORD_REQUIREMENT_KEY)}
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
          label={t('Confirm Password')}
          placeholder="••••••••"
          error={errors.confirmPassword}
        />

        <p className="text-xs leading-5 text-(--mc-color-text-muted)">
          {t('By creating an account, you agree to the')}{' '}
          <Link className="font-semibold text-(--mc-color-info) underline-offset-2 hover:underline" to="/terms">
            {t('Terms of Service')}
          </Link>{' '}
          {t('and confirm that you have read the')}{' '}
          <Link className="font-semibold text-(--mc-color-info) underline-offset-2 hover:underline" to="/privacy">
            {t('Privacy Policy')}
          </Link>.
        </p>

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
          loadingText={t('Creating account...')}
        >
          {t('Create account')}
        </Button>

        <GoogleAuthAction
          buttonLabel="Continue with Google"
          dividerLabel="or"
          loading={loading}
          onClick={handleGoogleSignup}
        />
      </form>
    </div>
  );
}
