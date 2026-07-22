/**
 * PoliciesPage — Main policies page with tabbed navigation.
 *
 * Renders three policy tabs (Privacy, Terms, Cookies) and allows
 * switching between them. The initial tab is set by the `defaultTab`
 * prop, which is driven by the route (/privacy, /terms, /cookies).
 *
 * This page is public (no auth required) and renders outside AppShell,
 * so it includes its own minimal header with a back-to-home link.
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, Cookie, ScrollText, ShieldCheck } from 'lucide-react';
import PrivacyPolicyTab from './PrivacyPolicyTab';
import TermsOfServiceTab from './TermsOfServiceTab';
import CookiesPolicyTab from './CookiesPolicyTab';
import { useTranslation } from 'react-i18next';

type PolicyTab = 'privacy' | 'terms' | 'cookies';

interface PoliciesPageProps {
  defaultTab: PolicyTab;
}

const TABS: Array<{
  id: PolicyTab;
  label: string;
  to: string;
  icon: typeof ShieldCheck;
}> = [
  { id: 'privacy', label: 'Privacy Policy', to: '/privacy', icon: ShieldCheck },
  { id: 'terms', label: 'Terms of Service', to: '/terms', icon: ScrollText },
  { id: 'cookies', label: 'Cookies Policy', to: '/cookies', icon: Cookie },
];

/** Tab navigation bar — follows the LearnNav pattern */
function PoliciesNav({
  activeTab,
}: {
  activeTab: PolicyTab;
}) {
  const { t } = useTranslation();

  return (
    <nav
      className="no-scrollbar overflow-x-auto"
      aria-label={t('Policy sections')}
    >
      <div className="flex min-w-max gap-2 rounded-(--mc-radius-card) border border-(--mc-color-border) bg-(--mc-color-surface) p-1.5 sm:min-w-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
          <Link
            key={tab.id}
            to={tab.to}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-(--mc-radius-button) px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) ${
              activeTab === tab.id
                ? 'bg-(--mc-color-accent) text-(--mc-color-canvas) shadow-sm'
                : 'text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)'
            }`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <Icon className="size-4" aria-hidden="true" />
            {t(tab.label)}
          </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function PoliciesPage({ defaultTab }: PoliciesPageProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-(--mc-color-canvas) pb-16 text-(--mc-color-text)">
      <header className="border-b border-(--mc-color-border) bg-(--mc-color-surface)">
        <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-(--mc-radius-button) text-sm font-medium text-(--mc-color-text-secondary) transition-colors hover:text-(--mc-color-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus)"
            aria-label={t('Back to Home')}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t('Back to Home')}
          </Link>
          <span className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight" aria-label="RefLab">
            <span className="h-5 w-1.5 -skew-x-12 bg-(--mc-color-accent)" aria-hidden="true" />
            <span className="h-5 w-1.5 -skew-x-12 bg-(--mc-color-danger)" aria-hidden="true" />
            RefLab
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12">
        <div className="mb-6">
          <p className="mc-eyebrow mb-2">RefLab</p>
          <h1 className="mc-page-title">{t('Legal')}</h1>
          <p className="mt-2 text-sm leading-6 text-(--mc-color-text-muted)">
            {t('Review our policies and terms')}
          </p>
        </div>

        <PoliciesNav activeTab={defaultTab} />

        <main className="mt-6" tabIndex={-1}>
          {defaultTab === 'privacy' && <PrivacyPolicyTab />}
          {defaultTab === 'terms' && <TermsOfServiceTab />}
          {defaultTab === 'cookies' && <CookiesPolicyTab />}
        </main>
      </div>
    </div>
  );
}
