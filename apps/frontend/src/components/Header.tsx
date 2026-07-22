import { Menu, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '@/assets/logos/RefLab-Logo-No-BG.svg';
import { IconButton } from '@/components/ui';
import { useAuth } from '@/features/auth/components/useAuth';
import NotificationBell from '@/features/notifications/components/NotificationBell';

interface HeaderProps {
  onMenuToggle: () => void;
  onMenuClose: () => void;
  isMenuOpen?: boolean;
}

const ROUTE_TITLES = [
  { prefix: '/app/notifications', label: 'Notifications' },
  { prefix: '/app/profile/edit', label: 'Edit Profile' },
  { prefix: '/app/messages', label: 'Messages' },
  { prefix: '/app/settings', label: 'Settings' },
  { prefix: '/app/pricing', label: 'Pricing' },
  { prefix: '/app/search', label: 'Search' },
  { prefix: '/app/learn', label: 'Learn' },
  { prefix: '/app/tests', label: 'Tests' },
  { prefix: '/app/social', label: 'Social' },
  { prefix: '/app/post', label: 'Social' },
  { prefix: '/app/profile', label: 'Profile' },
] as const;

function getRouteTitle(pathname: string) {
  return ROUTE_TITLES.find(({ prefix }) => (
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  ))?.label ?? 'Dashboard';
}

/** Fixed Match Control header for the authenticated application shell. */
export function Header({ onMenuToggle, isMenuOpen = false }: HeaderProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const routeTitle = t(getRouteTitle(location.pathname));

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

  return (
    <header className="fixed top-0 right-0 left-0 z-(--mc-z-header) h-[calc(var(--mc-header-height)+var(--mc-safe-top))] border-b border-(--mc-color-border) bg-(--mc-color-surface)/95 pt-[var(--mc-safe-top)] shadow-(--mc-shadow-soft) backdrop-blur-md md:left-20 xl:left-64">
      <a
        href="#app-content"
        className="mc-focus-ring absolute left-3 top-[calc(var(--mc-safe-top)+0.5rem)] z-10 -translate-y-20 rounded-(--mc-radius-button) bg-(--mc-color-accent) px-3 py-2 text-sm font-bold text-(--mc-color-canvas) focus:translate-y-0"
      >
        {t('Skip to main content')}
      </a>

      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <IconButton
          label={t('Open menu')}
          size="md"
          variant="ghost"
          onClick={onMenuToggle}
          aria-controls="app-navigation-menu"
          aria-expanded={isMenuOpen}
          className="md:hidden"
        >
          <Menu className="size-5" />
        </IconButton>

        <button
          type="button"
          onClick={handleLogoClick}
          className="mc-focus-ring flex min-h-11 shrink-0 items-center gap-2 rounded-(--mc-radius-button) px-1 md:hidden"
          aria-label={t('RefLab Home')}
        >
          <img src={logo} alt="" className="h-7 w-auto" aria-hidden="true" />
          <span className="text-lg font-bold tracking-tight text-(--mc-color-text)">RefLab</span>
        </button>

        <div className="hidden min-w-0 flex-1 md:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--mc-color-accent)">
            Match Control
          </p>
          <h1 className="truncate text-base font-semibold text-(--mc-color-text)">
            {routeTitle}
          </h1>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <IconButton
            label={t('Search')}
            size="md"
            variant="ghost"
            onClick={() => navigate('/app/search')}
            className="hidden sm:inline-flex"
          >
            <Search className="size-5" />
          </IconButton>
          <NotificationBell />
        </div>
      </div>

      <span aria-hidden="true" className="absolute bottom-0 left-4 h-0.5 w-10 bg-(--mc-color-accent) md:left-6" />
      <span aria-hidden="true" className="absolute bottom-0 left-14 h-0.5 w-3 bg-(--mc-color-danger) md:left-16" />
    </header>
  );
}
