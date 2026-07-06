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

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Scale } from 'lucide-react';
import PrivacyPolicyTab from './PrivacyPolicyTab';
import TermsOfServiceTab from './TermsOfServiceTab';
import CookiesPolicyTab from './CookiesPolicyTab';
import { useTranslation } from 'react-i18next';

type PolicyTab = 'privacy' | 'terms' | 'cookies';

interface PoliciesPageProps {
  defaultTab: PolicyTab;
}

/** Tab labels for display */
const TAB_LABELS: Record<PolicyTab, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  cookies: 'Cookies Policy',
};

/** Tab navigation bar — follows the LearnNav pattern */
function PoliciesNav({
  activeTab,
  setActiveTab,
}: {
  activeTab: PolicyTab;
  setActiveTab: (tab: PolicyTab) => void;
}) {
  const { t } = useTranslation();
  const tabs: PolicyTab[] = ['privacy', 'terms', 'cookies'];

  return (
    <nav
      className="mb-6"
      aria-label={t('Policy sections')}
    >
      <div className="flex overflow-x-auto no-scrollbar gap-1.5 p-1 rounded-(--radius-pill) bg-(--bg-surface-2) border border-(--border-subtle) md:justify-center">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-4 py-2 text-sm font-semibold rounded-(--radius-pill) transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'bg-(--brand-yellow) text-(--bg-primary) shadow-[0_4px_14px_-4px_rgba(246,194,28,0.55)]'
                : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-hover)'
            }`}
            aria-current={activeTab === tab ? 'page' : undefined}
          >
            {t(TAB_LABELS[tab])}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default function PoliciesPage({ defaultTab }: PoliciesPageProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PolicyTab>(defaultTab);

  return (
    <div className="min-h-screen bg-(--bg-primary) pb-24">
      <div className="px-4 max-w-3xl mx-auto pt-6">
        {/* Back to home link (since this page has no AppShell navigation) */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-(--text-muted) hover:text-(--text-primary) transition-colors mb-6"
          aria-label={t('Back to Home')}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('Back to Home')}
        </Link>

        {/* Page title */}
        <div className="flex flex-col items-center text-center mb-8">
          <span
            className="w-12 h-12 rounded-(--radius-card) bg-(--bg-surface-2) border border-(--border-subtle) flex items-center justify-center mb-4"
            aria-hidden="true"
          >
            <Scale className="w-6 h-6 text-(--brand-yellow)" />
          </span>
          <span className="eyebrow mb-2">{t('RefLab')}</span>
          <h1 className="text-display-sm text-(--text-primary)">
            {t('Legal')}
          </h1>
          <p className="text-sm text-(--text-muted) mt-2">
            {t('Review our policies and terms')}
          </p>
        </div>

        {/* Tab navigation */}
        <PoliciesNav activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Tab content */}
        <main>
          {activeTab === 'privacy' && <PrivacyPolicyTab />}
          {activeTab === 'terms' && <TermsOfServiceTab />}
          {activeTab === 'cookies' && <CookiesPolicyTab />}
        </main>
      </div>
    </div>
  );
}
