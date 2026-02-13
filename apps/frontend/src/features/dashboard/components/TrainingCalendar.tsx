import { Flame } from 'lucide-react'
import type { CalendarDay } from '../types'

interface TrainingCalendarProps {
  /** 30-day array of { date, active } from the RPC */
  calendar: CalendarDay[]
  /** Current consecutive training streak */
  currentStreak: number
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/**
 * TrainingCalendar — 30-day visual calendar grid showing trained vs rest days.
 * Green circles for trained days, subtle circles for rest, ring highlight on today.
 */
export default function TrainingCalendar({ calendar, currentStreak }: TrainingCalendarProps) {
  // Build cells with padding for weekday alignment
  const cells = buildCalendarCells(calendar)
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div
      className="bg-(--bg-surface) rounded-2xl p-4 shadow-sm border border-(--border-subtle)"
      role="region"
      aria-label="Training calendar"
    >
      {/* Header with title and streak */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[11px] font-bold text-(--text-secondary) uppercase tracking-wider">
          Training Calendar
        </h3>
        <div className="flex items-center gap-1 text-xs font-medium">
          <Flame size={14} className="text-(--brand-yellow)" aria-hidden="true" />
          <span className="text-(--text-muted)">Streak:</span>
          <span className="text-(--brand-yellow)">{currentStreak} {currentStreak === 1 ? 'day' : 'days'}</span>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {DAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="text-[10px] text-(--text-muted) text-center font-medium"
            aria-hidden="true"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) => {
          if (cell === null) {
            // Empty padding cell
            return <div key={`pad-${i}`} className="w-3 h-3 mx-auto" />
          }

          const isToday = cell.date === todayStr

          return (
            <div
              key={cell.date}
              className={`w-3 h-3 rounded-full mx-auto transition-colors ${
                cell.active
                  ? 'bg-(--success)'
                  : 'bg-(--bg-surface-2)'
              } ${
                isToday
                  ? 'ring-2 ring-(--brand-yellow) ring-offset-1 ring-offset-(--bg-surface)'
                  : ''
              }`}
              role="img"
              aria-label={`${cell.date}: ${cell.active ? 'trained' : 'rest day'}${isToday ? ' (today)' : ''}`}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-(--border-subtle)">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-(--success)" aria-hidden="true" />
          <span className="text-[10px] text-(--text-muted)">Trained</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-(--bg-surface-2)" aria-hidden="true" />
          <span className="text-[10px] text-(--text-muted)">Rest</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-(--bg-surface-2) ring-1.5 ring-(--brand-yellow)" aria-hidden="true" />
          <span className="text-[10px] text-(--text-muted)">Today</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Build calendar cells with null padding at the start so days align
 * to their correct weekday columns (0 = Sunday).
 */
function buildCalendarCells(calendar: CalendarDay[]): (CalendarDay | null)[] {
  if (calendar.length === 0) return []

  // Get the day-of-week for the first date (0=Sun, 6=Sat)
  const firstDate = new Date(calendar[0].date + 'T00:00:00')
  const startDow = firstDate.getDay()

  // Pad with nulls so the first date falls on the correct column
  const padding: null[] = Array(startDow).fill(null)

  return [...padding, ...calendar]
}
