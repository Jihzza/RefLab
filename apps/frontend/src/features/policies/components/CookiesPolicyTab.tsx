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
      lastUpdated={t('Last updated: July 18, 2026')}
      icon={<Cookie className="size-6" />}
    >

      <PolicySection id="cookies-browser-storage" title={t('1. Cookies and Browser Storage')}>
        <p>
          {t(
            'Web applications can use cookies, local storage and IndexedDB to keep sessions secure, remember local preferences and make features more resilient. These technologies store small amounts of data in your browser or device.'
          )}
        </p>
      </PolicySection>

      <PolicySection id="cookies-we-use" title={t('2. Storage RefLab Uses')}>
        <p className="mb-4">
          {t('RefLab currently uses essential and functional browser storage for:')}
        </p>
        <ul className="space-y-3">
          <li className="flex gap-3 rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas)/65 px-4 py-3">
            <span className="mt-[0.65rem] size-1.5 shrink-0 rounded-full bg-(--mc-color-accent)" aria-hidden="true" />
            <span>
              <strong className="font-bold text-(--mc-color-text)">{t('Authentication and security:')}</strong>{' '}
              {t('Supabase authentication stores the session needed to keep you signed in and protect authenticated requests.')}
            </span>
          </li>
          <li className="flex gap-3 rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas)/65 px-4 py-3">
            <span className="mt-[0.65rem] size-1.5 shrink-0 rounded-full bg-(--mc-color-accent)" aria-hidden="true" />
            <span>
              <strong className="font-bold text-(--mc-color-text)">{t('Preferences and resilience:')}</strong>{' '}
              {t('Language, recent searches, this notice acknowledgement and temporary offline or cleanup queues may be stored locally on your device.')}
            </span>
          </li>
        </ul>
      </PolicySection>

      <PolicySection id="cookies-optional" title={t('3. Optional Tracking')}>
        <p>
          {t(
            'RefLab does not currently enable optional analytics or advertising cookies. If that changes, we will update this policy and provide the required controls before optional tracking is activated.'
          )}
        </p>
      </PolicySection>

      <PolicySection id="cookies-third-party" title={t('4. Third-Party Services')}>
        <p>
          {t(
            'When you choose Google sign-in, open Stripe billing or follow an external learning resource, that provider may use cookies or storage on its own domain under its own policy.'
          )}
        </p>
      </PolicySection>

      <PolicySection id="cookies-managing" title={t('5. Managing Browser Data')}>
        <p>
          {t(
            'You can inspect or clear browser data through your browser settings. Clearing essential storage may sign you out, reset local preferences or remove actions waiting to be retried while offline.'
          )}
        </p>
      </PolicySection>
    </PolicyDocument>
  );
}
