import { useState } from "react";
import LoginForm from "@/features/auth/components/LoginForm";
import SignupForm from "@/features/auth/components/SignupForm";
import ForgotPassword from "@/features/auth/components/ForgotPassword";
import { useTranslation } from "react-i18next";

type AuthView = "login" | "signup" | "forgot-password";

/**
 * AuthSection — the authentication panel on the landing page.
 * Owns a single elevated card with a segmented Login/Sign-up control; the forms
 * render as pure content inside it.
 */
export default function AuthSection() {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<AuthView>("login");

  const handleForgotPassword = () => setCurrentView("forgot-password");
  const handleBackToLogin = () => setCurrentView("login");

  return (
    <div className="w-full max-w-md mx-auto animate-fade-up">
      <div className="card-console p-6 sm:p-8">
        {currentView !== "forgot-password" && (
          <div
            role="tablist"
            aria-label={t("Log In")}
            className="mb-7 grid grid-cols-2 gap-1 rounded-(--radius-button) bg-(--bg-surface-2) p-1"
          >
            <SegTab
              active={currentView === "login"}
              onClick={() => setCurrentView("login")}
            >
              {t("Log In")}
            </SegTab>
            <SegTab
              active={currentView === "signup"}
              onClick={() => setCurrentView("signup")}
            >
              {t("Sign up")}
            </SegTab>
          </div>
        )}

        {currentView === "login" && <LoginForm onForgotPassword={handleForgotPassword} />}
        {currentView === "signup" && <SignupForm />}
        {currentView === "forgot-password" && (
          <ForgotPassword onBackToLogin={handleBackToLogin} />
        )}
      </div>
    </div>
  );
}

function SegTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "h-10 rounded-[calc(var(--radius-button)-4px)] text-sm font-semibold transition-all duration-200",
        active
          ? "bg-(--bg-elevated) text-(--text-primary) shadow-(--shadow-soft)"
          : "text-(--text-muted) hover:text-(--text-secondary)",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
