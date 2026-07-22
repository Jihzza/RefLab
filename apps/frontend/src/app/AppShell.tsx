import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

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

  return (
    <div className="mc-min-screen bg-(--mc-color-canvas) text-(--mc-color-text)">
      <Header
        onMenuToggle={() => setIsSidebarOpen((prev) => !prev)}
        onMenuClose={() => setIsSidebarOpen(false)}
        isMenuOpen={isSidebarOpen}
      />

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main
        id="app-content"
        className="min-h-dvh pt-[calc(var(--mc-header-height)+var(--mc-safe-top))] pb-[calc(var(--mc-bottom-nav-height)+var(--mc-safe-bottom))] md:pl-20 md:pb-0 xl:pl-64"
      >
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
