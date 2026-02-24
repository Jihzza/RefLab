import { TrendingUp, TrendingDown, Minus, PlayCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ProgressStats } from '../types'
import StatCard from './StatCard'
import { useTranslation } from 'react-i18next'

interface ProgressSectionProps {
  progress: ProgressStats
}

/**
 * ProgressSection — Displays accuracy change (delta), total questions answered,
 * and total tests passed.
 */
export default function ProgressSection({ progress }: ProgressSectionProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    accuracy_change,
    total_questions_answered,
    total_tests_completed,
    total_tests_passed,
    average_test_duration,
    last_test_duration,
  } = progress

  return (
    <section aria-label={t('Progress metrics')} className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <TrendingUp size={18} className="text-(--text-muted)" aria-hidden="true" />
        <h2 className="text-base font-semibold text-(--text-primary)">{t('Progress')}</h2>
      </div>

      {/* Accuracy Change + Total Questions — 2 column grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Accuracy Change — special card with colored delta */}
        <AccuracyChangeCard change={accuracy_change} />

        <StatCard
          label={t('Questions Answered')}
          value={total_questions_answered}
          valueColor="text-(--text-primary)"
          subtext={t('Lifetime total')}
        />
      </div>

      {/* Tests Completed + Tests Passed — 2 column grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label={t('Tests Completed')}
          value={total_tests_completed}
          valueColor="text-(--text-primary)"
          subtext={t('Total submissions')}
        />
        <StatCard
          label={t('Tests Passed')}
          value={total_tests_passed}
          valueColor="text-(--text-primary)"
          subtext={t('With score ≥ 80%')}
        />
      </div>

      {/* Test Timing Metrics — 2 column grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label={t('Avg Test Time')}
          value={average_test_duration !== null ? formatDuration(average_test_duration) : '—'}
          valueColor="text-(--text-primary)"
          subtext={t('Average duration')}
          emptyText={t('Complete a test to see stats')}
        />
        <StatCard
          label={t('Last Test Time')}
          value={last_test_duration !== null ? formatDuration(last_test_duration) : '—'}
          valueColor="text-(--text-primary)"
          subtext={t('Most recent')}
          emptyText={t('No recent tests')}
        />
      </div>

      {/* Quick Start Test Button */}
      <button
        onClick={() => navigate('/app/learn?action=start-test')}
        className="w-full mt-2 py-3 bg-(--info) text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        <PlayCircle size={18} />
        {t('Start New Test')}
      </button>
    </section>
  )
}

/**
 * Format duration from seconds to MM:SS
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * AccuracyChangeCard — Shows the weekly accuracy delta with colored indicator.
 * Positive = green with up arrow, negative = red with down arrow, null = muted.
 */
function AccuracyChangeCard({ change }: { change: number | null }) {
  const { t } = useTranslation()
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
      aria-label={t('Accuracy change')}
    >
      <h3 className="text-[11px] font-bold text-(--text-secondary) uppercase tracking-wider mb-2">
        {t('Accuracy Change')}
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
        {change !== null ? t('vs. last week') : t('Not enough data yet')}
      </p>
    </div>
  )
}
