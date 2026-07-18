import { Fragment, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/components/useAuth";
import {
  buildAuthLandingUrl,
  buildLegalAcceptanceUrl,
  sanitizeAuthReturnTo,
} from "@/features/auth/utils/authNavigation";
import { useTranslation } from "react-i18next";
import { LoaderCircle } from "lucide-react";

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
  const { user, authStatus, legalAcceptanceStatus } = useAuth();
  const location = useLocation();

  const returnTo = sanitizeAuthReturnTo(
    `${location.pathname}${location.search}${location.hash}`,
  );

  // While checking for existing session, show a loading skeleton
  if (
    authStatus === "checking_session"
    || (authStatus === "authenticated" && legalAcceptanceStatus === "loading")
  ) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-(--mc-color-canvas) px-4 text-(--mc-color-text-secondary)" role="status">
        <div className="flex items-center gap-3 rounded-(--mc-radius-button) border border-(--mc-color-border) bg-(--mc-color-surface) px-4 py-3 shadow-(--mc-shadow-soft)">
          <LoaderCircle className="size-5 animate-spin text-(--mc-color-accent) motion-reduce:animate-none" aria-hidden="true" />
          <span className="text-sm font-medium">{t('Loading...')}</span>
        </div>
      </div>
    );
  }

  // Not authenticated - silent redirect to landing
  if (authStatus === "unauthenticated" || authStatus === "error") {
    return <Navigate to={buildAuthLandingUrl('login', returnTo)} replace />;
  }

  if (legalAcceptanceStatus !== "accepted") {
    return <Navigate to={buildLegalAcceptanceUrl(returnTo)} replace />;
  }

  // The browser can transition directly from account A to account B without
  // remounting the router. Key the whole protected subtree by owner so no
  // transient hook/form/attempt state survives that account boundary.
  return <Fragment key={user?.id ?? 'authenticated-user'}>{children}</Fragment>;
}
