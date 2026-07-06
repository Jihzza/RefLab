import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "./useAuth";
import { mapAuthError } from "../api/authErrors";
import type { AuthFormErrors } from "../types";
import { useTranslation } from "react-i18next";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import GoogleButton from "./GoogleButton";

interface LoginFormProps {
  onForgotPassword: () => void;
}

/**
 * LoginForm - Email/password login form with Google OAuth option.
 * Renders as pure form content; the surrounding card + tabs live in AuthSection.
 */
export default function LoginForm({ onForgotPassword }: LoginFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<AuthFormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: AuthFormErrors = {};
    if (!email) {
      newErrors.email = t("Email is required");
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t("Please enter a valid email");
    }
    if (!password) {
      newErrors.password = t("Password is required");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!validateForm()) return;

    setLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      const mapped = mapAuthError(error, "login");
      setErrors(mapped.field ? { [mapped.field]: mapped.message } : { general: mapped.message });
      setLoading(false);
      return;
    }
    navigate("/app/dashboard");
  };

  const handleGoogleLogin = async () => {
    setErrors({});
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      const mapped = mapAuthError(error, "oauth");
      setErrors({ general: mapped.message });
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors.general && (
        <div
          role="alert"
          className="p-3 rounded-(--radius-input) bg-(--error)/10 border border-(--error)/20 text-(--error) text-sm text-center"
        >
          {errors.general}
        </div>
      )}

      <Input
        id="login-email"
        type="email"
        label={t("Correo Electrónico")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        placeholder="nome@exemplo.com"
        autoComplete="email"
        leftIcon={<Mail size={17} />}
        error={errors.email}
      />

      <div>
        <Input
          id="login-password"
          type={showPassword ? "text" : "password"}
          label={t("Contraseña")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          placeholder="••••••••"
          autoComplete="current-password"
          leftIcon={<Lock size={17} />}
          error={errors.password}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t("Hide password") : t("Show password")}
              className="text-(--text-muted) hover:text-(--text-secondary) transition-colors"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          }
        />
        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm font-medium text-(--brand-yellow) hover:text-(--brand-yellow-soft) hover:underline"
          >
            {t("¿Olvidaste tu contraseña?")}
          </button>
        </div>
      </div>

      <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
        {loading ? t("Iniciando sesión...") : t("Iniciar Sesión")}
      </Button>

      <Divider label={t("o continuar con")} />

      <GoogleButton onClick={handleGoogleLogin} disabled={loading} label="Google" />
    </form>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-(--border-subtle)" />
      </div>
      <div className="relative flex justify-center">
        <span className="px-3 bg-(--bg-surface) text-xs text-(--text-muted)">{label}</span>
      </div>
    </div>
  );
}
