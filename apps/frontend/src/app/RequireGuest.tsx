import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/components/useAuth";
import { resolveAuthReturnTo } from "@/features/auth/utils/authNavigation";
import { useTranslation } from "react-i18next";
import { LoaderCircle } from "lucide-react";

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
  const location = useLocation();

  if (authStatus === "checking_session") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-(--mc-color-canvas) px-4 text-(--mc-color-text-secondary)" role="status">
        <div className="flex items-center gap-3 rounded-(--mc-radius-button) border border-(--mc-color-border) bg-(--mc-color-surface) px-4 py-3 shadow-(--mc-shadow-soft)">
          <LoaderCircle className="size-5 animate-spin text-(--mc-color-accent) motion-reduce:animate-none" aria-hidden="true" />
          <span className="text-sm font-medium">{t('Loading...')}</span>
        </div>
      </div>
    );
  }

  if (authStatus === "authenticated") {
    return <Navigate to={resolveAuthReturnTo(location.search)} replace />;
  }

  return <>{children}</>;
}
