import { Target, Video } from 'lucide-react'
import type { PerformanceStats } from '../types'
import StatCard from './StatCard'
import TopicAccuracyCard from './TopicAccuracyCard'
import { useTranslation } from 'react-i18next'

interface PerformanceSectionProps {
  performance: PerformanceStats
}

/**
 * PerformanceSection — Displays overall accuracy, accuracy by topic,
 * match simulation accuracy, and pass rate metrics.
 */
export default function PerformanceSection({ performance }: PerformanceSectionProps) {
  const { t } = useTranslation()
  const {
    overall_accuracy,
    accuracy_by_topic,
    match_simulation_accuracy,
    pass_rate,
  } = performance

  return (
    <section aria-label={t('Performance metrics')} className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Target size={18} className="text-(--text-muted)" aria-hidden="true" />
        <h2 className="text-base font-semibold text-(--text-primary)">{t('Performance')}</h2>
      </div>

      {/* Overall Accuracy — full width */}
      <StatCard
        label={t('Overall Accuracy')}
        value={overall_accuracy}
        suffix="%"
        showBar
        barPercent={overall_accuracy ?? 0}
        emptyText={t('Complete your first test to see accuracy')}
      />

      {/* Accuracy by Topic — full width list */}
      <TopicAccuracyCard topics={accuracy_by_topic} />

      {/* Match Sim Accuracy + Pass Rate — 2 column grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label={t('Match Simulation')}
          value={match_simulation_accuracy}
          suffix="%"
          showBar
          barPercent={match_simulation_accuracy ?? 0}
          emptyText={t('No video data yet')}
          emptyIcon={<Video size={18} />}
        />
        <StatCard
          label={t('Pass Rate')}
          value={pass_rate}
          suffix="%"
          showBar
          barPercent={pass_rate ?? 0}
          emptyText={t('Complete tests to see pass rate')}
        />
      </div>
    </section>
  )
}
