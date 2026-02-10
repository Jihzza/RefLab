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
    <div className="min-h-screen bg-(--bg-primary) flex flex-col">
      {/* Fixed header */}
      <Header
        onMenuToggle={() => setIsSidebarOpen((prev) => !prev)}
        onMenuClose={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar overlay */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main content area: offset for fixed header (pt-16) and bottom nav (pb-16) */}
      <main className="flex-1 pt-16 pb-16">
        <Outlet />
      </main>

      {/* Fixed bottom navigation */}
      <BottomNav />
    </div>
  );
}
