import { Target, Video } from 'lucide-react'
import type { PerformanceStats } from '../types'
import StatCard from './StatCard'
import TopicAccuracyCard from './TopicAccuracyCard'
import AccuracyRing from './AccuracyRing'
import { accuracyColor } from './accuracyColor'
import { useTranslation } from 'react-i18next'

interface PerformanceSectionProps {
  performance: PerformanceStats
}

/**
 * PerformanceSection — Leads with the hero overall-accuracy ring, then topic
 * strengths/weaknesses, then match-simulation and pass-rate as secondary stats.
 */
export default function PerformanceSection({ performance }: PerformanceSectionProps) {
  const { t } = useTranslation()
  const {
    overall_accuracy,
    accuracy_by_topic,
    match_simulation_accuracy,
    pass_rate,
  } = performance

  const ratingLabel =
    overall_accuracy === null
      ? null
      : overall_accuracy >= 80
        ? t('Strong')
        : overall_accuracy >= 60
          ? t('Developing')
          : t('Needs work')

  return (
    <section aria-label={t('Performance metrics')} className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Target size={16} className="text-(--brand-yellow)" aria-hidden="true" />
        <span className="eyebrow">{t('Performance')}</span>
      </div>

      {/* HERO — Overall accuracy ring */}
      <div className="card-console field-lines relative overflow-hidden p-5 sm:p-6">
        {/* flag accent edge */}
        <div className="flag-accent absolute inset-x-0 top-0 h-1" aria-hidden="true" />

        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left sm:gap-6">
          <AccuracyRing value={overall_accuracy} />

          <div className="min-w-0">
            <h2 className="eyebrow mb-1.5">{t('Overall Accuracy')}</h2>
            {overall_accuracy === null ? (
              <p className="text-sm text-(--text-muted) max-w-xs">
                {t('Complete your first test to see accuracy')}
              </p>
            ) : (
              <>
                <p
                  className="text-lg font-bold"
                  style={{ color: accuracyColor(overall_accuracy) }}
                >
                  {ratingLabel}
                </p>
                <p className="text-sm text-(--text-secondary) mt-1 max-w-xs">
                  {t('Your correct-call rate across every question answered.')}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Accuracy by Topic — strengths & weaknesses */}
      <TopicAccuracyCard topics={accuracy_by_topic} />

      {/* Match Sim Accuracy + Pass Rate — secondary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label={t('Match Simulation')}
          value={match_simulation_accuracy}
          suffix="%"
          showBar
          accent
          barPercent={match_simulation_accuracy ?? 0}
          emptyText={t('No video data yet')}
          emptyIcon={<Video size={18} />}
        />
        <StatCard
          label={t('Pass Rate')}
          value={pass_rate}
          suffix="%"
          showBar
          accent
          barPercent={pass_rate ?? 0}
          emptyText={t('Complete tests to see pass rate')}
        />
      </div>
    </section>
  )
}
