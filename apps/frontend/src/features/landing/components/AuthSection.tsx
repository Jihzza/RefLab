import { useState } from "react";
import LoginForm from "@/features/auth/components/LoginForm";
import SignupForm from "@/features/auth/components/SignupForm";
import ForgotPassword from "@/features/auth/components/ForgotPassword";

// The three views this component can show
type AuthView = "login" | "signup" | "forgot-password";

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
export default function AuthSection() {
  const [currentView, setCurrentView] = useState<AuthView>("login");

  // Handle "Forgot password?" click from LoginForm
  const handleForgotPassword = () => {
    setCurrentView("forgot-password");
  };

  // Handle "Back to login" from ForgotPassword
  const handleBackToLogin = () => {
    setCurrentView("login");
  };

  return (
    <section className="px-6 py-4">
      <div className="w-full max-w-md mx-auto">
      {/* Only show toggle buttons for login/signup views */}
      {currentView !== "forgot-password" && (
        <div className="flex mb-6">
          {/* Login tab */}
          <button
            type="button"
            onClick={() => setCurrentView("login")}
            className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors ${
              currentView === "login"
                ? "border-(--brand-yellow) text-(--brand-yellow)"
                : "border-transparent text-(--text-muted) hover:text-(--text-secondary)"
            }`}
          >
            Log in
          </button>

          {/* Signup tab */}
          <button
            type="button"
            onClick={() => setCurrentView("signup")}
            className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors ${
              currentView === "signup"
                ? "border-(--brand-yellow) text-(--brand-yellow)"
                : "border-transparent text-(--text-muted) hover:text-(--text-secondary)"
            }`}
          >
            Sign up
          </button>
        </div>
      )}

      {/* Render the appropriate form */}
      {currentView === "login" && (
        <LoginForm onForgotPassword={handleForgotPassword} />
      )}

      {currentView === "signup" && <SignupForm />}

      {currentView === "forgot-password" && (
        <ForgotPassword onBackToLogin={handleBackToLogin} />
      )}
      </div>
    </section>
  );
}
