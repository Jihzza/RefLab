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
      lastUpdated={t('Last updated: July 18, 2026')}
      icon={<FileText className="size-6" />}
    >

      <PolicySection id="terms-acceptance" title={t('1. Acceptance of Terms')}>
        <p>
          {t(
            'You must explicitly accept the current version of these Terms before using protected RefLab features. If we make a substantive change, we will present a new version for acceptance; continued use alone does not accept a new version. If you do not agree, do not create an account or continue into the protected service.'
          )}
        </p>
      </PolicySection>

      <PolicySection id="terms-learning-service" title={t('2. Learning Service and Official Sources')}>
        <p>
          {t(
            'RefLab is an independent learning and practice tool. It is not affiliated with, endorsed by, or an official product of The IFAB, FIFA or any football association. RefLab exercises and progress indicators do not replace the current official Laws of the Game, competition rules, instructions from the relevant authority or professional training. Check the linked official sources when accuracy is critical.'
          )}
        </p>
      </PolicySection>

      <PolicySection id="terms-user-accounts" title={t('3. User Accounts')}>
        <p>
          {t(
            'You must be legally able to enter this agreement, provide accurate registration information, protect your credentials and promptly report suspected unauthorized access. You are responsible for activity performed through your account unless applicable law provides otherwise. Do not create or use an account on behalf of another person without authority.'
          )}
        </p>
      </PolicySection>

      <PolicySection id="terms-community" title={t('4. Acceptable Use and Community Content')}>
        <p>
          {t(
            'Do not use RefLab for unlawful, deceptive, abusive, harassing, hateful or infringing activity; spam or impersonation; distributing malware; exploiting another person; or attempting to bypass access controls, disrupt the service or obtain unauthorized access. Reports may be reviewed and content or accounts may be restricted when reasonably necessary to enforce these Terms, protect users or comply with law.'
          )}
        </p>
        <p>
          {t(
            'You keep ownership of content you submit and confirm that you have the rights needed to share it. You grant RefLab a limited, non-exclusive licence to host, copy, process and display that content only as needed to operate, secure and improve the features you use. Removing content or deleting an account may not remove copies already received by other users or retained where legally necessary.'
          )}
        </p>
      </PolicySection>

      <PolicySection id="terms-intellectual-property" title={t('5. RefLab and Third-Party Materials')}>
        <p>
          {t(
            'The RefLab software, interface and brand are protected by applicable intellectual-property laws, except for material identified as belonging to others. Official Laws resources, names, logos and linked third-party content remain the property of their respective owners and are governed by their terms. A link does not imply affiliation or endorsement.'
          )}
        </p>
      </PolicySection>

      <PolicySection id="terms-plans-billing" title={t('6. Plans, Billing and Consumer Rights')}>
        <p>
          {t(
            'RefLab currently launches with a Free plan. If paid plans are offered later, the price, currency, billing period and material conditions will be shown before purchase and Stripe will process payment. Available cancellation, renewal, refund and withdrawal rights depend on the offer and applicable law; nothing in these Terms removes mandatory consumer rights.'
          )}
        </p>
      </PolicySection>

      <PolicySection id="terms-availability-deletion" title={t('7. Availability, Suspension and Account Deletion')}>
        <p>
          {t(
            'We may maintain, change or discontinue features and may restrict access where reasonably necessary for security, legal compliance or a material breach of these Terms. Where appropriate, you may contact support to challenge a restriction. You can start account deletion in Settings; completion may be delayed only for permitted security, legal, dispute or provider-backup reasons.'
          )}
        </p>
      </PolicySection>

      <PolicySection id="terms-liability" title={t('8. Service Responsibility')}>
        <p>
          {t(
            'RefLab is provided with reasonable care but may not always be uninterrupted, error-free or current. You remain responsible for checking official rules and making your own refereeing or professional decisions. Nothing in these Terms excludes or limits liability, warranties or remedies that cannot lawfully be excluded or limited.'
          )}
        </p>
      </PolicySection>

      <PolicySection id="terms-contact" title={t('9. Contact and Questions')}>
        <p>
          {t(
            'Questions about these Terms, account restrictions or the service can be submitted through the RefLab support form. Identity-sensitive requests may require a separate verification step.'
          )}
        </p>
      </PolicySection>
    </PolicyDocument>
  );
}
