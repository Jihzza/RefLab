/**
 * CookiesPolicyTab — Cookies policy content section.
 *
 * Renders placeholder cookies policy text organized into semantic sections.
 * Styled with the app's design tokens for consistency.
 */

import { useTranslation } from 'react-i18next';

export default function CookiesPolicyTab() {
  const { t } = useTranslation();

  return (
    <article className="space-y-4">
      {/* Header */}
      <section className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5">
        <h2 className="text-lg font-semibold text-(--text-primary) mb-1">
          {t('Cookies Policy')}
        </h2>
        <p className="text-xs text-(--text-muted)">{t('Last updated: February 2026')}</p>
      </section>

      {/* What Are Cookies */}
      <section className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5">
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          1. What Are Cookies
        </h3>
        <p className="text-sm text-(--text-secondary) leading-relaxed">
          Cookies are small text files that are stored on your device when you visit a
          website. They are widely used to make websites work more efficiently and to
          provide information to the site owners. Cookies help us remember your
          preferences and improve your browsing experience.
        </p>
      </section>

      {/* Cookies We Use */}
      <section className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5">
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          2. Cookies We Use
        </h3>
        <p className="text-sm text-(--text-secondary) leading-relaxed mb-3">
          We use the following types of cookies on RefLab:
        </p>
        <ul className="space-y-2 text-sm text-(--text-secondary) leading-relaxed">
          <li className="flex gap-2">
            <span className="text-(--text-muted) shrink-0">&bull;</span>
            <span>
              <strong className="text-(--text-primary)">Essential cookies:</strong>{' '}
              Required for the platform to function, including authentication and
              session management.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-(--text-muted) shrink-0">&bull;</span>
            <span>
              <strong className="text-(--text-primary)">Preference cookies:</strong>{' '}
              Remember your settings and preferences to provide a personalized
              experience.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-(--text-muted) shrink-0">&bull;</span>
            <span>
              <strong className="text-(--text-primary)">Analytics cookies:</strong>{' '}
              Help us understand how visitors interact with the platform so we can
              improve our services.
            </span>
          </li>
        </ul>
      </section>

      {/* Managing Cookies */}
      <section className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5">
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          3. Managing Cookies
        </h3>
        <p className="text-sm text-(--text-secondary) leading-relaxed">
          You can manage your cookie preferences through the cookie consent banner that
          appears when you first visit RefLab. You can also control cookies through your
          browser settings. Please note that disabling essential cookies may affect the
          functionality of the platform.
        </p>
      </section>

      {/* Third-Party Cookies */}
      <section className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5">
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          4. Third-Party Cookies
        </h3>
        <p className="text-sm text-(--text-secondary) leading-relaxed">
          Some cookies on our platform are set by third-party services that appear on
          our pages. We do not control these cookies. Third-party providers include
          analytics and authentication services. Please refer to each provider's privacy
          policy for more information on how they use cookies.
        </p>
      </section>
    </article>
  );
}
