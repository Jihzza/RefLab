import { useState } from "react";
import { useAuth } from "./useAuth";
import { mapAuthError } from "../api/authErrors";
import type { AuthFormErrors } from "../types";

/**
 * SignupForm - Email/password registration form with Google OAuth option
 *
 * Features:
 * - Email, password, and confirm password fields
 * - Password strength validation (minimum 6 characters)
 * - "Sign up with Google" button
 * - Field-specific error messages
 * - Shows success message after signup (email confirmation required)
 */
export default function SignupForm() {
  const { signUp, signInWithGoogle } = useAuth();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [successMessage, setSuccessMessage] = useState("");

  // Validate form before submission
  const validateForm = (): boolean => {
    const newErrors: AuthFormErrors = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle email/password signup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous state
    setErrors({});
    setSuccessMessage("");

    // Validate
    if (!validateForm()) return;

    setLoading(true);

    const { error } = await signUp(email, password);

    if (error) {
      const mapped = mapAuthError(error, 'signup');
      setErrors(mapped.field ? { [mapped.field]: mapped.message } : { general: mapped.message });
      setLoading(false);
      return;
    }

    // Success - show confirmation message
    // User needs to confirm their email before they can log in
    setSuccessMessage(
      "Account created! Please check your email to confirm your account."
    );
    setLoading(false);

    // Clear form
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  // Handle Google OAuth signup (same as login - Google handles both)
  const handleGoogleSignup = async () => {
    setErrors({});
    setSuccessMessage("");
    setLoading(true);

    const { error } = await signInWithGoogle();

    if (error) {
      const mapped = mapAuthError(error, 'oauth');
      setErrors({ general: mapped.message });
      setLoading(false);
    }
    // Note: If successful, user will be redirected to Google
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Success message */}
      {successMessage && (
        <div className="p-3 rounded-(--radius-input) bg-(--success)/10 border border-(--success)/20 text-(--success) text-sm">
          {successMessage}
        </div>
      )}

      {/* General error message */}
      {errors.general && (
        <div className="p-3 rounded-(--radius-input) bg-(--error)/10 border border-(--error)/20 text-(--error) text-sm text-center">{errors.general}</div>
      )}

      {/* Email field */}
      <div className="space-y-2">
        <label htmlFor="signup-email" className="block text-sm font-medium text-(--text-secondary)">
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 outline-none transition-all
            bg-(--bg-surface-2) 
            border border-(--border-subtle) 
            rounded-(--radius-input) 
            text-(--text-primary) 
            placeholder-(--text-muted)
            focus:border-(--brand-yellow) 
            focus:ring-1 focus:ring-(--brand-yellow)
            disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="text-sm text-(--error)">{errors.email}</p>
        )}
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <label htmlFor="signup-password" className="block text-sm font-medium text-(--text-secondary)">
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 outline-none transition-all
            bg-(--bg-surface-2) 
            border border-(--border-subtle) 
            rounded-(--radius-input) 
            text-(--text-primary) 
            placeholder-(--text-muted)
            focus:border-(--brand-yellow) 
            focus:ring-1 focus:ring-(--brand-yellow)
            disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="text-sm text-(--error)">{errors.password}</p>
        )}
        <p className="text-xs text-(--text-muted)">Minimum 6 characters</p>
      </div>

      {/* Confirm password field */}
      <div className="space-y-2">
        <label htmlFor="signup-confirm" className="block text-sm font-medium text-(--text-secondary)">
          Confirm Password
        </label>
        <input
          id="signup-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 outline-none transition-all
            bg-(--bg-surface-2) 
            border border-(--border-subtle) 
            rounded-(--radius-input) 
            text-(--text-primary) 
            placeholder-(--text-muted)
            focus:border-(--brand-yellow) 
            focus:ring-1 focus:ring-(--brand-yellow)
            disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="••••••••"
        />
        {errors.confirmPassword && (
          <p className="text-sm text-(--error)">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 px-4 font-bold transition-all transform active:scale-[0.98]
          bg-(--brand-yellow) 
          text-(--bg-primary) 
          rounded-(--radius-button)
          hover:bg-(--brand-yellow-soft) 
          hover:shadow-[0_0_15px_rgb(var(--brand-yellow)_/_0.3)]
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-(--border-subtle)"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-(--bg-surface) text-(--text-muted)">or</span>
        </div>
      </div>

      {/* Google OAuth button */}
      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={loading}
        className="w-full py-3 px-4 flex items-center justify-center gap-3 transition-colors
          bg-(--bg-surface-2) 
          border border-(--border-subtle) 
          text-(--text-primary) 
          rounded-(--radius-button)
          hover:bg-(--bg-hover)
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {/* Google icon */}
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span className="font-medium">Continue with Google</span>
      </button>
    </form>
  );
}
