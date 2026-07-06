import { TrendingUp, TrendingDown, Minus, PlayCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ProgressStats } from '../types'
import StatCard from './StatCard'
import Button from '@/components/ui/Button'
import { useTranslation } from 'react-i18next'

interface ProgressSectionProps {
  progress: ProgressStats
}

/**
 * ProgressSection — Displays accuracy change (delta), lifetime volume,
 * test outcomes, timing metrics, and the primary "start a test" call to action.
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
        <TrendingUp size={16} className="text-(--brand-yellow)" aria-hidden="true" />
        <span className="eyebrow">{t('Progress')}</span>
      </div>

      {/* Metric grid — responsive 2-up on mobile, 3-up on larger screens */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {/* Accuracy Change — special card with colored delta */}
        <AccuracyChangeCard change={accuracy_change} />

        <StatCard
          label={t('Questions Answered')}
          value={total_questions_answered}
          subtext={t('Lifetime total')}
        />

        <StatCard
          label={t('Tests Completed')}
          value={total_tests_completed}
          subtext={t('Total submissions')}
        />

        <StatCard
          label={t('Tests Passed')}
          value={total_tests_passed}
          subtext={t('With score ≥ 80%')}
        />

        <StatCard
          label={t('Avg Test Time')}
          value={average_test_duration !== null ? formatDuration(average_test_duration) : '—'}
          subtext={t('Average duration')}
          emptyText={t('Complete a test to see stats')}
        />

        <StatCard
          label={t('Last Test Time')}
          value={last_test_duration !== null ? formatDuration(last_test_duration) : '—'}
          subtext={t('Most recent')}
          emptyText={t('No recent tests')}
        />
      </div>

      {/* Next action — primary CTA */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        leftIcon={<PlayCircle size={18} />}
        onClick={() => navigate('/app/learn?action=start-test')}
      >
        {t('Start New Test')}
      </Button>
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
      className="card-console p-4 flex flex-col"
      role="region"
      aria-label={t('Accuracy change')}
    >
      <h3 className="eyebrow mb-2">{t('Accuracy Change')}</h3>

      <div className="flex-1 flex items-center gap-1.5 py-1">
        {change !== null ? (
          <>
            <Icon size={22} className={color} aria-hidden="true" />
            <span className={`numeral text-4xl font-black leading-none tracking-tight ${color}`}>
              {prefix}{change}%
            </span>
          </>
        ) : (
          <span className="numeral text-4xl font-black leading-none tracking-tight text-(--text-faint)">
            —
          </span>
        )}
      </div>

      <p className="text-[11px] text-(--text-muted) mt-2">
        {change !== null ? t('vs. last week') : t('Not enough data yet')}
      </p>
    </div>
  )
}
