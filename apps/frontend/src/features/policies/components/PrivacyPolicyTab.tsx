/**
 * PrivacyPolicyTab — Privacy policy content section.
 *
 * Renders placeholder privacy policy text organized into semantic sections.
 * Styled with the app's design tokens for consistency.
 */

import { useTranslation } from 'react-i18next';

export default function PrivacyPolicyTab() {
  const { t } = useTranslation();

  return (
    <article className="space-y-4">
      {/* Header */}
      <section className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5">
        <h2 className="text-lg font-semibold text-(--text-primary) mb-1">
          {t('Privacy Policy')}
        </h2>
        <p className="text-xs text-(--text-muted)">{t('Last updated: February 2026')}</p>
      </section>

      {/* Information We Collect */}
      <section className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5">
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          1. Information We Collect
        </h3>
        <p className="text-sm text-(--text-secondary) leading-relaxed">
          We collect information you provide directly, such as your name, email address,
          and profile details when you create an account. We also collect usage data
          automatically, including pages visited, features used, and interaction patterns
          to improve our services.
        </p>
      </section>

      {/* How We Use Your Information */}
      <section className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5">
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          2. How We Use Your Information
        </h3>
        <p className="text-sm text-(--text-secondary) leading-relaxed">
          Your information is used to provide and maintain our services, personalize your
          experience, communicate important updates, and ensure account security. We may
          also use aggregated, anonymized data for analytics and service improvements.
        </p>
      </section>

      {/* Data Sharing */}
      <section className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5">
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          3. Data Sharing
        </h3>
        <p className="text-sm text-(--text-secondary) leading-relaxed">
          We do not sell your personal information. We may share data with trusted
          third-party service providers who assist in operating our platform, subject to
          strict confidentiality agreements. We may also disclose information when
          required by law or to protect our rights.
        </p>
      </section>

      {/* Your Rights */}
      <section className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5">
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          4. Your Rights
        </h3>
        <p className="text-sm text-(--text-secondary) leading-relaxed">
          You have the right to access, update, or delete your personal information at
          any time through your account settings. You may also request a copy of your
          data or opt out of certain data processing activities by contacting our support
          team.
        </p>
      </section>

      {/* Contact */}
      <section className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5">
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          5. Contact Us
        </h3>
        <p className="text-sm text-(--text-secondary) leading-relaxed">
          If you have any questions about this Privacy Policy, please contact us at{' '}
          <span className="text-(--info)">privacy@reflab.com</span>.
        </p>
      </section>
    </article>
  );
}
