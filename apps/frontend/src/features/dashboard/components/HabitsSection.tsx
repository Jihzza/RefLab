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
        <CalendarDays size={16} className="text-(--brand-yellow)" aria-hidden="true" />
        <span className="eyebrow">{t('Habits')}</span>
      </div>

      {/* Training Calendar — full width */}
      <TrainingCalendar calendar={calendar} currentStreak={current_streak} />

      {/* Streak stats — 3 column grid */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {/* Current Streak */}
        <div
          className="card-console p-3.5 flex flex-col items-center justify-center text-center"
          role="region"
          aria-label={t('Current streak')}
        >
          <Flame size={18} className="text-(--brand-yellow) mb-1.5" aria-hidden="true" />
          <span className="numeral text-3xl font-black text-(--brand-yellow) leading-none">
            {current_streak}
          </span>
          <span className="text-[10px] text-(--text-muted) mt-1.5">
            {current_streak === 1 ? t('day streak') : t('days streak')}
          </span>
        </div>

        {/* Longest Streak */}
        <div
          className="card-console p-3.5 flex flex-col items-center justify-center text-center"
          role="region"
          aria-label={t('Longest streak')}
        >
          <Trophy size={18} className="text-(--text-faint) mb-1.5" aria-hidden="true" />
          <span className="numeral text-3xl font-black text-(--text-primary) leading-none">
            {longest_streak}
          </span>
          <span className="text-[10px] text-(--text-muted) mt-1.5">
            {t('best streak')}
          </span>
        </div>

        {/* Active Days Last 7 */}
        <div
          className="card-console p-3.5 flex flex-col items-center justify-center text-center"
          role="region"
          aria-label={t('Active days this week')}
        >
          <Activity size={18} className="text-(--text-faint) mb-1.5" aria-hidden="true" />
          <span className="numeral text-3xl font-black text-(--text-primary) leading-none">
            {active_days_last_7}<span className="text-base font-bold text-(--text-faint)">/7</span>
          </span>
          <span className="text-[10px] text-(--text-muted) mt-1.5">
            {t('active days')}
          </span>
        </div>
      </div>
    </section>
  )
}
