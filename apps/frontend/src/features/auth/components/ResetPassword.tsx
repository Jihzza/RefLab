import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@/components/ui';
import { mapAuthError } from '../api/authErrors';
import PublicAuthFrame from './PublicAuthFrame';
import { useAuth } from './useAuth';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updatePassword, user, recoveryMode } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkTimedOut, setLinkTimedOut] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user || recoveryMode) return;

    const timer = setTimeout(() => {
      if (!user && !recoveryMode) {
        setLinkTimedOut(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [user, recoveryMode]);

  const linkError = !user && !recoveryMode && linkTimedOut
    ? t('Invalid or expired reset link. Please request a new password reset.')
    : '';
  const displayedError = error || linkError;

  const validateForm = (): boolean => {
    if (!password) {
      setError(t('Password is required'));
      return false;
    }

    if (password.length < 6) {
      setError(t('Password must be at least 6 characters'));
      return false;
    }

    if (password !== confirmPassword) {
      setError(t('Passwords do not match'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
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

      setSuccess(true);
      setLoading(false);

      setTimeout(() => {
        navigate('/app/dashboard', { replace: true });
      }, 2000);
    } catch (caughtError) {
      const mapped = mapAuthError(
        caughtError instanceof Error ? caughtError : new Error('Failed to update password'),
        'update-password',
      );
      setError(mapped.message);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PublicAuthFrame>
        <div className="py-3 text-center" role="status" aria-live="polite">
          <CheckCircle2 className="mx-auto size-12 text-(--mc-color-success)" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-[-0.025em] text-(--mc-color-text)">
            {t('Password updated!')}
          </h1>
          <p className="mt-2 text-sm leading-6 text-(--mc-color-text-secondary)">
            {t('Redirecting you to the dashboard...')}
          </p>
        </div>
      </PublicAuthFrame>
    );
  }

  return (
    <PublicAuthFrame>
      <div className="mb-6">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-(--mc-color-accent)">
          Match Control
        </p>
        <h1 className="text-2xl font-extrabold tracking-[-0.025em] text-(--mc-color-text)">
          {t('Set new password')}
        </h1>
        <p className="mt-2 text-sm leading-6 text-(--mc-color-text-secondary)">
          {t('Enter your new password below.')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {displayedError && (
          <div role="alert" className="rounded-(--mc-radius-input) border border-(--mc-color-danger)/45 bg-(--mc-color-danger)/10 px-3 py-2.5 text-sm leading-5 text-(--mc-color-danger)">
            {displayedError}
          </div>
        )}

        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={loading || !user}
          label={t('New Password')}
          placeholder="••••••••"
          hint={t('Minimum 6 characters')}
        />

        <Input
          id="confirm-new-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={loading || !user}
          label={t('Confirm New Password')}
          placeholder="••••••••"
        />

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          loadingText={t('Updating...')}
          disabled={!user}
        >
          {t('Update password')}
        </Button>

        <Button type="button" variant="ghost" fullWidth onClick={() => navigate('/')}>
          {t('Back to login')}
        </Button>
      </form>
    </PublicAuthFrame>
  );
}
