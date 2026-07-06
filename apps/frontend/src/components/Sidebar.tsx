import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/components/useAuth';
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  Bell,
  CreditCard,
  Users,
  MessageSquare,
  Search,
  UserCircle,
  Settings,
  LogOut,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Close on Escape while the panel is open.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      onClose();
      navigate('/');
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 z-30 bg-(--bg-base)/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <aside
        className={`card-console glass fixed top-16 left-0 ${user ? 'bottom-16' : 'bottom-0'} z-[60] flex w-72 max-w-[82vw] flex-col rounded-none border-y-0 border-l-0 border-r border-(--border-subtle) shadow-(--shadow-pop) transition-transform duration-300 ease-[var(--ease-out)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label={t('Sidebar')}
      >
        {/* Navigation Links (Top) */}
        <div className="grow overflow-y-auto p-3">
          <p className="eyebrow px-3 pb-2 pt-1">{t('Navigation')}</p>
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group relative flex w-full items-center gap-3 rounded-(--radius-button) px-4 py-3 text-left font-medium transition-[color,background-color] duration-150 ${
                    isActive
                      ? 'bg-(--brand-yellow)/10 text-(--brand-yellow)'
                      : 'text-(--text-secondary) hover:bg-(--bg-hover) hover:text-(--text-primary)'
                  }`}
                >
                  {/* Active flag-accent indicator bar */}
                  <span
                    aria-hidden="true"
                    className={`flag-accent absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-opacity duration-150 ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{t(item.key)}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout (Bottom) */}
        <div className="border-t border-(--border-subtle) bg-(--bg-surface-2)/60 p-4">
          {user ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={t('Profile avatar')}
                    className="h-10 w-10 rounded-full border border-(--border-subtle) object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--brand-yellow)/20 font-bold text-(--brand-yellow)">
                    {user.user_metadata?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-semibold text-(--text-primary)" title={user.email}>
                    {user.user_metadata?.full_name || user.email}
                  </p>
                  <p className="truncate text-xs text-(--text-muted)">
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-(--radius-button) border border-(--error)/20 px-4 py-2 text-sm font-medium text-(--error) transition-colors hover:border-(--error)/40 hover:bg-(--error)/10"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {t('Log Out')}
              </button>
            </div>
          ) : (
             <div className="flex flex-col gap-3">
                <p className="px-1 text-sm text-(--text-muted)">{t('Guest')}</p>
                <button
                  onClick={() => handleNavigation('/')}
                  style={{ backgroundImage: 'var(--grad-brand)' }}
                  className="w-full rounded-(--radius-button) px-4 py-2 text-sm font-bold text-(--bg-primary) shadow-[0_8px_24px_-8px_rgba(246,194,28,0.5)] transition-[filter] hover:brightness-105"
                >
                  {t('Log In')}
                </button>
             </div>
          )}
        </div>
      </aside>
    </>
  );
};
