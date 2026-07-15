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

import { useRef, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Cookie, FileText, ShieldCheck } from 'lucide-react';
import BannerLogo from '@/assets/logos/Banner-RefLab-No-BG.svg';
import PrivacyPolicyTab from './PrivacyPolicyTab';
import TermsOfServiceTab from './TermsOfServiceTab';
import CookiesPolicyTab from './CookiesPolicyTab';
import { useTranslation } from 'react-i18next';

type PolicyTab = 'privacy' | 'terms' | 'cookies';

interface PoliciesPageProps {
  defaultTab: PolicyTab;
}

const POLICY_TABS = [
  {
    value: 'privacy',
    label: 'Privacy Policy',
    path: '/privacy',
    icon: ShieldCheck,
  },
  {
    value: 'terms',
    label: 'Terms of Service',
    path: '/terms',
    icon: FileText,
  },
  {
    value: 'cookies',
    label: 'Cookies Policy',
    path: '/cookies',
    icon: Cookie,
  },
] as const satisfies ReadonlyArray<{
  value: PolicyTab;
  label: string;
  path: string;
  icon: typeof ShieldCheck;
}>;

/** Tab navigation bar — follows the LearnNav pattern */
function PoliciesNav({
  activeTab,
}: {
  activeTab: PolicyTab;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLAnchorElement>, index: number) {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + POLICY_TABS.length) % POLICY_TABS.length;
    } else if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % POLICY_TABS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = POLICY_TABS.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = POLICY_TABS[nextIndex];
    if (!nextTab) return;

    navigate(nextTab.path);
    window.requestAnimationFrame(() => linkRefs.current[nextIndex]?.focus());
  }

  return (
    <nav
      role="tablist"
      aria-orientation="horizontal"
      aria-label={t('Policy sections')}
      className="grid grid-cols-3 gap-1 rounded-(--mc-radius-card) border border-(--mc-color-border) bg-(--mc-color-surface)/95 p-1.5 shadow-(--mc-shadow-soft) backdrop-blur-sm"
    >
      {POLICY_TABS.map((tab, index) => {
        const active = activeTab === tab.value;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.value}
            ref={(node) => {
              linkRefs.current[index] = node;
            }}
            id={`policy-tab-${tab.value}`}
            to={tab.path}
            role="tab"
            aria-selected={active}
            aria-controls="policy-tab-panel"
            aria-current={active ? 'page' : undefined}
            tabIndex={active ? 0 : -1}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`mc-interactive mc-focus-ring flex min-h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-[calc(var(--mc-radius-card)-0.375rem)] px-1.5 py-2 text-center text-[0.6875rem] font-bold leading-tight sm:min-h-12 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm ${
              active
                ? 'bg-(--mc-color-accent) text-(--mc-color-canvas) shadow-(--mc-shadow-soft)'
                : 'text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)'
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span>{t(tab.label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function PoliciesPage({ defaultTab }: PoliciesPageProps) {
  const { t } = useTranslation();

  return (
    <div className="relative isolate min-h-dvh overflow-x-clip bg-(--mc-color-canvas) pb-[calc(4rem+var(--mc-safe-bottom))] text-(--mc-color-text)">
      <div
        aria-hidden="true"
        className="mc-pitch-lines pointer-events-none absolute -right-56 top-32 -z-10 size-[38rem] rotate-12 opacity-25 md:-right-16 md:size-[46rem]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_8%_4%,color-mix(in_srgb,var(--mc-color-accent)_10%,transparent),transparent_26rem),radial-gradient(circle_at_94%_80%,color-mix(in_srgb,var(--mc-color-danger)_6%,transparent),transparent_28rem)]"
      />

      <header className="sticky top-0 z-(--mc-z-header) border-b border-(--mc-color-border) bg-(--mc-color-canvas)/92 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            to="/"
            className="mc-focus-ring rounded-(--mc-radius-compact)"
            aria-label={t('Back to Home')}
          >
            <img
              src={BannerLogo}
              alt={t('RefLab - Referee Training Laboratory')}
              className="h-9 w-auto sm:h-10"
            />
          </Link>
          <Link
            to="/"
            className="mc-interactive mc-focus-ring inline-flex min-h-11 items-center gap-2 rounded-(--mc-radius-button) px-2.5 text-sm font-semibold text-(--mc-color-text-secondary) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text) sm:px-3"
            aria-label={t('Back to Home')}
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{t('Back to Home')}</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-6 sm:pt-10 lg:pt-12">
        <header className="mx-auto mb-7 max-w-3xl text-center sm:mb-9">
          <span aria-hidden="true" className="mc-brand-stripes mx-auto mb-5" />
          <h1 className="text-[clamp(2rem,8vw,3.5rem)] font-extrabold leading-none tracking-[-0.04em] text-(--mc-color-text)">
            {t('Legal')}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-(--mc-color-text-secondary) sm:text-base sm:leading-7">
            {t('Review our policies and terms')}
          </p>
        </header>

        <div className="mx-auto max-w-3xl">
          <PoliciesNav activeTab={defaultTab} />

          <main
            id="policy-tab-panel"
            role="tabpanel"
            aria-labelledby={`policy-tab-${defaultTab}`}
            tabIndex={0}
            className="mt-5 rounded-(--mc-radius-compact) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) focus-visible:ring-offset-4 focus-visible:ring-offset-(--mc-color-canvas) sm:mt-6"
          >
            {defaultTab === 'privacy' && <PrivacyPolicyTab />}
            {defaultTab === 'terms' && <TermsOfServiceTab />}
            {defaultTab === 'cookies' && <CookiesPolicyTab />}
          </main>
        </div>
      </div>
    </div>
  );
}
