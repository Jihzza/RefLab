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
import { ArrowLeft } from 'lucide-react';
import PrivacyPolicyTab from './PrivacyPolicyTab';
import TermsOfServiceTab from './TermsOfServiceTab';
import CookiesPolicyTab from './CookiesPolicyTab';

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
  const tabs: PolicyTab[] = ['privacy', 'terms', 'cookies'];

  return (
    <nav
      className="border-b border-(--border-subtle) mb-6 -mx-4 px-4"
      aria-label="Policy sections"
    >
      <div className="flex overflow-x-auto no-scrollbar py-3 gap-4 md:justify-center">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-3 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab
                ? 'border-(--text-primary) text-(--text-primary)'
                : 'border-transparent text-(--text-muted) hover:text-(--text-secondary)'
            }`}
            aria-current={activeTab === tab ? 'page' : undefined}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default function PoliciesPage({ defaultTab }: PoliciesPageProps) {
  const [activeTab, setActiveTab] = useState<PolicyTab>(defaultTab);

  return (
    <div className="min-h-screen bg-(--bg-primary) pb-24">
      <div className="px-4 max-w-3xl mx-auto pt-6">
        {/* Back to home link (since this page has no AppShell navigation) */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-(--text-muted) hover:text-(--text-primary) transition-colors mb-6"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Page title */}
        <h1 className="text-2xl font-bold text-(--text-primary) text-center mb-2">
          Legal
        </h1>
        <p className="text-sm text-(--text-muted) text-center mb-6">
          Review our policies and terms
        </p>

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
