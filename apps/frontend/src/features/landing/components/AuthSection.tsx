import { useRef, useState, type KeyboardEvent } from "react";
import LoginForm from "@/features/auth/components/LoginForm";
import SignupForm from "@/features/auth/components/SignupForm";
import ForgotPassword from "@/features/auth/components/ForgotPassword";
import { useTranslation } from "react-i18next";

// The three views this component can show
type AuthView = "login" | "signup" | "forgot-password";

interface AuthSectionProps {
  initialView?: Exclude<AuthView, "forgot-password">;
}

/**
 * AuthSection - Container for authentication forms on the landing page
 *
 * Features:
 * - Toggle buttons at the top to switch between Login and Signup
 * - Renders the appropriate form based on current view
 * - Handles "Forgot password?" flow
 *
 * Layout:
 * ┌─────────────────────────────────────┐
 * │  [Log in]  [Sign up]               │  ← Toggle buttons
 * ├─────────────────────────────────────┤
 * │                                     │
 * │   LoginForm / SignupForm /         │  ← Current form
 * │   ForgotPassword                   │
 * │                                     │
 * └─────────────────────────────────────┘
 */
export default function AuthSection({ initialView = "login" }: AuthSectionProps) {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<AuthView>(initialView);
  const [requestPending, setRequestPending] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const changeNestedView = (view: AuthView) => {
    if (requestPending) return;
    setCurrentView(view);
    window.requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: Exclude<AuthView, "forgot-password">,
  ) => {
    if (requestPending) return;
    let nextTab: Exclude<AuthView, "forgot-password"> | null = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      nextTab = currentTab === "login" ? "signup" : "login";
    } else if (event.key === "Home") {
      nextTab = "login";
    } else if (event.key === "End") {
      nextTab = "signup";
    }

    if (!nextTab) return;
    event.preventDefault();
    setCurrentView(nextTab);
    const nextTabId = nextTab === "login" ? "auth-login-tab" : "auth-signup-tab";
    window.requestAnimationFrame(() => document.getElementById(nextTabId)?.focus());
  };

  // Handle "Forgot password?" click from LoginForm
  const handleForgotPassword = () => {
    changeNestedView("forgot-password");
  };

  // Handle "Back to login" from ForgotPassword
  const handleBackToLogin = () => {
    changeNestedView("login");
  };

  const sectionLabel = currentView === "signup"
    ? t("Sign up")
    : currentView === "forgot-password"
      ? t("Reset your password")
      : t("Log In");

  return (
    <section id="auth" aria-label={sectionLabel} className="w-full scroll-mt-4">
      <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border-strong) bg-(--mc-color-surface)/95 shadow-(--mc-shadow-raised) backdrop-blur-sm">
        <span aria-hidden="true" className="absolute right-0 top-0 h-1.5 w-32 -skew-x-[28deg] bg-(--mc-color-accent)" />
        <span aria-hidden="true" className="absolute right-2 top-0 h-1.5 w-8 -skew-x-[28deg] bg-(--mc-color-danger)" />

        {currentView !== "forgot-password" && (
          <div
            role="tablist"
            aria-label={`${t("Log In")} / ${t("Sign up")}`}
            className="grid grid-cols-2 border-b border-(--mc-color-border) bg-(--mc-color-canvas)/45 p-1.5"
          >
            <button
              id="auth-login-tab"
              type="button"
              role="tab"
              aria-selected={currentView === "login"}
              aria-controls="auth-panel"
              tabIndex={currentView === "login" ? 0 : -1}
              disabled={requestPending}
              onClick={() => changeNestedView("login")}
              onKeyDown={event => handleTabKeyDown(event, "login")}
              className={`mc-focus-ring min-h-11 rounded-(--mc-radius-button) px-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                currentView === "login"
                  ? "bg-(--mc-color-accent) text-(--mc-color-canvas) shadow-(--mc-shadow-soft)"
                  : "text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)"
              }`}
            >
              {t("Log In")}
            </button>
            <button
              id="auth-signup-tab"
              type="button"
              role="tab"
              aria-selected={currentView === "signup"}
              aria-controls="auth-panel"
              tabIndex={currentView === "signup" ? 0 : -1}
              disabled={requestPending}
              onClick={() => changeNestedView("signup")}
              onKeyDown={event => handleTabKeyDown(event, "signup")}
              className={`mc-focus-ring min-h-11 rounded-(--mc-radius-button) px-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                currentView === "signup"
                  ? "bg-(--mc-color-accent) text-(--mc-color-canvas) shadow-(--mc-shadow-soft)"
                  : "text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)"
              }`}
            >
              {t("Sign up")}
            </button>
          </div>
        )}

        <div
          ref={panelRef}
          id="auth-panel"
          role={currentView === "forgot-password" ? undefined : "tabpanel"}
          aria-labelledby={currentView === "login" ? "auth-login-tab" : currentView === "signup" ? "auth-signup-tab" : undefined}
          tabIndex={-1}
          className="p-5 outline-none sm:p-7"
        >
          {currentView === "login" && (
            <LoginForm
              onForgotPassword={handleForgotPassword}
              onPendingChange={setRequestPending}
            />
          )}
          {currentView === "signup" && (
            <SignupForm onPendingChange={setRequestPending} />
          )}
          {currentView === "forgot-password" && (
            <ForgotPassword
              onBackToLogin={handleBackToLogin}
              onPendingChange={setRequestPending}
            />
          )}
        </div>
      </div>
    </section>
  );
}
