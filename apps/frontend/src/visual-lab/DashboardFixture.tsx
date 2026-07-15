import { Bell, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import logo from '@/assets/logos/RefLab-Logo-No-BG.svg'
import { MATCH_NAVIGATION_ITEMS, isMatchNavigationItemActive } from '@/app/shell/navigation'
import MobileTabBar from '@/app/shell/MobileTabBar'
import DashboardView from '@/features/dashboard/components/DashboardView'
import type { CalendarDay, DashboardStats } from '@/features/dashboard/types'

const dashboardStats: DashboardStats = {
  performance: {
    overall_accuracy: 84,
    accuracy_by_topic: [
      { topic: 'Offside', accuracy: 91, total_questions: 44 },
      { topic: 'Fouls and Misconduct', accuracy: 78, total_questions: 56 },
      { topic: 'VAR', accuracy: 72, total_questions: 25 },
      { topic: 'Handball', accuracy: 81, total_questions: 31 },
      { topic: 'Free Kicks', accuracy: 76, total_questions: 29 },
      { topic: 'Penalty Kicks', accuracy: 88, total_questions: 22 },
      { topic: 'Cards and Discipline', accuracy: 83, total_questions: 35 },
    ],
    match_simulation_accuracy: 82,
    pass_rate: 80,
  },
  progress: {
    accuracy_change: 6,
    accuracy_this_week: 84,
    accuracy_last_week: 78,
    total_questions_answered: 242,
    total_tests_completed: 15,
    total_tests_passed: 12,
    average_test_duration: 486,
    last_test_duration: 452,
  },
  habits: {
    calendar: buildCalendar(),
    current_streak: 7,
    longest_streak: 12,
    active_days_last_7: 6,
  },
}

export default function DashboardFixture() {
  return (
    <div className="min-h-dvh bg-(--mc-color-canvas)">
      <FixtureRail />
      <FixtureHeader />
      <main className="pt-16 pb-18 md:pl-20 md:pb-0 xl:pl-64">
        <DashboardView
          stats={dashboardStats}
          displayName="Rafael Martins"
          greetingHour={9}
          onRetry={() => undefined}
          onStartTraining={() => undefined}
        />
      </main>
      <MobileTabBar badges={{ messages: 3 }} />
    </div>
  )
}

function FixtureHeader() {
  return (
    <header className="fixed top-0 right-0 left-0 z-40 h-16 border-b border-(--mc-color-border) bg-(--mc-color-surface)/95 backdrop-blur-md md:left-20 xl:left-64">
      <div className="flex h-full items-center gap-2 px-4 sm:px-6">
        <Link to="/app/dashboard" className="flex items-center gap-2 md:hidden" aria-label="RefLab">
          <img src={logo} alt="" className="h-7 w-auto" />
          <span className="text-lg font-bold tracking-tight text-(--mc-color-text)">RefLab</span>
        </Link>
        <div className="hidden min-w-0 flex-1 md:block">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-(--mc-color-accent) uppercase">Match Control</p>
          <h1 className="text-base font-semibold text-(--mc-color-text)">Painel</h1>
        </div>
        <div className="ml-auto flex items-center gap-1 text-(--mc-color-text-secondary)">
          <button type="button" className="grid size-10 place-items-center rounded-(--mc-radius-button)" aria-label="Pesquisar">
            <Search className="size-5" />
          </button>
          <button type="button" className="relative grid size-10 place-items-center rounded-(--mc-radius-button)" aria-label="Notificações">
            <Bell className="size-5" />
            <span className="absolute top-2 right-2 size-2 rounded-full border border-(--mc-color-surface) bg-(--mc-color-danger)" />
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
  const location = useLocation()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-20 flex-col border-r border-(--mc-color-border) bg-(--mc-color-surface) md:flex xl:w-64">
      <Link to="/app/dashboard" className="flex h-16 items-center justify-center gap-3 border-b border-(--mc-color-border) xl:justify-start xl:px-6">
        <img src={logo} alt="" className="h-7 w-auto" />
        <span className="hidden text-xl font-bold text-(--mc-color-text) xl:block">RefLab</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-2 px-2 py-5 xl:px-4" aria-label="Navegação principal">
        {MATCH_NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isMatchNavigationItemActive(location.pathname, item)
          return (
            <Link
              key={item.key}
              to={item.to}
              className={`relative flex h-12 items-center justify-center gap-3 rounded-(--mc-radius-button) px-3 xl:justify-start ${active ? 'border border-(--mc-color-accent)/25 bg-(--mc-color-accent)/10 text-(--mc-color-accent)' : 'text-(--mc-color-text-muted)'}`}
            >
              <Icon className="size-5 shrink-0" />
              <span className="hidden text-sm font-medium xl:block">{item.labelKey}</span>
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

function buildCalendar(): CalendarDay[] {
  const activeDays = new Set([0, 2, 3, 5, 7, 9, 10, 12, 14, 16, 17, 19, 21, 22, 23, 25, 26, 27, 28, 29])

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 5, 16 + index))
    return {
      date: date.toISOString().slice(0, 10),
      active: activeDays.has(index),
    }
  })
}
