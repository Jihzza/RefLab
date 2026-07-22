/**
 * CookiesPolicyTab — Cookies policy content section.
 *
 * Renders the current technical browser-storage notice.
 * Styled with the app's design tokens for consistency.
 */

import { useTranslation } from 'react-i18next';

export default function CookiesPolicyTab() {
  const { t } = useTranslation();

  return (
    <article className="overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border) bg-(--mc-color-surface) shadow-(--mc-shadow-soft)">
      {/* Header */}
      <section className="relative overflow-hidden border-b border-(--mc-color-border) bg-(--mc-color-surface-raised) p-5 sm:p-6">
        <div className="absolute inset-y-0 left-0 w-1 bg-(--mc-color-accent)" aria-hidden="true" />
        <h2 className="text-xl font-bold text-(--mc-color-text)">
          {t('Cookies Policy')}
        </h2>
        <p className="mt-1 text-xs font-medium text-(--mc-color-text-muted)">{t('Last updated: July 2026')}</p>
      </section>

      {/* What Are Cookies */}
      <section className="border-b border-(--mc-color-border) p-5 last:border-b-0 sm:p-6">
        <h3 className="mb-2 text-base font-semibold text-(--mc-color-text)">
          {t('1. Browser Storage')}
        </h3>
        <p className="text-sm leading-7 text-(--mc-color-text-secondary)">
          {t(
            'RefLab uses browser storage that is necessary to keep you signed in, protect the authentication flow, remember your language and retain essential interface preferences.'
          )}
        </p>
      </section>

      {/* Cookies We Use */}
      <section className="border-b border-(--mc-color-border) p-5 last:border-b-0 sm:p-6">
        <h3 className="mb-2 text-base font-semibold text-(--mc-color-text)">
          {t('2. What We Use at Launch')}
        </h3>
        <p className="mb-3 text-sm leading-7 text-(--mc-color-text-secondary)">
          {t('At launch, RefLab uses only storage required to operate the service:')}
        </p>
        <ul className="space-y-3 text-sm leading-7 text-(--mc-color-text-secondary)">
          <li className="flex gap-2">
            <span className="shrink-0 text-(--mc-color-accent)">&bull;</span>
            <span>
              <strong className="text-(--mc-color-text)">{t('Authentication and security:')}</strong>{' '}
              {t('Session tokens and related state used to sign you in securely and restore your session.')}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 text-(--mc-color-accent)">&bull;</span>
            <span>
              <strong className="text-(--mc-color-text)">{t('Essential preferences:')}</strong>{' '}
              {t('Language, interface choices and acknowledgement of the storage notice.')}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 text-(--mc-color-accent)">&bull;</span>
            <span>
              <strong className="text-(--mc-color-text)">{t('No optional tracking:')}</strong>{' '}
              {t('RefLab does not currently initialise analytics or advertising cookies.')}
            </span>
          </li>
        </ul>
      </section>

      {/* Managing Cookies */}
      <section className="border-b border-(--mc-color-border) p-5 last:border-b-0 sm:p-6">
        <h3 className="mb-2 text-base font-semibold text-(--mc-color-text)">
          {t('3. Managing Browser Storage')}
        </h3>
        <p className="text-sm leading-7 text-(--mc-color-text-secondary)">
          {t(
            'You can clear RefLab browser storage through your browser settings. Doing so signs you out and resets local preferences. Essential authentication storage cannot be disabled inside RefLab while you are signed in.'
          )}
        </p>
      </section>

      {/* Third-Party Cookies */}
      <section className="border-b border-(--mc-color-border) p-5 last:border-b-0 sm:p-6">
        <h3 className="mb-2 text-base font-semibold text-(--mc-color-text)">
          {t('4. External Authentication')}
        </h3>
        <p className="text-sm leading-7 text-(--mc-color-text-secondary)">
          {t(
            'If you choose Google sign-in, Google may use its own cookies or storage on its service during authentication. Its own privacy and cookie terms apply to that external step. RefLab will request consent before introducing optional tracking in the future.'
          )}
        </p>
      </section>
    </article>
  );
}
