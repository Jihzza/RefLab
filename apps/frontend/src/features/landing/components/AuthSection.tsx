import { useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import ForgotPassword from '@/features/auth/components/ForgotPassword';
import LoginForm from '@/features/auth/components/LoginForm';
import SignupForm from '@/features/auth/components/SignupForm';

type AuthView = 'login' | 'signup' | 'forgot-password';

/** Match Control presentation around the existing authentication flows. */
export default function AuthSection() {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<AuthView>('login');
  const loginTabRef = useRef<HTMLButtonElement>(null);
  const signupTabRef = useRef<HTMLButtonElement>(null);

  const changeTabFromKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: Exclude<AuthView, 'forgot-password'>,
  ) => {
    let nextTab: Exclude<AuthView, 'forgot-password'> | null = null;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      nextTab = currentTab === 'login' ? 'signup' : 'login';
    } else if (event.key === 'Home') {
      nextTab = 'login';
    } else if (event.key === 'End') {
      nextTab = 'signup';
    }

    if (!nextTab) return;
    event.preventDefault();
    setCurrentView(nextTab);
    (nextTab === 'login' ? loginTabRef : signupTabRef).current?.focus();
  };

  const sectionLabel = currentView === 'signup'
    ? t('Sign up')
    : currentView === 'forgot-password'
      ? t('Reset your password')
      : t('Log In');

  return (
    <section id="auth" aria-label={sectionLabel} className="w-full scroll-mt-4">
      <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border-strong) bg-(--mc-color-surface)/95 shadow-(--mc-shadow-raised) backdrop-blur-sm">
        <span aria-hidden="true" className="absolute right-0 top-0 h-1.5 w-32 -skew-x-[28deg] bg-(--mc-color-accent)" />
        <span aria-hidden="true" className="absolute right-2 top-0 h-1.5 w-8 -skew-x-[28deg] bg-(--mc-color-danger)" />

        {currentView !== 'forgot-password' && (
          <div
            role="tablist"
            aria-label={`${t('Log In')} / ${t('Sign up')}`}
            className="grid grid-cols-2 border-b border-(--mc-color-border) bg-(--mc-color-canvas)/45 p-1.5 pt-2"
          >
            <button
              ref={loginTabRef}
              id="auth-login-tab"
              type="button"
              role="tab"
              aria-selected={currentView === 'login'}
              aria-controls="auth-panel"
              tabIndex={currentView === 'login' ? 0 : -1}
              onClick={() => setCurrentView('login')}
              onKeyDown={(event) => changeTabFromKeyboard(event, 'login')}
              className={`mc-focus-ring min-h-11 rounded-(--mc-radius-button) px-3 text-sm font-bold transition-colors ${
                currentView === 'login'
                  ? 'bg-(--mc-color-accent) text-(--mc-color-canvas) shadow-(--mc-shadow-soft)'
                  : 'text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)'
              }`}
            >
              {t('Log In')}
            </button>
            <button
              ref={signupTabRef}
              id="auth-signup-tab"
              type="button"
              role="tab"
              aria-selected={currentView === 'signup'}
              aria-controls="auth-panel"
              tabIndex={currentView === 'signup' ? 0 : -1}
              onClick={() => setCurrentView('signup')}
              onKeyDown={(event) => changeTabFromKeyboard(event, 'signup')}
              className={`mc-focus-ring min-h-11 rounded-(--mc-radius-button) px-3 text-sm font-bold transition-colors ${
                currentView === 'signup'
                  ? 'bg-(--mc-color-accent) text-(--mc-color-canvas) shadow-(--mc-shadow-soft)'
                  : 'text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)'
              }`}
            >
              {t('Sign up')}
            </button>
          </div>
        )}

        <div
          id="auth-panel"
          role={currentView === 'forgot-password' ? undefined : 'tabpanel'}
          aria-labelledby={
            currentView === 'login'
              ? 'auth-login-tab'
              : currentView === 'signup'
                ? 'auth-signup-tab'
                : undefined
          }
          className="p-5 sm:p-7"
        >
          {currentView === 'login' && (
            <LoginForm onForgotPassword={() => setCurrentView('forgot-password')} />
          )}
          {currentView === 'signup' && <SignupForm />}
          {currentView === 'forgot-password' && (
            <ForgotPassword onBackToLogin={() => setCurrentView('login')} />
          )}
        </div>
      </div>
    </section>
  );
}
