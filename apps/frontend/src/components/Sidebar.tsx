import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
        className={`fixed inset-0 z-60 bg-black/65 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <aside
        className={`fixed left-0 top-[calc(var(--mc-header-height)+var(--mc-safe-top))] ${user ? 'bottom-[calc(var(--mc-bottom-nav-height)+var(--mc-safe-bottom))]' : 'bottom-0'} z-70 flex w-64 transform flex-col border-r border-(--border-subtle) bg-(--bg-surface) shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label={t('Sidebar')}
      >
        {/* Navigation Links (Top) */}
        <div className="p-4 grow overflow-y-auto">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`) ||
                (item.path === '/app/social' &&
                  location.pathname.startsWith('/app/post/'));

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-(--radius-button) border px-4 py-3 text-left font-medium transition-colors ${
                    isActive
                      ? 'border-(--brand-yellow)/25 bg-(--brand-yellow)/10 text-(--brand-yellow)'
                      : 'border-transparent text-(--text-secondary) hover:bg-(--bg-surface-2) hover:text-(--text-primary)'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  <span>{t(item.key)}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout (Bottom) */}
        <div className="p-4 border-t border-(--border-subtle) bg-(--bg-surface-2)">
          {user ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={t('Profile avatar')}
                    className="w-10 h-10 rounded-full object-cover border border-(--border-subtle)"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-(--brand-yellow)/20 flex items-center justify-center text-(--brand-yellow) font-bold shrink-0">
                    {user.user_metadata?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-(--text-primary) truncate" title={user.email}>
                    {user.user_metadata?.full_name || user.email}
                  </p>
                  <p className="text-xs text-(--text-muted) truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                type="button"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-(--error) hover:bg-(--error)/10 rounded-(--radius-button) transition-colors border border-(--error)/20 hover:border-(--error)/40 text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                {t('Log Out')}
              </button>
            </div>
          ) : (
             <div className="flex flex-col gap-3">
                <p className="text-sm text-(--text-muted) px-1">{t('Guest')}</p>
                <button
                  onClick={() => handleNavigation('/')}
                  className="w-full px-4 py-2 bg-(--brand-yellow) text-(--bg-primary) rounded-(--radius-button) hover:bg-(--brand-yellow-soft) transition-colors text-sm font-bold"
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
