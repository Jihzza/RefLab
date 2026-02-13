import React from 'react';
import { useNavigate } from 'react-router-dom';
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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
  { label: 'Tests', path: '/app/tests', icon: ClipboardList },
  { label: 'Learn', path: '/app/learn', icon: BookOpen },
  { label: 'Social', path: '/app/social', icon: Users },
  { label: 'Messages', path: '/app/messages', icon: MessageSquare },
  { label: 'Search', path: '/app/search', icon: Search },
  { label: 'Notifications', path: '/app/notifications', icon: Bell },
  { label: 'Profile', path: '/app/profile', icon: UserCircle },
  { label: 'Pricing', path: '/app/pricing', icon: CreditCard },
  { label: 'Settings', path: '/app/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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
        className={`fixed inset-0 bg-(--bg-primary)/50 z-30 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-16 left-0 ${user ? 'bottom-16' : 'bottom-0'} w-64 bg-(--bg-surface) border-r border-(--border-subtle) shadow-xl z-60 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar"
      >
        {/* Navigation Links (Top) */}
        <div className="p-4 grow overflow-y-auto">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className="w-full text-left px-4 py-3 text-(--text-secondary) hover:bg-(--bg-surface-2) hover:text-(--text-primary) rounded-(--radius-button) transition-colors flex items-center gap-3 font-medium"
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  <span>{item.label}</span>
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
                    alt="Profile"
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
                Log Out
              </button>
            </div>
          ) : (
             <div className="flex flex-col gap-3">
                <p className="text-sm text-(--text-muted) px-1">Guest</p>
                <button
                  onClick={() => handleNavigation('/')}
                  className="w-full px-4 py-2 bg-(--brand-yellow) text-(--bg-primary) rounded-(--radius-button) hover:bg-(--brand-yellow-soft) transition-colors text-sm font-bold"
                >
                  Log In
                </button>
             </div>
          )}
        </div>
      </aside>
    </>
  );
};
