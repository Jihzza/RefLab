/**
 * CookiesPolicyTab — Cookies policy content section.
 *
 * Renders placeholder cookies policy text as readable long-form prose
 * inside a single console card, with numbered sections and dividers.
 */

import { useTranslation } from 'react-i18next';

export default function CookiesPolicyTab() {
  const { t } = useTranslation();

  return (
    <article className="card-console p-6 sm:p-8 animate-fade-in">
      {/* Header */}
      <header className="pb-5 mb-6 border-b border-(--border-subtle)">
        <h2 className="text-xl font-bold text-(--text-primary)">
          {t('Cookies Policy')}
        </h2>
        <p className="text-xs text-(--text-muted) mt-1.5">{t('Last updated: February 2026')}</p>
      </header>

      <div className="space-y-7 max-w-prose">
        {/* What Are Cookies */}
        <section>
          <h3 className="text-base font-semibold text-(--text-primary) mb-2">
            {t('1. What Are Cookies')}
          </h3>
          <p className="text-[15px] text-(--text-secondary) leading-relaxed">
            {t(
              'Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work more efficiently and to provide information to the site owners. Cookies help us remember your preferences and improve your browsing experience.'
            )}
          </p>
        </section>

        {/* Cookies We Use */}
        <section>
          <h3 className="text-base font-semibold text-(--text-primary) mb-2">
            {t('2. Cookies We Use')}
          </h3>
          <p className="text-[15px] text-(--text-secondary) leading-relaxed mb-3">
            {t('We use the following types of cookies on RefLab:')}
          </p>
          <ul className="space-y-3 text-[15px] text-(--text-secondary) leading-relaxed">
            <li className="flex gap-2.5">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-(--brand-yellow) shrink-0" aria-hidden="true" />
              <span>
                <strong className="text-(--text-primary) font-semibold">{t('Essential cookies:')}</strong>{' '}
                {t('Required for the platform to function, including authentication and session management.')}
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-(--brand-yellow) shrink-0" aria-hidden="true" />
              <span>
                <strong className="text-(--text-primary) font-semibold">{t('Preference cookies:')}</strong>{' '}
                {t('Remember your settings and preferences to provide a personalized experience.')}
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-(--brand-yellow) shrink-0" aria-hidden="true" />
              <span>
                <strong className="text-(--text-primary) font-semibold">{t('Analytics cookies:')}</strong>{' '}
                {t('Help us understand how visitors interact with the platform so we can improve our services.')}
              </span>
            </li>
          </ul>
        </section>

        {/* Managing Cookies */}
        <section>
          <h3 className="text-base font-semibold text-(--text-primary) mb-2">
            {t('3. Managing Cookies')}
          </h3>
          <p className="text-[15px] text-(--text-secondary) leading-relaxed">
            {t(
              'You can manage your cookie preferences through the cookie consent banner that appears when you first visit RefLab. You can also control cookies through your browser settings. Please note that disabling essential cookies may affect the functionality of the platform.'
            )}
          </p>
        </section>

        {/* Third-Party Cookies */}
        <section>
          <h3 className="text-base font-semibold text-(--text-primary) mb-2">
            {t('4. Third-Party Cookies')}
          </h3>
          <p className="text-[15px] text-(--text-secondary) leading-relaxed">
            {t(
              "Some cookies on our platform are set by third-party services that appear on our pages. We do not control these cookies. Third-party providers include analytics and authentication services. Please refer to each provider's privacy policy for more information on how they use cookies."
            )}
          </p>
        </section>
      </div>
    </article>
  );
}
