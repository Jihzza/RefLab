/**
 * PrivacyPolicyTab — Privacy policy content section.
 *
 * Renders the complete privacy policy in semantic editorial sections.
 * Legal copy is translated verbatim through the existing i18n catalogue.
 */

import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PolicyDocument, PolicySection } from './PolicyDocument';

export default function PrivacyPolicyTab() {
  const { t } = useTranslation();

  return (
    <PolicyDocument
      title={t('Privacy Policy')}
      lastUpdated={t('Last updated: February 2026')}
      icon={<ShieldCheck className="size-6" />}
    >

      {/* Information We Collect */}
      <PolicySection id="privacy-information-we-collect" title={t('1. Information We Collect')}>
        <p>
          {t(
            'We collect information you provide directly, such as your name, email address, and profile details when you create an account. We also collect usage data automatically, including pages visited, features used, and interaction patterns to improve our services.'
          )}
        </p>
      </PolicySection>

      {/* How We Use Your Information */}
      <PolicySection id="privacy-how-we-use-information" title={t('2. How We Use Your Information')}>
        <p>
          {t(
            'Your information is used to provide and maintain our services, personalize your experience, communicate important updates, and ensure account security. We may also use aggregated, anonymized data for analytics and service improvements.'
          )}
        </p>
      </PolicySection>

      {/* Data Sharing */}
      <PolicySection id="privacy-data-sharing" title={t('3. Data Sharing')}>
        <p>
          {t(
            'We do not sell your personal information. We may share data with trusted third-party service providers who assist in operating our platform, subject to strict confidentiality agreements. We may also disclose information when required by law or to protect our rights.'
          )}
        </p>
      </PolicySection>

      {/* Your Rights */}
      <PolicySection id="privacy-your-rights" title={t('4. Your Rights')}>
        <p>
          {t(
            'You have the right to access, update, or delete your personal information at any time through your account settings. You may also request a copy of your data or opt out of certain data processing activities by contacting our support team.'
          )}
        </p>
      </PolicySection>

      {/* Contact */}
      <PolicySection id="privacy-contact" title={t('5. Contact Us')}>
        <p>
          {t('If you have any questions about this Privacy Policy, please contact us at')}{' '}
          <a
            href="mailto:privacy@reflab.com"
            className="mc-focus-ring rounded-sm font-semibold text-(--mc-color-info) underline decoration-(--mc-color-info)/45 underline-offset-4 hover:decoration-(--mc-color-info)"
          >
            privacy@reflab.com
          </a>
          .
        </p>
      </PolicySection>
    </PolicyDocument>
  );
}
