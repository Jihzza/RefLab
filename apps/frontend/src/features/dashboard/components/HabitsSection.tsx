import { CalendarDays, ClipboardCheck, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Surface from '@/components/ui/Surface'
import type { CalendarDay, HabitStats } from '../types'

interface HabitsSectionProps {
  habits: HabitStats
}

export default function HabitsSection({ habits }: HabitsSectionProps) {
  const { t } = useTranslation()
  const recentWeek = padWeek(habits.calendar.slice(-7))

  return (
    <section aria-label={t('Training habits')} className="grid grid-cols-2 gap-3 sm:gap-4">
      <Surface
        padding="sm"
        className="min-h-[108px] border-(--mc-color-border-strong) shadow-none sm:p-4"
        role="region"
        aria-label={t('Current streak')}
      >
        <div className="flex items-start gap-2.5">
          <CalendarDays className="mt-0.5 size-5 shrink-0 text-(--mc-color-accent)" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-xs text-(--mc-color-text-secondary)">{t('Current streak')}</p>
            <p className="mt-0.5 text-xl font-bold leading-tight text-(--mc-color-accent) sm:text-2xl">
              {habits.current_streak} {habits.current_streak === 1 ? t('day') : t('days')}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5" aria-hidden="true">
            {recentWeek.map((day, index) => (
              <span
                key={day?.date ?? `empty-${index}`}
                className={`size-2.5 rounded-full sm:size-3 ${day?.active ? 'bg-(--mc-color-accent)' : 'bg-(--mc-color-surface-raised)'}`}
              />
            ))}
          </div>
          <span className="flex items-center gap-1 text-[10px] text-(--mc-color-text-muted)">
            <Trophy className="size-3" aria-hidden="true" />
            {t('Best')}: {habits.longest_streak}
          </span>
        </div>
      </Surface>

      <Surface
        padding="sm"
        className="min-h-[108px] border-(--mc-color-border-strong) shadow-none sm:p-4"
        role="region"
        aria-label={t('Active days this week')}
      >
        <div className="flex items-start gap-2.5">
          <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-(--mc-color-accent)" aria-hidden="true" />
          <div className="min-w-0">
            <p className="line-clamp-2 text-xs leading-4 text-(--mc-color-text-secondary)">{t('Active days this week')}</p>
            <p className="mt-0.5 text-xl font-bold leading-tight text-(--mc-color-accent) sm:text-2xl">
              {Math.min(Math.max(habits.active_days_last_7, 0), 7)}<span className="text-base text-(--mc-color-text-muted)">/7</span>
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1" aria-hidden="true">
          {Array.from({ length: 7 }, (_, index) => (
            <span
              key={index}
              className={`h-1.5 rounded-sm ${index < habits.active_days_last_7 ? 'bg-(--mc-color-accent)' : 'bg-(--mc-color-surface-raised)'}`}
            />
          ))}
        </div>
      </Surface>
    </section>
  )
}

function padWeek(days: CalendarDay[]): Array<CalendarDay | null> {
  return [...Array<null>(Math.max(7 - days.length, 0)).fill(null), ...days]
}
