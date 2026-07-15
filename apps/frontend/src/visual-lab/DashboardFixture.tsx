import DashboardView from '@/features/dashboard/components/DashboardView'
import type { CalendarDay, DashboardStats } from '@/features/dashboard/types'
import FixtureShell from './FixtureShell'

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
    <FixtureShell title="Painel" messageBadge={3}>
      <DashboardView
        stats={dashboardStats}
        displayName="Rafael Martins"
        greetingHour={9}
        onRetry={() => undefined}
        onStartTraining={() => undefined}
      />
    </FixtureShell>
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
