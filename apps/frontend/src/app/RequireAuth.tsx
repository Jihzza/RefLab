import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/components/useAuth";
import { useTranslation } from "react-i18next";

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * Auth guard for protected routes.
 *
 * Checks auth state and:
 * 1. Shows skeleton while checking session
 * 2. Redirects to landing if unauthenticated
 * 3. Renders protected content if authenticated
 *
 * Note: Username gate (for username_missing) is handled separately
 * to allow users to reach the dashboard before completing onboarding.
 */
export default function RequireAuth({ children }: RequireAuthProps) {
  const { t } = useTranslation();
  const { authStatus } = useAuth();

  // While checking for existing session, show a loading skeleton
  if (authStatus === "checking_session") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">{t('Loading...')}</div>
      </div>
    );
  }

  // Not authenticated - silent redirect to landing
  if (authStatus === "unauthenticated" || authStatus === "error") {
    return <Navigate to="/" replace />;
  }

  // User is authenticated - render the protected content
  return <>{children}</>;
}
