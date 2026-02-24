import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/components/useAuth";
import { useTranslation } from "react-i18next";

interface RequireGuestProps {
  children: ReactNode;
}

/**
 * Guest guard for public-only routes.
 *
 * Checks auth state and:
 * 1. Shows skeleton while checking session
 * 2. Redirects to dashboard if authenticated
 * 3. Renders public content if unauthenticated
 */
export default function RequireGuest({ children }: RequireGuestProps) {
  const { t } = useTranslation();
  const { authStatus } = useAuth();

  if (authStatus === "checking_session") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">{t('Loading...')}</div>
      </div>
    );
  }

  if (authStatus === "authenticated") {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}
