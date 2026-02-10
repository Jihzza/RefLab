import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Layout - Root route wrapper.
 *
 * A simple pass-through for route nesting.
 * All authenticated layout (Header, Sidebar, BottomNav) is handled by AppShell.
 * Public routes (landing, reset-password, auth callback) render directly.
 */
export const Layout: React.FC = () => {
  return <Outlet />;
};
