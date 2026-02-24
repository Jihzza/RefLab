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
    <footer className="border-t border-(--border-subtle) mt-8 py-6 px-6">
      <div className="max-w-xl mx-auto text-center">
        {/* Policy links */}
        <nav aria-label={t('Legal')} className="flex flex-wrap justify-center gap-4 mb-4">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm text-(--text-muted) hover:text-(--text-secondary) transition-colors"
            >
              {t(link.label)}
            </Link>
          ))}
        </nav>

        {/* Copyright */}
        <p className="text-xs text-(--text-muted)">
          {t('© {{year}} RefLab. All rights reserved.', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
