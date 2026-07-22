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
    <article className="overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border) bg-(--mc-color-surface) shadow-(--mc-shadow-soft)">
      {/* Header */}
      <section className="relative overflow-hidden border-b border-(--mc-color-border) bg-(--mc-color-surface-raised) p-5 sm:p-6">
        <div className="absolute inset-y-0 left-0 w-1 bg-(--mc-color-accent)" aria-hidden="true" />
        <h2 className="text-xl font-bold text-(--mc-color-text)">
          {t('Privacy Policy')}
        </h2>
        <p className="mt-1 text-xs font-medium text-(--mc-color-text-muted)">{t('Last updated: February 2026')}</p>
      </section>

      {/* Information We Collect */}
      <section className="border-b border-(--mc-color-border) p-5 last:border-b-0 sm:p-6">
        <h3 className="mb-2 text-base font-semibold text-(--mc-color-text)">
          {t('1. Information We Collect')}
        </h3>
        <p className="text-sm leading-7 text-(--mc-color-text-secondary)">
          {t(
            'We collect information you provide directly, such as your name, email address, and profile details when you create an account. We also collect usage data automatically, including pages visited, features used, and interaction patterns to improve our services.'
          )}
        </p>
      </section>

      {/* How We Use Your Information */}
      <section className="border-b border-(--mc-color-border) p-5 last:border-b-0 sm:p-6">
        <h3 className="mb-2 text-base font-semibold text-(--mc-color-text)">
          {t('2. How We Use Your Information')}
        </h3>
        <p className="text-sm leading-7 text-(--mc-color-text-secondary)">
          {t(
            'Your information is used to provide and maintain our services, personalize your experience, communicate important updates, and ensure account security. We may also use aggregated, anonymized data for analytics and service improvements.'
          )}
        </p>
      </section>

      {/* Data Sharing */}
      <section className="border-b border-(--mc-color-border) p-5 last:border-b-0 sm:p-6">
        <h3 className="mb-2 text-base font-semibold text-(--mc-color-text)">
          {t('3. Data Sharing')}
        </h3>
        <p className="text-sm leading-7 text-(--mc-color-text-secondary)">
          {t(
            'We do not sell your personal information. We may share data with trusted third-party service providers who assist in operating our platform, subject to strict confidentiality agreements. We may also disclose information when required by law or to protect our rights.'
          )}
        </p>
      </section>

      {/* Your Rights */}
      <section className="border-b border-(--mc-color-border) p-5 last:border-b-0 sm:p-6">
        <h3 className="mb-2 text-base font-semibold text-(--mc-color-text)">
          {t('4. Your Rights')}
        </h3>
        <p className="text-sm leading-7 text-(--mc-color-text-secondary)">
          {t(
            'You have the right to access, update, or delete your personal information at any time through your account settings. You may also request a copy of your data or opt out of certain data processing activities by contacting our support team.'
          )}
        </p>
      </section>

      {/* Contact */}
      <section className="border-b border-(--mc-color-border) p-5 last:border-b-0 sm:p-6">
        <h3 className="mb-2 text-base font-semibold text-(--mc-color-text)">
          {t('5. Contact Us')}
        </h3>
        <p className="text-sm leading-7 text-(--mc-color-text-secondary)">
          {t('If you have any questions about this Privacy Policy, please contact us at')}{' '}
          <span className="font-medium text-(--mc-color-info)">privacy@reflab.com</span>.
        </p>
      </section>
    </article>
  );
}
