import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/components/useAuth';
import NotificationBell from '@/features/notifications/components/NotificationBell';
import logo from '@/assets/logos/RefLab-Logo-No-BG.svg';

/**
 * Hamburger Menu Icon
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
 * Search Icon
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
 * RefLab Logo
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
    navigate('/app/search');
  };

  return (
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
        <NotificationBell />
      </div>
    </header>
  );
};
