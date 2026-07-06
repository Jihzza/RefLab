/**
 * CookieConsentBanner — Global cookie consent popup.
 *
 * Appears at the bottom of the viewport when the user has not yet
 * accepted cookies. Stores consent in localStorage so the banner
 * does not reappear after acceptance.
 *
 * Mounted in App.tsx outside all providers (only needs BrowserRouter).
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cookie } from 'lucide-react';
import Button from '@/components/ui/Button';

const STORAGE_KEY = 'cookie-consent';

export default function CookieConsentBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  // Check localStorage on mount — only show if no consent recorded
  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  /** Save consent to localStorage and hide the banner */
  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  /** Dismiss without saving — banner will reappear on next visit */
  const handleDecline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t('Cookie consent')}
      className="animate-fade-up fixed inset-x-0 bottom-0 z-50 p-4"
    >
      <div className="card-console glass mx-auto max-w-lg p-4 shadow-(--shadow-pop)">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-(--radius-button) bg-(--brand-yellow)/12 text-(--brand-yellow)"
          >
            <Cookie className="h-5 w-5" />
          </span>

          {/* Message */}
          <p className="text-sm leading-relaxed text-(--text-secondary)">
            {t('We use cookies to improve your experience. By continuing to use RefLab, you agree to our')}{' '}
            <Link to="/cookies" className="font-medium text-(--info) hover:underline">
              {t('Cookies Policy')}
            </Link>
            .
          </p>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={handleAccept}
            aria-label={t('Accept cookies')}
          >
            {t('Accept')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={handleDecline}
            aria-label={t('Decline cookies')}
          >
            {t('Decline')}
          </Button>
        </div>
      </div>
    </div>
  );
}
