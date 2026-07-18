import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import logo from '@/assets/logos/RefLab-Logo-No-BG.svg'
import { Avatar } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import NavigationBadge from './NavigationBadge'
import {
  EMPTY_MATCH_NAVIGATION_BADGES,
  MATCH_NAVIGATION_ITEMS,
  getMatchNavigationBadge,
  isMatchNavigationItemActive,
  type MatchNavigationBadges,
} from './navigation'

interface ResponsiveRailProps {
  badges?: MatchNavigationBadges
}

export default function ResponsiveRail({
  badges = EMPTY_MATCH_NAVIGATION_BADGES,
}: ResponsiveRailProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const { profile, user } = useAuth()

  const displayName =
    profile?.name ||
    profile?.username ||
    user?.email?.split('@')[0] ||
    t('Profile')
  const username = profile?.username || user?.user_metadata?.username || ''
  const profileAvatarUrl = profile?.photo_url ?? null
  const providerAvatarUrl = typeof user?.user_metadata?.avatar_url === 'string'
    ? user.user_metadata.avatar_url
    : null

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-20 flex-col border-r border-(--border-subtle) bg-(--bg-surface) md:flex xl:w-64">
      <Link
        to="/app/dashboard"
        className="relative flex h-16 shrink-0 items-center justify-center gap-3 border-b border-(--border-subtle) px-4 xl:justify-start xl:px-6"
        aria-label={t('RefLab Home')}
      >
        <img src={logo} alt="" className="h-7 w-auto" aria-hidden="true" />
        <span className="hidden text-xl font-bold tracking-tight text-(--text-primary) xl:block">
          RefLab
        </span>
        <span
          className="absolute right-0 bottom-0 left-0 h-0.5 bg-linear-to-r from-(--brand-yellow) via-(--brand-red) to-transparent"
          aria-hidden="true"
        />
      </Link>

      <nav
        className="flex flex-1 flex-col gap-2 px-2 py-5 xl:px-4"
        aria-label={t('Sidebar')}
      >
        {MATCH_NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon
          const label = t(item.labelKey)
          const isActive = isMatchNavigationItemActive(
            location.pathname,
            item,
          )
          const badgeCount = getMatchNavigationBadge(item, badges)

          return (
            <Link
              key={item.key}
              to={item.to}
              title={label}
              className={
                isActive
                  ? 'group relative flex h-12 items-center justify-center gap-3 overflow-hidden rounded-(--radius-button) border border-(--brand-yellow)/25 bg-(--brand-yellow)/10 px-3 text-(--brand-yellow) xl:justify-start'
                  : 'group relative flex h-12 items-center justify-center gap-3 rounded-(--radius-button) border border-transparent px-3 text-(--text-muted) transition-colors hover:border-(--border-subtle) hover:bg-(--bg-hover) hover:text-(--text-primary) xl:justify-start'
              }
              aria-current={isActive ? 'page' : undefined}
              aria-label={
                badgeCount > 0 ? `${label} (${badgeCount})` : label
              }
            >
              {isActive && (
                <span
                  className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-(--brand-yellow)"
                  aria-hidden="true"
                />
              )}

              <span className="relative shrink-0">
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
                <NavigationBadge
                  count={badgeCount}
                  className="absolute -top-2 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--brand-red) px-1 text-[9px] font-bold leading-none text-white xl:hidden"
                />
              </span>

              <span className="hidden min-w-0 flex-1 truncate text-sm font-medium xl:block">
                {label}
              </span>

              <NavigationBadge
                count={badgeCount}
                className="hidden h-5 min-w-5 items-center justify-center rounded-full bg-(--brand-red) px-1.5 text-[10px] font-bold leading-none text-white xl:flex"
              />
            </Link>
          )
        })}
      </nav>

      <Link
        to="/app/profile"
        className="m-2 flex min-h-14 items-center justify-center gap-3 rounded-(--radius-button) border border-(--border-subtle) bg-(--bg-surface-2) p-2 transition-colors hover:border-(--brand-yellow)/50 xl:m-4 xl:justify-start xl:p-3"
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
          className="size-9"
        />

        <span className="hidden min-w-0 xl:block">
          <span className="block truncate text-sm font-semibold text-(--text-primary)">
            {displayName}
          </span>
          {username && (
            <span className="block truncate text-xs text-(--text-muted)">
              @{username}
            </span>
          )}
        </span>
      </Link>
    </aside>
  )
}
