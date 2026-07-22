/**
 * CookieConsentBanner — Essential browser-storage notice.
 *
 * Appears at the bottom of the viewport when the user has not yet
 * acknowledged the notice. RefLab does not currently initialise optional
 * analytics or advertising cookies, so this is an information notice rather
 * than a misleading consent choice.
 *
 * Mounted in App.tsx outside all providers (only needs BrowserRouter).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'essential-storage-notice-v1';

export default function CookieConsentBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === null;
    } catch {
      // If storage is unavailable, keep the choice visible for this visit.
      return true;
    }
  });

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'dismissed');
    } catch {
      // The banner can still be dismissed when storage is unavailable.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={t('Essential storage notice')}
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
    >
      <div className="max-w-lg mx-auto bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-4 shadow-lg">
        {/* Message */}
        <p className="text-sm text-(--text-secondary) mb-4 leading-relaxed">
          {t('RefLab uses essential browser storage to keep your session, language and preferences. We do not currently use analytics or advertising cookies. Read our')}{' '}
          <Link
            to="/cookies"
            className="font-medium text-(--info) underline underline-offset-4"
          >
            {t('Cookies Policy')}
          </Link>
          .
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="w-full py-2 rounded-(--radius-button) text-sm font-medium bg-(--brand-yellow) text-(--bg-primary) transition-colors hover:opacity-90"
          >
            {t('Understood')}
          </button>
        </div>
      </div>
    </div>
  );
}
