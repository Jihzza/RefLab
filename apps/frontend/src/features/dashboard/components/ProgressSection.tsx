import { CircleHelp, ClipboardCheck, Gauge, History, Timer, Trophy, Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ProgressStats } from '../types'
import StatCard from './StatCard'

interface ProgressSectionProps {
  progress: ProgressStats
  matchSimulationAccuracy: number | null
  passRate: number | null
}

export default function ProgressSection({
  progress,
  matchSimulationAccuracy,
  passRate,
}: ProgressSectionProps) {
  const { t } = useTranslation()

  return (
    <section aria-label={t('Progress metrics')}>
      <div className="mb-3 flex items-center gap-2">
        <Gauge className="size-4 text-(--mc-color-accent)" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-(--mc-color-text)">{t('Training metrics')}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label={t('Match Simulation')}
          value={matchSimulationAccuracy}
          suffix="%"
          icon={<Video className="size-4" />}
          showBar
          barPercent={matchSimulationAccuracy ?? 0}
          tone={getAccuracyTone(matchSimulationAccuracy)}
          emptyText={t('No video data yet')}
        />
        <StatCard
          label={t('Pass Rate')}
          value={passRate}
          suffix="%"
          icon={<Gauge className="size-4" />}
          showBar
          barPercent={passRate ?? 0}
          tone={getPassRateTone(passRate)}
          emptyText={t('Complete tests to see pass rate')}
        />
        <StatCard
          label={t('Questions Answered')}
          value={progress.total_questions_answered}
          icon={<CircleHelp className="size-4" />}
          subtext={t('Lifetime total')}
        />
        <StatCard
          label={t('Tests Completed')}
          value={progress.total_tests_completed}
          icon={<ClipboardCheck className="size-4" />}
          subtext={t('Total submissions')}
        />
        <StatCard
          label={t('Tests Passed')}
          value={progress.total_tests_passed}
          icon={<Trophy className="size-4" />}
          subtext={t('With score ≥ 80%')}
          tone="success"
        />
        <StatCard
          label={t('Avg Test Time')}
          value={progress.average_test_duration === null ? null : formatDuration(progress.average_test_duration)}
          icon={<Timer className="size-4" />}
          subtext={t('Average duration')}
          emptyText={t('Complete a test to see stats')}
        />
        <StatCard
          label={t('Last Test Time')}
          value={progress.last_test_duration === null ? null : formatDuration(progress.last_test_duration)}
          icon={<History className="size-4" />}
          subtext={t('Most recent')}
          emptyText={t('No recent tests')}
          className="col-span-2 sm:col-span-1"
        />
      </div>
    </section>
  )
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

function getAccuracyTone(value: number | null): 'success' | 'accent' | 'warning' | 'danger' | 'muted' {
  if (value === null) return 'muted'
  if (value >= 85) return 'success'
  if (value >= 75) return 'accent'
  if (value >= 60) return 'warning'
  return 'danger'
}

function getPassRateTone(value: number | null): 'success' | 'warning' | 'danger' | 'muted' {
  if (value === null) return 'muted'
  if (value >= 80) return 'success'
  if (value >= 60) return 'warning'
  return 'danger'
}
