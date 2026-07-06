import { useState, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import PageFallback from "@/components/ui/PageFallback";

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
  const location = useLocation();

  return (
    // Transparent wrapper lets the body atmosphere (radial glows + tactics grid)
    // show through; a whisper-thin gradient adds vertical depth without hiding it.
    <div className="min-h-screen flex flex-col bg-transparent bg-gradient-to-b from-transparent via-transparent to-(--bg-base)/40">
      {/* Fixed header */}
      <Header
        onMenuToggle={() => setIsSidebarOpen((prev) => !prev)}
        onMenuClose={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar overlay */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main content area: offset for fixed header (pt-16) and bottom nav (pb-16).
          Keyed on pathname so a gentle fade-in plays on every route change. */}
      <main className="flex-1 pt-16 pb-16">
        <Suspense fallback={<PageFallback />}>
          <div key={location.pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </Suspense>
      </main>

      {/* Fixed bottom navigation */}
      <BottomNav />
    </div>
  );
}
