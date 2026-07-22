/**
 * FooterSection — Landing page footer with legal policy links.
 *
 * Renders links to Privacy Policy, Terms of Service, and Cookies Policy
 * pages using React Router for SPA navigation.
 */

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const FOOTER_LINKS = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Cookies Policy', to: '/cookies' },
];

export default function FooterSection() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-(--mc-color-border) bg-(--mc-color-canvas)/75 px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-[82rem] flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
        <nav aria-label={t('Legal')} className="flex flex-wrap justify-center gap-x-5 gap-y-2 sm:justify-start">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="mc-focus-ring rounded-md text-sm font-medium text-(--mc-color-text-muted) transition-colors hover:text-(--mc-color-accent)"
            >
              {t(link.label)}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-(--mc-color-text-muted)">
          {t('© {{year}} RefLab. All rights reserved.', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
