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
    <article className="space-y-4">
      {/* Header */}
      <section className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5">
        <h2 className="text-lg font-semibold text-(--text-primary) mb-1">
          {t('Terms of Service')}
        </h2>
        <p className="text-xs text-(--text-muted)">{t('Last updated: February 2026')}</p>
      </section>

      {/* Acceptance of Terms */}
      <section className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5">
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          1. Acceptance of Terms
        </h3>
        <p className="text-sm text-(--text-secondary) leading-relaxed">
          By accessing or using RefLab, you agree to be bound by these Terms of Service.
          If you do not agree to all the terms and conditions, you may not access or use
          our services. We reserve the right to update these terms at any time, and
          continued use of the platform constitutes acceptance of the updated terms.
        </p>
      </section>

      {/* User Accounts */}
      <section className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5">
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          2. User Accounts
        </h3>
        <p className="text-sm text-(--text-secondary) leading-relaxed">
          You are responsible for maintaining the confidentiality of your account
          credentials and for all activities that occur under your account. You must
          provide accurate and complete information during registration and keep your
          account information up to date. You must notify us immediately of any
          unauthorized use of your account.
        </p>
      </section>

      {/* Acceptable Use */}
      <section className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5">
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          3. Acceptable Use
        </h3>
        <p className="text-sm text-(--text-secondary) leading-relaxed">
          You agree not to use RefLab for any unlawful purpose or in any way that could
          damage, disable, or impair the platform. You must not attempt to gain
          unauthorized access to any part of the service, other accounts, or any systems
          or networks connected to our servers.
        </p>
      </section>

      {/* Intellectual Property */}
      <section className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5">
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          4. Intellectual Property
        </h3>
        <p className="text-sm text-(--text-secondary) leading-relaxed">
          All content, features, and functionality of RefLab, including but not limited
          to text, graphics, logos, and software, are the exclusive property of RefLab
          and are protected by intellectual property laws. You may not reproduce,
          distribute, or create derivative works without our express written permission.
        </p>
      </section>

      {/* Limitation of Liability */}
      <section className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5">
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          5. Limitation of Liability
        </h3>
        <p className="text-sm text-(--text-secondary) leading-relaxed">
          RefLab shall not be liable for any indirect, incidental, special, or
          consequential damages resulting from your use or inability to use the service.
          Our total liability for any claims arising from or related to the service shall
          not exceed the amount you have paid us in the twelve months preceding the claim.
        </p>
      </section>
    </article>
  );
}
