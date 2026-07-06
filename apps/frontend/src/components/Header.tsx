import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/components/useAuth';
import NotificationBell from '@/features/notifications/components/NotificationBell';
import logo from '@/assets/logos/RefLab-Logo-No-BG.svg';
import { useTranslation } from 'react-i18next';

/** Shared classes for crisp, square icon-buttons in the header. */
const ICON_BTN =
  'inline-flex h-10 w-10 items-center justify-center rounded-(--radius-button) ' +
  'text-(--text-secondary) transition-[color,background-color,transform] duration-150 ' +
  'hover:text-(--text-primary) hover:bg-(--bg-hover) active:scale-95 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-primary)';

/**
 * Hamburger Menu Button
 * Preserves the original single-click (toggle) / double-click (close) behavior.
 */
const MenuButton = ({
  onClick,
  onDoubleClick,
  ariaLabel,
}: {
  onClick: () => void;
  onDoubleClick: () => void;
  ariaLabel: string;
}) => (
  <button type="button" onClick={onClick} onDoubleClick={onDoubleClick} aria-label={ariaLabel} className={ICON_BTN}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>
);

/**
 * Search Button
 */
const SearchButton = ({ onClick, ariaLabel }: { onClick: () => void; ariaLabel: string }) => (
  <button type="button" onClick={onClick} aria-label={ariaLabel} className={ICON_BTN}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  </button>
);

/**
 * RefLab Logo + wordmark
 */
const RefLabLogo = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('RefLab Home')}
      className="group flex items-center gap-2 rounded-(--radius-button) px-1.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-primary)"
    >
      <img
        src={logo}
        alt={t('RefLab Logo')}
        className="h-6 w-auto transition-transform duration-200 group-hover:scale-105"
      />
      <span className="text-xl font-extrabold tracking-tight text-gradient-brand">RefLab</span>
    </button>
  );
};

interface HeaderProps {
  onMenuToggle: () => void;
  onMenuClose: () => void;
}

/**
 * Header Component
 * Refined sticky frosted bar: equal flex-1 columns — Left (Menu) | Center (Logo) | Right (Search/Notifs).
 *
 * Sidebar state is managed by the parent (AppShell) via onMenuToggle/onMenuClose props.
 */
export const Header: React.FC<HeaderProps> = ({ onMenuToggle, onMenuClose }) => {
  const { t } = useTranslation();
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
    <header className="glass fixed top-0 left-0 z-50 flex h-16 w-full items-center border-b border-(--border-subtle) px-3 shadow-(--shadow-soft) sm:px-4">
      {/* Hairline brand glow along the bottom edge */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-(--brand-yellow)/40 to-transparent"
      />

      {/* [HAMBURGER MENU] */}
      <div className="flex flex-1 items-center justify-start">
        <MenuButton onClick={onMenuToggle} onDoubleClick={onMenuClose} ariaLabel={t('Open menu')} />
      </div>

      {/* [REFLAB LOGO] */}
      <div className="flex flex-1 items-center justify-center">
        <RefLabLogo onClick={handleLogoClick} />
      </div>

      {/* [SEARCH AND NOTIFICATIONS ICON] */}
      <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
        <SearchButton onClick={handleSearchClick} ariaLabel={t('Search')} />
        <NotificationBell />
      </div>
    </header>
  );
};
