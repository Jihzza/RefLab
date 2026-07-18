/**
 * CookieConsentBanner — Global browser-storage notice.
 *
 * Appears at the bottom of the viewport until the user acknowledges it.
 * RefLab currently uses essential/local browser storage only, so this is an
 * information notice rather than a non-functional accept/decline control.
 *
 * Mounted in App.tsx outside all providers (only needs BrowserRouter).
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui';

const STORAGE_KEY = 'browser-storage-notice-v2';

export default function CookieConsentBanner() {
  const { t } = useTranslation();
  const noticeRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return !window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!visible) return undefined;

    const root = document.documentElement;
    const updateNoticeHeight = () => {
      const notice = noticeRef.current;
      if (!notice) return;
      root.style.setProperty('--mc-storage-notice-height', `${Math.ceil(notice.getBoundingClientRect().height)}px`);
    };
    const keepFocusedControlVisible = (event: FocusEvent) => {
      const notice = noticeRef.current;
      const target = event.target;
      if (!notice || !(target instanceof HTMLElement) || notice.contains(target)) return;

      const noticeTop = notice.getBoundingClientRect().top;
      if (target.getBoundingClientRect().bottom > noticeTop - 12) {
        // Run after the browser's native Tab-scroll so it cannot undo the
        // notice-aware positioning performed here.
        window.requestAnimationFrame(() => {
          if (noticeRef.current && document.activeElement === target) {
            target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
          }
        });
      }
    };

    root.classList.add('mc-storage-notice-visible');
    updateNoticeHeight();
    window.addEventListener('resize', updateNoticeHeight);
    document.addEventListener('focusin', keepFocusedControlVisible);

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateNoticeHeight);
    if (noticeRef.current) resizeObserver?.observe(noticeRef.current);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateNoticeHeight);
      document.removeEventListener('focusin', keepFocusedControlVisible);
      root.classList.remove('mc-storage-notice-visible');
      root.style.removeProperty('--mc-storage-notice-height');
    };
  }, [visible]);

  const acknowledgeNotice = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'acknowledged');
    } catch {
      // The acknowledgement remains session-only when storage is unavailable.
    } finally {
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      ref={noticeRef}
      role="region"
      aria-label={t('Cookie and browser storage notice')}
      aria-describedby="browser-storage-notice-description"
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

          <p id="browser-storage-notice-description" className="text-sm leading-6 text-(--mc-color-text-secondary)">
            {t('RefLab uses essential browser storage for sign-in, security, local preferences and offline resilience. Optional analytics and advertising storage are not currently enabled. Read our')}{' '}
            <Link
              to="/cookies"
              className="mc-focus-ring rounded-sm font-semibold text-(--mc-color-accent) hover:text-(--mc-color-accent-soft)"
            >
              {t('Cookies Policy')}
            </Link>
            .
          </p>

          <div className="sm:min-w-32">
            <Button
              type="button"
              onClick={acknowledgeNotice}
              className="w-full"
              aria-label={t('Dismiss cookie and browser storage notice')}
            >
              {t('Understood')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
