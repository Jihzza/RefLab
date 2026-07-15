import { Flame } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Surface from '@/components/ui/Surface'
import type { CalendarDay } from '../types'

interface TrainingCalendarProps {
  calendar: CalendarDay[]
  currentStreak: number
}

export default function TrainingCalendar({ calendar, currentStreak }: TrainingCalendarProps) {
  const { t, i18n } = useTranslation()
  const cells = buildCalendarCells(calendar)
  const today = formatLocalDate(new Date())
  const dayLabels = getDayLabels(i18n.resolvedLanguage ?? 'pt-PT')

  return (
    <Surface
      padding="md"
      className="border-(--mc-color-border-strong) shadow-none"
      role="region"
      aria-label={t('Training calendar')}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-(--mc-color-text)">{t('Training Calendar')}</h2>
        <div className="flex items-center gap-1.5 text-xs">
          <Flame className="size-4 text-(--mc-color-accent)" aria-hidden="true" />
          <span className="text-(--mc-color-text-muted)">{t('Streak:')}</span>
          <span className="font-semibold text-(--mc-color-accent)">
            {currentStreak} {currentStreak === 1 ? t('day') : t('days')}
          </span>
        </div>
      </div>

      {calendar.length > 0 ? (
        <>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {dayLabels.map((label, index) => (
              <span key={`${label}-${index}`} className="pb-1 text-center text-[10px] font-medium text-(--mc-color-text-muted)" aria-hidden="true">
                {label}
              </span>
            ))}

            {cells.map((cell, index) => {
              if (!cell) return <span key={`pad-${index}`} className="mx-auto size-3" aria-hidden="true" />
              const isToday = cell.date === today

              return (
                <span
                  key={cell.date}
                  className={`mx-auto size-3 rounded-sm sm:size-3.5 ${cell.active ? 'bg-(--mc-color-accent)' : 'bg-(--mc-color-surface-raised)'} ${isToday ? 'ring-2 ring-(--mc-color-text) ring-offset-1 ring-offset-(--mc-color-surface)' : ''}`}
                  role="img"
                  aria-label={`${cell.date}: ${cell.active ? t('trained') : t('rest day')}${isToday ? ` (${t('today')})` : ''}`}
                />
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-(--mc-color-border) pt-3">
            <Legend colorClass="bg-(--mc-color-accent)" label={t('Trained')} />
            <Legend colorClass="bg-(--mc-color-surface-raised)" label={t('Rest')} />
            <Legend colorClass="bg-(--mc-color-surface-raised) ring-1 ring-(--mc-color-text)" label={t('Today')} />
          </div>
        </>
      ) : (
        <p className="py-5 text-center text-xs text-(--mc-color-text-muted)">{t('No data yet')}</p>
      )}
    </Surface>
  )
}

function Legend({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-(--mc-color-text-muted)">
      <span className={`size-2.5 rounded-sm ${colorClass}`} aria-hidden="true" />
      {label}
    </span>
  )
}

function buildCalendarCells(calendar: CalendarDay[]): Array<CalendarDay | null> {
  if (calendar.length === 0) return []
  const firstDate = new Date(`${calendar[0].date}T00:00:00`)
  const padding = Array<null>(firstDate.getDay()).fill(null)
  return [...padding, ...calendar]
}

function getDayLabels(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
  const sunday = new Date(2024, 0, 7)
  return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(2024, 0, sunday.getDate() + index)))
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}
