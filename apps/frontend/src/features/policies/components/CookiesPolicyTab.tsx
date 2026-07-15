/**
 * CookiesPolicyTab — Cookies policy content section.
 *
 * Renders the complete cookies policy in semantic editorial sections.
 * Legal copy is translated verbatim through the existing i18n catalogue.
 */

import { Cookie } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PolicyDocument, PolicySection } from './PolicyDocument';

export default function CookiesPolicyTab() {
  const { t } = useTranslation();

  return (
    <PolicyDocument
      title={t('Cookies Policy')}
      lastUpdated={t('Last updated: February 2026')}
      icon={<Cookie className="size-6" />}
    >

      {/* What Are Cookies */}
      <PolicySection id="cookies-what-are-cookies" title={t('1. What Are Cookies')}>
        <p>
          {t(
            'Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work more efficiently and to provide information to the site owners. Cookies help us remember your preferences and improve your browsing experience.'
          )}
        </p>
      </PolicySection>

      {/* Cookies We Use */}
      <PolicySection id="cookies-we-use" title={t('2. Cookies We Use')}>
        <p className="mb-4">
          {t('We use the following types of cookies on RefLab:')}
        </p>
        <ul className="space-y-3">
          <li className="flex gap-3 rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas)/65 px-4 py-3">
            <span className="mt-[0.65rem] size-1.5 shrink-0 rounded-full bg-(--mc-color-accent)" aria-hidden="true" />
            <span>
              <strong className="font-bold text-(--mc-color-text)">{t('Essential cookies:')}</strong>{' '}
              {t('Required for the platform to function, including authentication and session management.')}
            </span>
          </li>
          <li className="flex gap-3 rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas)/65 px-4 py-3">
            <span className="mt-[0.65rem] size-1.5 shrink-0 rounded-full bg-(--mc-color-accent)" aria-hidden="true" />
            <span>
              <strong className="font-bold text-(--mc-color-text)">{t('Preference cookies:')}</strong>{' '}
              {t('Remember your settings and preferences to provide a personalized experience.')}
            </span>
          </li>
          <li className="flex gap-3 rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas)/65 px-4 py-3">
            <span className="mt-[0.65rem] size-1.5 shrink-0 rounded-full bg-(--mc-color-accent)" aria-hidden="true" />
            <span>
              <strong className="font-bold text-(--mc-color-text)">{t('Analytics cookies:')}</strong>{' '}
              {t('Help us understand how visitors interact with the platform so we can improve our services.')}
            </span>
          </li>
        </ul>
      </PolicySection>

      {/* Managing Cookies */}
      <PolicySection id="cookies-managing" title={t('3. Managing Cookies')}>
        <p>
          {t(
            'You can manage your cookie preferences through the cookie consent banner that appears when you first visit RefLab. You can also control cookies through your browser settings. Please note that disabling essential cookies may affect the functionality of the platform.'
          )}
        </p>
      </PolicySection>

      {/* Third-Party Cookies */}
      <PolicySection id="cookies-third-party" title={t('4. Third-Party Cookies')}>
        <p>
          {t(
            "Some cookies on our platform are set by third-party services that appear on our pages. We do not control these cookies. Third-party providers include analytics and authentication services. Please refer to each provider's privacy policy for more information on how they use cookies."
          )}
        </p>
      </PolicySection>
    </PolicyDocument>
  );
}
