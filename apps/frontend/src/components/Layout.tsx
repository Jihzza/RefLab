import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import PageFallback from '@/components/ui/PageFallback';

/**
 * Layout - Root route wrapper.
 *
 * A simple pass-through for route nesting.
 * All authenticated layout (Header, Sidebar, BottomNav) is handled by AppShell.
 * Public routes (landing, reset-password, auth callback) render directly.
 *
 * The Suspense boundary catches lazily-loaded public pages.
 */
export const Layout: React.FC = () => {
  return (
    <Suspense fallback={<PageFallback />}>
      <Outlet />
    </Suspense>
  );
};
