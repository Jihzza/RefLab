/**
 * TermsOfServiceTab — Terms of service content section.
 *
 * Renders the complete terms of service in semantic editorial sections.
 * Legal copy is translated verbatim through the existing i18n catalogue.
 */

import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PolicyDocument, PolicySection } from './PolicyDocument';

export default function TermsOfServiceTab() {
  const { t } = useTranslation();

  return (
    <PolicyDocument
      title={t('Terms of Service')}
      lastUpdated={t('Last updated: February 2026')}
      icon={<FileText className="size-6" />}
    >

      {/* Acceptance of Terms */}
      <PolicySection id="terms-acceptance" title={t('1. Acceptance of Terms')}>
        <p>
          {t(
            'By accessing or using RefLab, you agree to be bound by these Terms of Service. If you do not agree to all the terms and conditions, you may not access or use our services. We reserve the right to update these terms at any time, and continued use of the platform constitutes acceptance of the updated terms.'
          )}
        </p>
      </PolicySection>

      {/* User Accounts */}
      <PolicySection id="terms-user-accounts" title={t('2. User Accounts')}>
        <p>
          {t(
            'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information during registration and keep your account information up to date. You must notify us immediately of any unauthorized use of your account.'
          )}
        </p>
      </PolicySection>

      {/* Acceptable Use */}
      <PolicySection id="terms-acceptable-use" title={t('3. Acceptable Use')}>
        <p>
          {t(
            'You agree not to use RefLab for any unlawful purpose or in any way that could damage, disable, or impair the platform. You must not attempt to gain unauthorized access to any part of the service, other accounts, or any systems or networks connected to our servers.'
          )}
        </p>
      </PolicySection>

      {/* Intellectual Property */}
      <PolicySection id="terms-intellectual-property" title={t('4. Intellectual Property')}>
        <p>
          {t(
            'All content, features, and functionality of RefLab, including but not limited to text, graphics, logos, and software, are the exclusive property of RefLab and are protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.'
          )}
        </p>
      </PolicySection>

      {/* Limitation of Liability */}
      <PolicySection id="terms-liability" title={t('5. Limitation of Liability')}>
        <p>
          {t(
            'RefLab shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use or inability to use the service. Our total liability for any claims arising from or related to the service shall not exceed the amount you have paid us in the twelve months preceding the claim.'
          )}
        </p>
      </PolicySection>
    </PolicyDocument>
  );
}
