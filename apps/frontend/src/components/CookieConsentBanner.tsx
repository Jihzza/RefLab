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

const STORAGE_KEY = 'cookie-consent';

export default function CookieConsentBanner() {
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
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
    >
      <div className="max-w-lg mx-auto bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-4 shadow-lg">
        {/* Message */}
        <p className="text-sm text-(--text-secondary) mb-4 leading-relaxed">
          We use cookies to improve your experience. By continuing to use RefLab,
          you agree to our{' '}
          <Link
            to="/cookies"
            className="text-(--info) hover:underline"
          >
            Cookies Policy
          </Link>
          .
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleAccept}
            className="flex-1 py-2 rounded-(--radius-button) text-sm font-medium bg-(--brand-yellow) text-(--bg-primary) transition-colors hover:opacity-90"
            aria-label="Accept cookies"
          >
            Accept
          </button>
          <button
            onClick={handleDecline}
            className="flex-1 py-2 rounded-(--radius-button) text-sm font-medium bg-(--bg-surface-2) border border-(--border-subtle) text-(--text-secondary) transition-colors hover:bg-(--bg-hover)"
            aria-label="Decline cookies"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
