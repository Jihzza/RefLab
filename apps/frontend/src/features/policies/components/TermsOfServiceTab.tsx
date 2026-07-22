/**
 * TermsOfServiceTab — Terms of service content section.
 *
 * Renders placeholder terms of service text organized into semantic sections.
 * Styled with the app's design tokens for consistency.
 */

import { useTranslation } from 'react-i18next';

export default function TermsOfServiceTab() {
  const { t } = useTranslation();

  return (
    <article className="overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border) bg-(--mc-color-surface) shadow-(--mc-shadow-soft)">
      {/* Header */}
      <section className="relative overflow-hidden border-b border-(--mc-color-border) bg-(--mc-color-surface-raised) p-5 sm:p-6">
        <div className="absolute inset-y-0 left-0 w-1 bg-(--mc-color-accent)" aria-hidden="true" />
        <h2 className="text-xl font-bold text-(--mc-color-text)">
          {t('Terms of Service')}
        </h2>
        <p className="mt-1 text-xs font-medium text-(--mc-color-text-muted)">{t('Last updated: February 2026')}</p>
      </section>

      {/* Acceptance of Terms */}
      <section className="border-b border-(--mc-color-border) p-5 last:border-b-0 sm:p-6">
        <h3 className="mb-2 text-base font-semibold text-(--mc-color-text)">
          {t('1. Acceptance of Terms')}
        </h3>
        <p className="text-sm leading-7 text-(--mc-color-text-secondary)">
          {t(
            'By accessing or using RefLab, you agree to be bound by these Terms of Service. If you do not agree to all the terms and conditions, you may not access or use our services. We reserve the right to update these terms at any time, and continued use of the platform constitutes acceptance of the updated terms.'
          )}
        </p>
      </section>

      {/* User Accounts */}
      <section className="border-b border-(--mc-color-border) p-5 last:border-b-0 sm:p-6">
        <h3 className="mb-2 text-base font-semibold text-(--mc-color-text)">
          {t('2. User Accounts')}
        </h3>
        <p className="text-sm leading-7 text-(--mc-color-text-secondary)">
          {t(
            'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information during registration and keep your account information up to date. You must notify us immediately of any unauthorized use of your account.'
          )}
        </p>
      </section>

      {/* Acceptable Use */}
      <section className="border-b border-(--mc-color-border) p-5 last:border-b-0 sm:p-6">
        <h3 className="mb-2 text-base font-semibold text-(--mc-color-text)">
          {t('3. Acceptable Use')}
        </h3>
        <p className="text-sm leading-7 text-(--mc-color-text-secondary)">
          {t(
            'You agree not to use RefLab for any unlawful purpose or in any way that could damage, disable, or impair the platform. You must not attempt to gain unauthorized access to any part of the service, other accounts, or any systems or networks connected to our servers.'
          )}
        </p>
      </section>

      {/* Intellectual Property */}
      <section className="border-b border-(--mc-color-border) p-5 last:border-b-0 sm:p-6">
        <h3 className="mb-2 text-base font-semibold text-(--mc-color-text)">
          {t('4. Intellectual Property')}
        </h3>
        <p className="text-sm leading-7 text-(--mc-color-text-secondary)">
          {t(
            'All content, features, and functionality of RefLab, including but not limited to text, graphics, logos, and software, are the exclusive property of RefLab and are protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.'
          )}
        </p>
      </section>

      {/* Limitation of Liability */}
      <section className="border-b border-(--mc-color-border) p-5 last:border-b-0 sm:p-6">
        <h3 className="mb-2 text-base font-semibold text-(--mc-color-text)">
          {t('5. Limitation of Liability')}
        </h3>
        <p className="text-sm leading-7 text-(--mc-color-text-secondary)">
          {t(
            'RefLab shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use or inability to use the service. Our total liability for any claims arising from or related to the service shall not exceed the amount you have paid us in the twelve months preceding the claim.'
          )}
        </p>
      </section>
    </article>
  );
}
