import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { ProgressStats } from '../types'
import StatCard from './StatCard'

interface ProgressSectionProps {
  progress: ProgressStats
}

/**
 * ProgressSection — Displays accuracy change (delta), total questions answered,
 * and total tests passed.
 */
export default function ProgressSection({ progress }: ProgressSectionProps) {
  const {
    accuracy_change,
    total_questions_answered,
    total_tests_completed,
    total_tests_passed,
  } = progress

  return (
    <section aria-label="Progress metrics" className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <TrendingUp size={18} className="text-(--text-muted)" aria-hidden="true" />
        <h2 className="text-base font-semibold text-(--text-primary)">Progress</h2>
      </div>

      {/* Accuracy Change + Total Questions — 2 column grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Accuracy Change — special card with colored delta */}
        <AccuracyChangeCard change={accuracy_change} />

        <StatCard
          label="Questions Answered"
          value={total_questions_answered}
          valueColor="text-(--text-primary)"
          subtext="Lifetime total"
        />
      </div>

      {/* Tests Completed + Tests Passed — 2 column grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Tests Completed"
          value={total_tests_completed}
          valueColor="text-(--text-primary)"
          subtext="Total submissions"
        />
        <StatCard
          label="Tests Passed"
          value={total_tests_passed}
          valueColor="text-(--text-primary)"
          subtext="With score &ge; 80%"
        />
      </div>
    </section>
  )
}

/**
 * AccuracyChangeCard — Shows the weekly accuracy delta with colored indicator.
 * Positive = green with up arrow, negative = red with down arrow, null = muted.
 */
function AccuracyChangeCard({ change }: { change: number | null }) {
  // Determine color and icon based on delta direction
  let color = 'text-(--text-muted)'
  let Icon = Minus
  let prefix = ''

  if (change !== null) {
    if (change > 0) {
      color = 'text-(--success)'
      Icon = TrendingUp
      prefix = '+'
    } else if (change < 0) {
      color = 'text-(--error)'
      Icon = TrendingDown
      prefix = ''  // negative sign comes from the number
    }
  }

  return (
    <div
      className="bg-(--bg-surface) rounded-2xl p-4 shadow-sm border border-(--border-subtle) flex flex-col"
      role="region"
      aria-label="Accuracy change"
    >
      <h3 className="text-[11px] font-bold text-(--text-secondary) uppercase tracking-wider mb-2">
        Accuracy Change
      </h3>

      <div className="flex-1 flex items-center justify-center gap-1.5 py-1">
        {change !== null ? (
          <>
            <Icon size={20} className={color} aria-hidden="true" />
            <span className={`text-3xl font-extrabold tracking-tight ${color}`}>
              {prefix}{change}%
            </span>
          </>
        ) : (
          <span className="text-3xl font-extrabold tracking-tight text-(--text-muted)">
            —
          </span>
        )}
      </div>

      <p className="text-[10px] text-(--text-muted) mt-2 text-center">
        {change !== null ? 'vs. last week' : 'Not enough data yet'}
      </p>
    </div>
  )
}
