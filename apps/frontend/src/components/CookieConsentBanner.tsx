/**
 * CookieConsentBanner — Global cookie consent popup.
 *
 * Appears at the bottom of the viewport when the user has not yet
 * accepted cookies. Stores consent in localStorage so the banner
 * does not reappear after acceptance.
 *
 * Mounted in App.tsx outside all providers (only needs BrowserRouter).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui';

const STORAGE_KEY = 'cookie-consent';

export default function CookieConsentBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return !window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return true;
    }
  });

  const saveConsent = (value: 'accepted' | 'declined') => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Consent remains session-only when storage is unavailable.
    } finally {
      setVisible(false);
    }
  };

  /** Save consent to localStorage and hide the banner */
  const handleAccept = () => {
    saveConsent('accepted');
  };

  /** Record that optional cookies were declined and hide the banner. */
  const handleDecline = () => {
    saveConsent('declined');
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={t('Cookie consent')}
      aria-describedby="cookie-consent-description"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-(--mc-z-popover) p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-3xl overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border-strong) bg-(--mc-color-surface)/97 shadow-(--mc-shadow-raised) backdrop-blur-md">
        <div className="h-1 bg-[linear-gradient(90deg,var(--mc-color-accent)_0_78%,var(--mc-color-danger)_78%_100%)]" aria-hidden="true" />
        <div className="grid gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5">
          <span className="hidden size-11 items-center justify-center rounded-(--mc-radius-button) border border-(--mc-color-border) bg-(--mc-color-surface-raised) text-(--mc-color-accent) sm:flex">
            <Cookie className="size-5" aria-hidden="true" />
          </span>

          <p id="cookie-consent-description" className="text-sm leading-6 text-(--mc-color-text-secondary)">
            {t('We use cookies to improve your experience. By continuing to use RefLab, you agree to our')}{' '}
            <Link
              to="/cookies"
              className="mc-focus-ring rounded-sm font-semibold text-(--mc-color-accent) hover:text-(--mc-color-accent-soft)"
            >
              {t('Cookies Policy')}
            </Link>
            .
          </p>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:min-w-64">
            <Button
              type="button"
              onClick={handleAccept}
              className="sm:flex-1"
              aria-label={t('Accept cookies')}
            >
              {t('Accept')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleDecline}
              className="sm:flex-1"
              aria-label={t('Decline cookies')}
            >
              {t('Decline')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
