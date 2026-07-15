import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavigationBadge from './NavigationBadge'
import {
  EMPTY_MATCH_NAVIGATION_BADGES,
  MATCH_NAVIGATION_ITEMS,
  getMatchNavigationBadge,
  isMatchNavigationItemActive,
  type MatchNavigationBadges,
} from './navigation'

interface MobileTabBarProps {
  badges?: MatchNavigationBadges
}

export default function MobileTabBar({
  badges = EMPTY_MATCH_NAVIGATION_BADGES,
}: MobileTabBarProps) {
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <nav
      className="fixed right-0 bottom-0 left-0 z-50 border-t border-(--border-subtle) bg-(--bg-surface)/95 backdrop-blur-md md:hidden"
      aria-label={t('Primary navigation')}
    >
      <div className="grid min-h-18 grid-cols-5 pb-[env(safe-area-inset-bottom)]">
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
              className={
                isActive
                  ? 'relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 pt-2 text-(--brand-yellow)'
                  : 'relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 pt-2 text-(--text-muted) transition-colors hover:text-(--text-secondary)'
              }
              aria-current={isActive ? 'page' : undefined}
              aria-label={
                badgeCount > 0 ? `${label} (${badgeCount})` : label
              }
            >
              {isActive && (
                <span
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-(--brand-yellow)"
                  aria-hidden="true"
                />
              )}

              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
                <NavigationBadge
                  count={badgeCount}
                  className="absolute -top-2 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--brand-red) px-1 text-[9px] font-bold leading-none text-white"
                />
              </span>

              <span className="max-w-full truncate text-[10px] font-medium">
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
