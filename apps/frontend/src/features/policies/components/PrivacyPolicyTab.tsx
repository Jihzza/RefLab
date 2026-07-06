/**
 * PrivacyPolicyTab — Privacy policy content section.
 *
 * Renders placeholder privacy policy text as readable long-form prose
 * inside a single console card, with numbered sections and dividers.
 */

import { useTranslation } from 'react-i18next';

export default function PrivacyPolicyTab() {
  const { t } = useTranslation();

  return (
    <article className="card-console p-6 sm:p-8 animate-fade-in">
      {/* Header */}
      <header className="pb-5 mb-6 border-b border-(--border-subtle)">
        <h2 className="text-xl font-bold text-(--text-primary)">
          {t('Privacy Policy')}
        </h2>
        <p className="text-xs text-(--text-muted) mt-1.5">{t('Last updated: February 2026')}</p>
      </header>

      <div className="space-y-7 max-w-prose">
        {/* Information We Collect */}
        <section>
          <h3 className="text-base font-semibold text-(--text-primary) mb-2">
            {t('1. Information We Collect')}
          </h3>
          <p className="text-[15px] text-(--text-secondary) leading-relaxed">
            {t(
              'We collect information you provide directly, such as your name, email address, and profile details when you create an account. We also collect usage data automatically, including pages visited, features used, and interaction patterns to improve our services.'
            )}
          </p>
        </section>

        {/* How We Use Your Information */}
        <section>
          <h3 className="text-base font-semibold text-(--text-primary) mb-2">
            {t('2. How We Use Your Information')}
          </h3>
          <p className="text-[15px] text-(--text-secondary) leading-relaxed">
            {t(
              'Your information is used to provide and maintain our services, personalize your experience, communicate important updates, and ensure account security. We may also use aggregated, anonymized data for analytics and service improvements.'
            )}
          </p>
        </section>

        {/* Data Sharing */}
        <section>
          <h3 className="text-base font-semibold text-(--text-primary) mb-2">
            {t('3. Data Sharing')}
          </h3>
          <p className="text-[15px] text-(--text-secondary) leading-relaxed">
            {t(
              'We do not sell your personal information. We may share data with trusted third-party service providers who assist in operating our platform, subject to strict confidentiality agreements. We may also disclose information when required by law or to protect our rights.'
            )}
          </p>
        </section>

        {/* Your Rights */}
        <section>
          <h3 className="text-base font-semibold text-(--text-primary) mb-2">
            {t('4. Your Rights')}
          </h3>
          <p className="text-[15px] text-(--text-secondary) leading-relaxed">
            {t(
              'You have the right to access, update, or delete your personal information at any time through your account settings. You may also request a copy of your data or opt out of certain data processing activities by contacting our support team.'
            )}
          </p>
        </section>

        {/* Contact */}
        <section>
          <h3 className="text-base font-semibold text-(--text-primary) mb-2">
            {t('5. Contact Us')}
          </h3>
          <p className="text-[15px] text-(--text-secondary) leading-relaxed">
            {t('If you have any questions about this Privacy Policy, please contact us at')}{' '}
            <span className="text-(--brand-yellow) font-medium">privacy@reflab.com</span>.
          </p>
        </section>
      </div>
    </article>
  );
}
