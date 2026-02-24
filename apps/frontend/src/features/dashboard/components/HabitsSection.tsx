import { CalendarDays, Flame, Trophy, Activity } from 'lucide-react'
import type { HabitStats } from '../types'
import TrainingCalendar from './TrainingCalendar'
import { useTranslation } from 'react-i18next'

interface HabitsSectionProps {
  habits: HabitStats
}

/**
 * HabitsSection — Displays training calendar, current streak,
 * longest streak, and active days (last 7).
 */
export default function HabitsSection({ habits }: HabitsSectionProps) {
  const { t } = useTranslation()
  const {
    calendar,
    current_streak,
    longest_streak,
    active_days_last_7,
  } = habits

  return (
    <section aria-label={t('Training habits')} className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <CalendarDays size={18} className="text-(--text-muted)" aria-hidden="true" />
        <h2 className="text-base font-semibold text-(--text-primary)">{t('Habits')}</h2>
      </div>

      {/* Training Calendar — full width */}
      <TrainingCalendar calendar={calendar} currentStreak={current_streak} />

      {/* Streak stats — 3 column grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Current Streak */}
        <div
          className="bg-(--bg-surface) rounded-2xl p-3 shadow-sm border border-(--border-subtle) flex flex-col items-center justify-center text-center"
          role="region"
          aria-label={t('Current streak')}
        >
          <Flame size={16} className="text-(--brand-yellow) mb-1.5" aria-hidden="true" />
          <span className="text-2xl font-extrabold text-(--brand-yellow)">
            {current_streak}
          </span>
          <span className="text-[10px] text-(--text-muted) mt-0.5">
            {current_streak === 1 ? t('day streak') : t('days streak')}
          </span>
        </div>

        {/* Longest Streak */}
        <div
          className="bg-(--bg-surface) rounded-2xl p-3 shadow-sm border border-(--border-subtle) flex flex-col items-center justify-center text-center"
          role="region"
          aria-label={t('Longest streak')}
        >
          <Trophy size={16} className="text-(--text-muted) mb-1.5" aria-hidden="true" />
          <span className="text-2xl font-extrabold text-(--text-primary)">
            {longest_streak}
          </span>
          <span className="text-[10px] text-(--text-muted) mt-0.5">
            {t('best streak')}
          </span>
        </div>

        {/* Active Days Last 7 */}
        <div
          className="bg-(--bg-surface) rounded-2xl p-3 shadow-sm border border-(--border-subtle) flex flex-col items-center justify-center text-center"
          role="region"
          aria-label={t('Active days this week')}
        >
          <Activity size={16} className="text-(--text-muted) mb-1.5" aria-hidden="true" />
          <span className="text-2xl font-extrabold text-(--text-primary)">
            {active_days_last_7}<span className="text-sm font-medium text-(--text-muted)">/7</span>
          </span>
          <span className="text-[10px] text-(--text-muted) mt-0.5">
            {t('active days')}
          </span>
        </div>
      </div>
    </section>
  )
}
