import type { ReactNode } from 'react'
import { Bell, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import logo from '@/assets/logos/RefLab-Logo-No-BG.svg'
import { MATCH_NAVIGATION_ITEMS, isMatchNavigationItemActive } from '@/app/shell/navigation'
import MobileTabBar from '@/app/shell/MobileTabBar'

interface FixtureShellProps {
  title: string
  children: ReactNode
  messageBadge?: number
  notificationActive?: boolean
}

export default function FixtureShell({
  title,
  children,
  messageBadge = 0,
  notificationActive = false,
}: FixtureShellProps) {
  return (
    <div className="min-h-dvh bg-(--mc-color-canvas)">
      <FixtureRail />
      <FixtureHeader title={title} notificationActive={notificationActive} />
      <main className="pt-16 pb-18 md:pl-20 md:pb-0 xl:pl-64">
        {children}
      </main>
      <MobileTabBar badges={{ messages: messageBadge }} />
    </div>
  )
}

function FixtureHeader({
  title,
  notificationActive,
}: {
  title: string
  notificationActive: boolean
}) {
  const { t } = useTranslation()

  return (
    <header className="fixed top-0 right-0 left-0 z-40 h-16 border-b border-(--mc-color-border) bg-(--mc-color-surface)/95 backdrop-blur-md md:left-20 xl:left-64">
      <div className="flex h-full items-center gap-2 px-4 sm:px-6">
        <Link to="/app/dashboard" className="flex items-center gap-2 md:hidden" aria-label="RefLab">
          <img src={logo} alt="" className="h-7 w-auto" />
          <span className="text-lg font-bold tracking-tight text-(--mc-color-text)">RefLab</span>
        </Link>
        <div className="hidden min-w-0 flex-1 md:block">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-(--mc-color-accent) uppercase">Match Control</p>
          <h1 className="text-base font-semibold text-(--mc-color-text)">{title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-1 text-(--mc-color-text-secondary)">
          <button type="button" className="mc-focus-ring hidden size-10 place-items-center rounded-(--mc-radius-button) md:grid" aria-label={t('Search')}>
            <Search className="size-5" />
          </button>
          <button
            type="button"
            className={`mc-focus-ring relative grid size-10 place-items-center rounded-(--mc-radius-button) ${notificationActive ? 'text-(--mc-color-accent)' : ''}`}
            aria-label={t('Notifications')}
            aria-current={notificationActive ? 'page' : undefined}
          >
            <Bell className="size-5" />
            {!notificationActive && (
              <span className="absolute top-2 right-2 size-2 rounded-full border border-(--mc-color-surface) bg-(--mc-color-danger)" />
            )}
          </button>
          <span className="ml-1 hidden size-9 items-center justify-center rounded-full bg-(--mc-color-accent) text-xs font-extrabold text-(--mc-color-canvas) md:flex">RM</span>
        </div>
      </div>
      <span className="absolute bottom-0 left-4 h-0.5 w-10 bg-(--mc-color-accent) md:left-6" />
      <span className="absolute bottom-0 left-14 h-0.5 w-3 bg-(--mc-color-danger) md:left-16" />
    </header>
  )
}

function FixtureRail() {
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-20 flex-col border-r border-(--mc-color-border) bg-(--mc-color-surface) md:flex xl:w-64">
      <Link
        to="/app/dashboard"
        aria-label="RefLab"
        className="flex h-16 items-center justify-center gap-3 border-b border-(--mc-color-border) xl:justify-start xl:px-6"
      >
        <img src={logo} alt="" aria-hidden="true" className="h-7 w-auto" />
        <span className="hidden text-xl font-bold text-(--mc-color-text) xl:block">RefLab</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-2 px-2 py-5 xl:px-4" aria-label={t('Main navigation')}>
        {MATCH_NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isMatchNavigationItemActive(location.pathname, item)
          return (
            <Link
              key={item.key}
              to={item.to}
              aria-label={t(item.labelKey)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex h-12 items-center justify-center gap-3 rounded-(--mc-radius-button) px-3 xl:justify-start ${active ? 'border border-(--mc-color-accent)/25 bg-(--mc-color-accent)/10 text-(--mc-color-accent)' : 'text-(--mc-color-text-muted)'}`}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="hidden text-sm font-medium xl:block">{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </nav>
      <div className="m-2 flex min-h-14 items-center justify-center gap-3 rounded-(--mc-radius-button) border border-(--mc-color-border) bg-(--mc-color-surface-raised) p-2 xl:m-4 xl:justify-start xl:p-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-(--mc-color-accent) text-xs font-extrabold text-(--mc-color-canvas)">RM</span>
        <span className="hidden min-w-0 xl:block">
          <span className="block truncate text-sm font-semibold text-(--mc-color-text)">Rafael Martins</span>
          <span className="block truncate text-xs text-(--mc-color-text-muted)">@rafael</span>
        </span>
      </div>
    </aside>
  )
}
