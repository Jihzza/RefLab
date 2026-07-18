/**
 * PrivacyPolicyTab — Privacy policy content section.
 *
 * Renders the complete privacy policy in semantic editorial sections.
 * Legal copy is translated verbatim through the existing i18n catalogue.
 */

import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PolicyDocument, PolicySection } from './PolicyDocument';

export default function PrivacyPolicyTab() {
  const { t } = useTranslation();

  return (
    <PolicyDocument
      title={t('Privacy Policy')}
      lastUpdated={t('Last updated: July 18, 2026')}
      icon={<ShieldCheck className="size-6" />}
    >

      <PolicySection id="privacy-information-we-collect" title={t('1. Information We Collect')}>
        <p>
          {t(
            'RefLab handles account and profile information such as your name, email address, avatar and authentication provider. When you use the product, we also store the learning answers, sessions and progress needed to show your results.'
          )}
        </p>
        <p>
          {t(
            'Community and communication features may process posts, comments, follows, blocks, reports, direct messages and media you choose to share. Billing records may include Stripe customer and subscription references, plan status and invoice information when billing is available.'
          )}
        </p>
        <p>
          {t(
            'When you contact support, we collect the selected topic, your reply email, your message, the page path and your name if provided. Our hosting, authentication and security providers may also process request, device, network and diagnostic data needed to deliver and protect the service. A support submission does not prove account ownership; identity-sensitive requests require a separate verification step.'
          )}
        </p>
      </PolicySection>

      <PolicySection id="privacy-how-we-use-information" title={t('2. How We Use Your Information')}>
        <p>
          {t(
            'We use this information to authenticate users, provide learning progress, deliver community and messaging features, respond to support requests, protect accounts and the service, meet legal obligations and, when enabled, administer billing. RefLab does not currently use optional analytics or advertising tracking.'
          )}
        </p>
      </PolicySection>

      <PolicySection id="privacy-processors" title={t('3. Service Providers and Disclosures')}>
        <p>
          {t(
            'RefLab does not sell personal information. Supabase provides database, authentication, storage, realtime and server functions; Netlify provides hosting and support-form processing; Stripe provides billing when you open a billing flow; and Google provides authentication only when you choose Google sign-in. These providers process information under their own terms and our applicable service arrangements.'
          )}
        </p>
        <p>
          {t(
            'We may disclose information when reasonably necessary to comply with law, protect users or the service, investigate abuse, or establish and defend legal claims. External learning links, including official IFAB resources, take you to services governed by their own privacy notices.'
          )}
        </p>
      </PolicySection>

      <PolicySection id="privacy-retention-security" title={t('4. Retention and Security')}>
        <p>
          {t(
            'We keep information for as long as needed to operate your account and the features you use, then delete or de-identify it according to applicable legal, security and provider-backup requirements. Some records may be retained for fraud prevention, dispute handling or compliance. Clearing browser storage removes local copies but does not by itself delete server records.'
          )}
        </p>
        <p>
          {t(
            'We use access controls, encrypted connections and provider security controls intended to protect information. No online service can guarantee absolute security, so please use a unique password and report suspected account compromise promptly.'
          )}
        </p>
      </PolicySection>

      <PolicySection id="privacy-your-rights" title={t('5. Your Choices and Rights')}>
        <p>
          {t(
            'Depending on where you live, you may have rights to access, correct, delete or receive a copy of personal information, and to object to or restrict certain processing. You can update available profile fields or start account deletion in Settings. Other requests can be made through support and may require identity verification. Applicable legal exceptions may limit a request.'
          )}
        </p>
      </PolicySection>

      <PolicySection id="privacy-contact" title={t('6. Contact Us')}>
        <p>
          {t('For privacy questions or data-rights requests, use our support form.')}{' '}
          <Link
            to="/support?topic=privacy"
            className="mc-focus-ring rounded-sm font-semibold text-(--mc-color-info) underline decoration-(--mc-color-info)/45 underline-offset-4 hover:decoration-(--mc-color-info)"
          >
            {t('Contact privacy support')}
          </Link>
        </p>
      </PolicySection>
    </PolicyDocument>
  );
}
