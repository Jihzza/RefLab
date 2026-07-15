import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import {
  MatchHeader,
  MobileTabBar,
  ResponsiveRail,
  useMatchNavigationBadges,
} from "./shell";

/**
 * AppShell - Authenticated layout wrapper.
 *
 * Owns the Header, Sidebar, and BottomNav as direct children.
 * - Header is fixed at the top of the viewport.
 * - BottomNav is fixed at the bottom of the viewport.
 * - Sidebar slides in from the left (state managed here).
 * - Main content area sits between header and bottom nav,
 *   grows naturally when content is long.
 */
export default function AppShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const badges = useMatchNavigationBadges();

  return (
    <div className="mc-min-screen bg-(--bg-primary)">
      <ResponsiveRail badges={badges} />

      <MatchHeader
        onMenuToggle={() => setIsSidebarOpen((prev) => !prev)}
      />

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main
        id="app-content"
        className="min-h-screen pt-[calc(var(--mc-header-height)+var(--mc-safe-top))] pb-[calc(var(--mc-bottom-nav-height)+var(--mc-safe-bottom))] md:pl-20 md:pb-0 xl:pl-64"
      >
        <Outlet />
      </main>

      <MobileTabBar badges={badges} />
    </div>
  );
}
