import {
  BookOpen,
  Gauge,
  MessageSquare,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type MatchNavigationKey =
  | 'dashboard'
  | 'learn'
  | 'social'
  | 'messages'
  | 'profile'

export interface MatchNavigationItem {
  key: MatchNavigationKey
  labelKey: 'Dashboard' | 'Learn' | 'Social' | 'Messages' | 'Profile'
  to: string
  icon: LucideIcon
  exactPaths?: readonly string[]
  pathPrefixes?: readonly string[]
  badgeKey?: 'messages'
}

export interface MatchNavigationBadges {
  messages: number
}

export const EMPTY_MATCH_NAVIGATION_BADGES: MatchNavigationBadges = {
  messages: 0,
}

/**
 * The single source of truth for primary Match Control navigation.
 *
 * Secondary routes live with their owning primary destination so active state
 * remains stable while the user moves deeper into a feature.
 */
export const MATCH_NAVIGATION_ITEMS: readonly MatchNavigationItem[] = [
  {
    key: 'dashboard',
    labelKey: 'Dashboard',
    to: '/app/dashboard',
    icon: Gauge,
    exactPaths: ['/app', '/app/dashboard'],
  },
  {
    key: 'learn',
    labelKey: 'Learn',
    to: '/app/learn',
    icon: BookOpen,
    exactPaths: ['/app/tests'],
    pathPrefixes: ['/app/learn'],
  },
  {
    key: 'social',
    labelKey: 'Social',
    to: '/app/social',
    icon: Users,
    pathPrefixes: ['/app/social', '/app/post'],
  },
  {
    key: 'messages',
    labelKey: 'Messages',
    to: '/app/messages',
    icon: MessageSquare,
    pathPrefixes: ['/app/messages'],
    badgeKey: 'messages',
  },
  {
    key: 'profile',
    labelKey: 'Profile',
    to: '/app/profile',
    icon: UserRound,
    pathPrefixes: [
      '/app/profile',
      '/app/settings',
      '/app/pricing',
      '/app/billing',
    ],
  },
]

interface MatchRouteTitle {
  titleKey: string
  exactPaths?: readonly string[]
  pathPrefixes?: readonly string[]
}

const MATCH_ROUTE_TITLES: readonly MatchRouteTitle[] = [
  { titleKey: 'Moderation', pathPrefixes: ['/admin/moderation', '/app/moderation'] },
  { titleKey: 'Notifications', pathPrefixes: ['/app/notifications'] },
  { titleKey: 'Search', pathPrefixes: ['/app/search'] },
  { titleKey: 'Edit Profile', pathPrefixes: ['/app/profile/edit'] },
  { titleKey: 'Settings', pathPrefixes: ['/app/settings'] },
  { titleKey: 'Pricing', pathPrefixes: ['/app/pricing', '/app/billing'] },
  { titleKey: 'Social', pathPrefixes: ['/app/post'] },
]

function normalizePathname(pathname: string): string {
  if (pathname === '/') return pathname
  return pathname.replace(/\/+$/, '')
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  const normalizedPath = normalizePathname(pathname)
  const normalizedPrefix = normalizePathname(prefix)
  return (
    normalizedPath === normalizedPrefix ||
    normalizedPath.startsWith(`${normalizedPrefix}/`)
  )
}

function matchesRoute(
  pathname: string,
  exactPaths: readonly string[] = [],
  pathPrefixes: readonly string[] = [],
): boolean {
  const normalizedPath = normalizePathname(pathname)
  return (
    exactPaths.some((path) => normalizePathname(path) === normalizedPath) ||
    pathPrefixes.some((prefix) => matchesPrefix(normalizedPath, prefix))
  )
}

export function isMatchNavigationItemActive(
  pathname: string,
  item: MatchNavigationItem,
): boolean {
  return matchesRoute(pathname, item.exactPaths, item.pathPrefixes)
}

export function getActiveMatchNavigationItem(
  pathname: string,
): MatchNavigationItem | null {
  return (
    MATCH_NAVIGATION_ITEMS.find((item) =>
      isMatchNavigationItemActive(pathname, item),
    ) ?? null
  )
}

export function getMatchRouteTitleKey(pathname: string): string {
  const specificTitle = MATCH_ROUTE_TITLES.find((route) =>
    matchesRoute(pathname, route.exactPaths, route.pathPrefixes),
  )

  if (specificTitle) return specificTitle.titleKey
  return getActiveMatchNavigationItem(pathname)?.labelKey ?? 'Dashboard'
}

export function getMatchNavigationBadge(
  item: MatchNavigationItem,
  badges: MatchNavigationBadges,
): number {
  if (!item.badgeKey) return 0
  return Math.max(0, Math.floor(badges[item.badgeKey] ?? 0))
}

export function formatMatchNavigationBadge(count: number): string {
  return count > 99 ? '99+' : String(count)
}
