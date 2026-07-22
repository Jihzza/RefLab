import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@/components/ui';
import { useAuth } from './useAuth';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

export default function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email) {
      setError(t('Email is required'));
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t('Please enter a valid email'));
      return;
    }

    setLoading(true);
    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSuccessMessage(t('If an account exists with this email, you will receive a password reset link.'));
    setLoading(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBackToLogin}
        disabled={loading}
        className="mc-focus-ring mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-(--mc-color-accent) hover:text-(--mc-color-accent-soft) disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t('Back to login')}
      </button>

      <div className="mb-6">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-(--mc-color-accent)">
          Match Control
        </p>
        <h2 className="text-2xl font-extrabold tracking-[-0.025em] text-(--mc-color-text)">
          {t('Reset your password')}
        </h2>
        <p className="mt-2 text-sm leading-6 text-(--mc-color-text-secondary)">
          {t("Enter your email address and we'll send you a link to reset your password.")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {successMessage && (
          <div role="status" className="rounded-(--mc-radius-input) border border-(--mc-color-success)/45 bg-(--mc-color-success)/10 px-3 py-2.5 text-sm leading-5 text-(--mc-color-success)">
            {successMessage}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-(--mc-radius-input) border border-(--mc-color-danger)/45 bg-(--mc-color-danger)/10 px-3 py-2.5 text-sm leading-5 text-(--mc-color-danger)">
            {error}
          </div>
        )}

        <Input
          id="forgot-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading}
          label={t('Email')}
          placeholder="tu@exemplo.com"
        />

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          loadingText={t('Sending...')}
        >
          {t('Send reset link')}
        </Button>
      </form>
    </div>
  );
}
