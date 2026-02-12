import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/components/useAuth';
import logo from '@/assets/logos/RefLab Logo No BG.svg';

/**
 * Hamburger Menu Icon Stub
 * Accepts onClick and onDoubleClick handlers.
 */
const MenuIcon = ({ onClick, onDoubleClick }: { onClick: () => void; onDoubleClick: () => void }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 cursor-pointer text-(--text-secondary) hover:text-(--text-primary) transition-colors"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    onClick={onClick}
    onDoubleClick={onDoubleClick}
    aria-label="Open menu"
    role="button"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

/**
 * Search Icon Stub
 */
const SearchIcon = ({ onClick }: { onClick: () => void }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 cursor-pointer text-(--text-secondary) hover:text-(--text-primary) transition-colors"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    onClick={onClick}
    aria-label="Search"
    role="button"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

/**
 * Notification Icon Stub
 */
const BellIcon = ({ onClick }: { onClick: () => void }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 cursor-pointer text-(--text-secondary) hover:text-(--text-primary) transition-colors"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    onClick={onClick}
    aria-label="Notifications"
    role="button"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

/**
 * RefLab Logo Stub
 * SVG placeholder for the logo.
 */
const RefLabLogo = ({ onClick }: { onClick: () => void }) => (
  <div
    className="flex items-center gap-2 cursor-pointer"
    onClick={onClick}
    role="button"
    aria-label="RefLab Home"
  >
    <img src={logo} alt="RefLab Logo" className="h-6 w-auto" />
    <span className="text-xl font-bold text-(--text-primary)">RefLab</span>
  </div>
);

interface HeaderProps {
  onMenuToggle: () => void;
  onMenuClose: () => void;
}

/**
 * Header Component
 * Layout: 20% Left (Menu) | 60% Center (Logo) | 20% Right (Search/Notifs)
 *
 * Sidebar state is managed by the parent (AppShell) via onMenuToggle/onMenuClose props.
 */
export const Header: React.FC<HeaderProps> = ({ onMenuToggle, onMenuClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Mock notifications data
  const notifications = [
    { id: 1, text: "New test available: React Basics", time: "2m ago" },
    { id: 2, text: "Your profile was updated", time: "1h ago" },
    { id: 3, text: "Welcome to RefLab!", time: "1d ago" }
  ];

  // --- Logo Logic ---
  const handleLogoClick = () => {
    if (user) {
      navigate('/app/dashboard');
      return;
    }

    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  // --- Search Logic ---
  const handleSearchClick = () => {
    // navigate directly to the dedicated search page (protected route)
    navigate('/app/search');
  };

  // --- Notifications Logic ---
  const handleNotificationsClick = () => {
    setIsNotificationsOpen((prev) => !prev);
  };

  return (
    <>
      {/* Navbar Container - fixed at top */}
      <header className="fixed top-0 left-0 w-full h-16 bg-(--bg-surface) shadow-(--shadow-soft) z-50 flex items-center px-4 border-b border-(--border-subtle) transition-all">

        {/* [HAMBURGUER MENU 20%] */}
        <div className="w-[20%] flex justify-start items-center">
          <MenuIcon
            onClick={onMenuToggle}
            onDoubleClick={onMenuClose}
          />
        </div>

        {/* [REFLAB LOGO 60%] */}
        <div className="w-[60%] flex justify-center items-center">
          <RefLabLogo onClick={handleLogoClick} />
        </div>

        {/* [SEARCH AND NOTIFICATIONS ICON 20%] */}
        <div className="w-[20%] flex justify-end items-center gap-3 sm:gap-4">
          <SearchIcon onClick={handleSearchClick} />
          <BellIcon onClick={handleNotificationsClick} />
        </div>
      </header>



      {/* Notifications Dropdown */}
      {isNotificationsOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
          <div className="fixed top-16 right-4 w-80 bg-(--bg-surface) rounded-(--radius-card) shadow-xl border border-(--border-subtle) z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-(--border-subtle) bg-(--bg-surface-2) flex justify-between items-center">
              <h3 className="font-semibold text-(--text-primary)">Notifications</h3>
              <span className="text-xs bg-(--brand-yellow)/20 text-(--brand-yellow) px-2 py-0.5 rounded-full">{notifications.length}</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((notif) => (
                <div key={notif.id} className="p-4 border-b border-(--border-subtle) hover:bg-(--bg-surface-2) transition-colors cursor-pointer">
                  <p className="text-sm text-(--text-primary)">{notif.text}</p>
                  <p className="text-xs text-(--text-muted) mt-1">{notif.time}</p>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="p-8 text-center text-(--text-muted) text-sm">No new notifications</div>
              )}
            </div>
            <div className="p-2 text-center border-t border-(--border-subtle)">
              <button onClick={() => navigate('/app/notifications')} className="text-xs text-(--brand-yellow) hover:underline font-medium">
                View all notifications
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
