import { Menu, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import logo from '@/assets/logos/RefLab-Logo-No-BG.svg'
import { Avatar, IconButton } from '@/components/ui'
import NotificationBell from '@/features/notifications/components/NotificationBell'
import { useAuth } from '@/features/auth/components/useAuth'
import { getMatchRouteTitleKey } from './navigation'

interface MatchHeaderProps {
  onMenuToggle?: () => void
  menuOpen?: boolean
}

export default function MatchHeader({ menuOpen = false, onMenuToggle }: MatchHeaderProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const { profile, user } = useAuth()

  const title = t(getMatchRouteTitleKey(location.pathname))
  const displayName =
    profile?.name ||
    profile?.username ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    t('Profile')
  const profileAvatarUrl = profile?.photo_url ?? null
  const providerAvatarUrl = typeof user?.user_metadata?.avatar_url === 'string'
    ? user.user_metadata.avatar_url
    : null

  return (
    <header className="fixed top-0 right-0 left-0 z-40 h-[calc(var(--mc-header-height)+var(--mc-safe-top))] border-b border-(--border-subtle) bg-(--bg-surface)/95 pt-[var(--mc-safe-top)] shadow-(--shadow-soft) backdrop-blur-md md:left-20 xl:left-64">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6">
        {onMenuToggle && (
          <IconButton
            label={t('Open menu')}
            size="md"
            variant="ghost"
            onClick={onMenuToggle}
            aria-controls="app-navigation-menu"
            aria-expanded={menuOpen}
          >
            <Menu className="h-5 w-5" />
          </IconButton>
        )}

        <Link
          to="/app/dashboard"
          className="flex shrink-0 items-center gap-2 rounded-(--radius-button) md:hidden"
          aria-label={t('RefLab Home')}
        >
          <img src={logo} alt="" className="h-7 w-auto" aria-hidden="true" />
          <span className="text-lg font-bold tracking-tight text-(--text-primary)">
            RefLab
          </span>
        </Link>

        <div className="hidden h-7 w-px bg-(--border-subtle) md:block" />

        <h1 className="sr-only md:hidden">{title}</h1>

        <div className="hidden min-w-0 flex-1 md:block md:pl-1">
          <p className="hidden text-[10px] font-semibold tracking-[0.18em] text-(--brand-yellow) uppercase md:block">
            Match Control
          </p>
          <h1 className="truncate text-sm font-semibold text-(--text-primary) md:text-base">
            {title}
          </h1>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            to="/app/search"
            className="hidden h-10 w-10 items-center justify-center rounded-(--radius-button) text-(--text-secondary) transition-colors hover:bg-(--bg-hover) hover:text-(--brand-yellow) sm:flex"
            aria-label={t('Search')}
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </Link>

          <NotificationBell />

          <Link
            to="/app/profile"
            className="ml-1 hidden h-10 min-w-10 items-center justify-center rounded-full border border-(--border-subtle) bg-(--bg-surface-2) text-(--text-primary) transition-colors hover:border-(--brand-yellow) md:flex"
            aria-label={t('Profile')}
          >
            <Avatar
              src={profileAvatarUrl}
              ownerId={profile?.id ?? user?.id}
              providerSrc={providerAvatarUrl}
              name={displayName}
              alt={displayName}
              size="sm"
              allowAuthProviderImage
              className="size-9 border-0"
            />
          </Link>
        </div>
      </div>

      <div className="absolute bottom-0 left-4 h-0.5 w-10 bg-(--brand-yellow) md:left-6" />
      <div className="absolute bottom-0 left-14 h-0.5 w-3 bg-(--brand-red) md:left-16" />
    </header>
  )
}
