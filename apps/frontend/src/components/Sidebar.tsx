import type { MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import logo from '@/assets/logos/RefLab-Logo-No-BG.svg';
import { useAuth } from '@/features/auth/components/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { key: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
  { key: 'Tests', path: '/app/tests', icon: ClipboardList },
  { key: 'Learn', path: '/app/learn', icon: BookOpen },
  { key: 'Social', path: '/app/social', icon: Users },
  { key: 'Messages', path: '/app/messages', icon: MessageSquare },
  { key: 'Search', path: '/app/search', icon: Search },
  { key: 'Notifications', path: '/app/notifications', icon: Bell },
  { key: 'Profile', path: '/app/profile', icon: UserCircle },
  { key: 'Pricing', path: '/app/pricing', icon: CreditCard },
  { key: 'Settings', path: '/app/settings', icon: Settings },
] as const;

function isNavigationItemActive(pathname: string, path: string) {
  if (path === '/app/dashboard') {
    return pathname === '/app' || pathname === '/app/dashboard';
  }

  if (path === '/app/social' && pathname.startsWith('/app/post/')) {
    return true;
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      onClose();
      navigate('/');
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const displayName = user?.user_metadata?.full_name || user?.email || t('Profile');

  return (
    <>
      <button
        type="button"
        tabIndex={isOpen ? 0 : -1}
        className={`fixed inset-x-0 top-[calc(var(--mc-header-height)+var(--mc-safe-top))] bottom-[calc(var(--mc-bottom-nav-height)+var(--mc-safe-bottom))] z-(--mc-z-sticky) bg-(--mc-color-overlay) transition-opacity duration-200 md:hidden ${
          isOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
        onClick={onClose}
        aria-label={t('Close')}
      />

      <aside
        id="app-navigation-menu"
        className={`fixed left-0 top-[calc(var(--mc-header-height)+var(--mc-safe-top))] bottom-[calc(var(--mc-bottom-nav-height)+var(--mc-safe-bottom))] z-(--mc-z-navigation) flex w-[min(88vw,18rem)] flex-col border-r border-(--mc-color-border) bg-(--mc-color-surface) shadow-(--mc-shadow-raised) transition-[transform,visibility] duration-200 md:inset-y-0 md:w-20 md:visible md:translate-x-0 md:shadow-none xl:w-64 ${
          isOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'
        }`}
        aria-label={t('Sidebar')}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <div className="hidden h-16 shrink-0 items-center justify-center gap-3 border-b border-(--mc-color-border) px-4 md:flex xl:justify-start xl:px-6">
          <img src={logo} alt="" className="h-7 w-auto" aria-hidden="true" />
          <span className="hidden text-xl font-bold tracking-tight text-(--mc-color-text) xl:block">RefLab</span>
          <span aria-hidden="true" className="absolute left-0 right-0 top-[3.875rem] h-0.5 bg-linear-to-r from-(--mc-color-accent) via-(--mc-color-danger) to-transparent" />
        </div>

        <div className="flex h-14 shrink-0 items-center justify-between border-b border-(--mc-color-border) px-4 md:hidden">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-(--mc-color-text-secondary)">
            {t('Sidebar')}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mc-focus-ring inline-flex size-11 items-center justify-center rounded-(--mc-radius-button) text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)"
            aria-label={t('Close')}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 md:px-2 md:py-4 xl:px-4" aria-label={t('Sidebar')}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = isNavigationItemActive(location.pathname, item.path);
            const label = t(item.key);

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavigation(item.path)}
                aria-current={isActive ? 'page' : undefined}
                title={label}
                className={`mc-focus-ring relative flex min-h-12 w-full items-center gap-3 rounded-(--mc-radius-button) border px-4 py-3 text-left text-sm font-semibold transition-colors md:justify-center md:px-3 xl:justify-start ${
                  isActive
                    ? 'border-(--mc-color-accent)/30 bg-(--mc-color-accent)/10 text-(--mc-color-accent)'
                    : 'border-transparent text-(--mc-color-text-secondary) hover:border-(--mc-color-border) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)'
                }`}
              >
                {isActive && (
                  <span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-(--mc-color-accent)" />
                )}
                <Icon className="size-5 shrink-0" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
                <span className="min-w-0 truncate md:hidden xl:block">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-(--mc-color-border) bg-(--mc-color-surface-raised) p-3 md:px-2 xl:p-4">
          {user ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => handleNavigation('/app/profile')}
                className="mc-focus-ring flex min-w-0 items-center gap-3 rounded-(--mc-radius-button) text-left md:justify-center xl:justify-start"
              >
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={t('Profile avatar')}
                    className="size-10 shrink-0 rounded-full border border-(--mc-color-border-strong) object-cover"
                  />
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-(--mc-color-accent)/30 bg-(--mc-color-accent)/10 font-bold text-(--mc-color-accent)" aria-hidden="true">
                    {displayName.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
                <span className="min-w-0 md:hidden xl:block">
                  <span className="block truncate text-sm font-semibold text-(--mc-color-text)">{displayName}</span>
                  <span className="block truncate text-xs text-(--mc-color-text-muted)">{user.email}</span>
                </span>
              </button>

              <button
                onClick={handleLogout}
                type="button"
                title={t('Log Out')}
                className="mc-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-(--mc-radius-button) border border-(--mc-color-danger)/35 px-3 py-2 text-sm font-semibold text-(--mc-color-danger) transition-colors hover:bg-(--mc-color-danger)/10"
              >
                <LogOut className="size-4 shrink-0" aria-hidden="true" />
                <span className="md:hidden xl:inline">{t('Log Out')}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleNavigation('/')}
              className="mc-focus-ring min-h-11 w-full rounded-(--mc-radius-button) bg-(--mc-color-accent) px-3 py-2 text-sm font-bold text-(--mc-color-canvas)"
            >
              {t('Log In')}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
