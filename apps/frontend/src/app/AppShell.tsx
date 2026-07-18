import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/features/auth/components/useAuth";
import {
  MatchHeader,
  MobileTabBar,
  ResponsiveRail,
  useMatchNavigationBadges,
} from "./shell";

/**
 * AppShell - Authenticated layout wrapper.
 *
 * Owns the responsive Match Control navigation around each private route.
 * - MatchHeader is fixed at the top of compact viewports.
 * - MobileTabBar is fixed at the bottom of compact viewports.
 * - ResponsiveRail provides the desktop navigation.
 * - Sidebar slides in from the left (state managed here).
 * - Main content area sits between header and bottom nav,
 *   grows naturally when content is long.
 */
export default function AppShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const badges = useMatchNavigationBadges();
  const { t } = useTranslation();
  const { accountDeletionPending } = useAuth();

  return (
    <div className="mc-min-screen bg-(--bg-primary)">
      <ResponsiveRail badges={badges} />

      <MatchHeader
        onMenuToggle={() => setIsSidebarOpen((prev) => !prev)}
        menuOpen={isSidebarOpen}
      />

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main
        id="app-content"
        className="min-h-dvh pt-[calc(var(--mc-header-height)+var(--mc-safe-top))] pb-[calc(var(--mc-bottom-nav-height)+var(--mc-safe-bottom))] md:pl-20 md:pb-0 xl:pl-64"
      >
        {accountDeletionPending && (
          <div role="status" className="border-b border-(--mc-color-warning)/35 bg-(--mc-color-warning)/10 px-4 py-3 text-sm text-(--mc-color-text) sm:px-6">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
              <span>{t('Account deletion is waiting for a confirmed server response. Messaging is paused on this device.')}</span>
              <Link className="font-bold text-(--mc-color-accent) underline underline-offset-4" to="/app/settings">
                {t('Review and retry')}
              </Link>
            </div>
          </div>
        )}
        <Outlet />
      </main>

      <MobileTabBar badges={badges} />
    </div>
  );
}
