import { useCallback, useEffect, useState } from 'react'
import { BarChart3, Clock, History, Play, TrendingUp, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Surface } from '@/components/ui'
import { getTestKPIs } from '../../api/testsApi'
import { formatTime } from '../../hooks/useTestTimer'
import type { TestKPIs } from '../../types'
import { LearningError, LearningMetric, LearningSectionHeading, MatchAccent } from '../LearningUI'

interface RandomTestLandingProps {
  onStartTest: () => void
  onViewHistory: () => void
}

export default function RandomTestLanding({ onStartTest, onViewHistory }: RandomTestLandingProps) {
  const { t } = useTranslation()
  const [kpis, setKpis] = useState<TestKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadKPIs = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    const { data, error } = await getTestKPIs()
    setKpis(data)
    setLoadError(Boolean(error))
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    void getTestKPIs().then(({ data, error }) => {
      if (cancelled) return
      setKpis(data)
      setLoadError(Boolean(error))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-5 md:space-y-6">
      <LearningSectionHeading
        eyebrow={t('Test')}
        title={t('Referee Knowledge Test')}
        description={t('20 random questions · 40 minute time limit')}
      />

      <Surface className="relative overflow-hidden border-(--mc-color-accent)/45" padding="lg" variant="raised">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 opacity-20" aria-hidden="true">
          <span className="absolute -right-7 top-0 h-full w-14 -skew-x-[18deg] bg-(--mc-color-accent)" />
          <span className="absolute right-11 top-0 h-full w-7 -skew-x-[18deg] bg-(--mc-color-danger)" />
        </div>
        <div className="relative max-w-xl">
          <div className="mb-4 flex items-center gap-3">
            <MatchAccent />
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-(--mc-color-accent)">
              {t('Test')}
            </span>
          </div>
          <h3 className="max-w-md text-xl font-extrabold leading-tight text-(--mc-color-text) sm:text-2xl">
            {t('Referee Knowledge Test')}
          </h3>
          <p className="mt-2 text-sm leading-6 text-(--mc-color-text-secondary)">
            {t('20 random questions · 40 minute time limit')}
          </p>
          <Button
            className="mt-6 sm:w-auto"
            size="lg"
            fullWidth
            leadingIcon={<Play size={18} fill="currentColor" />}
            onClick={onStartTest}
          >
            {t('Start Test')}
          </Button>
        </div>
      </Surface>

      {loadError ? (
        <LearningError
          title={t('Failed to load results')}
          description={t('Please try again')}
          retryLabel={t('Try Again')}
          onRetry={() => void loadKPIs()}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <LearningMetric
            icon={<BarChart3 size={17} />}
            label={t('Tests This Week')}
            value={kpis?.testsThisWeek.toString() ?? '0'}
            loading={loading}
            emptyText={t('No tests yet')}
          />
          <LearningMetric
            icon={<TrendingUp size={17} />}
            label={t('Avg Score (Last 5)')}
            value={kpis?.averageScore !== null && kpis?.averageScore !== undefined ? `${kpis.averageScore}%` : '—'}
            loading={loading}
            emptyText={t('Complete tests to see stats')}
          />
          <LearningMetric
            icon={<Trophy size={17} />}
            label={t('Best Score')}
            value={kpis?.bestScore !== null && kpis?.bestScore !== undefined ? `${kpis.bestScore}%` : '—'}
            loading={loading}
            emptyText={t('No tests completed')}
          />
          <LearningMetric
            icon={<Clock size={17} />}
            label={t('Avg Time')}
            value={kpis?.averageTime !== null && kpis?.averageTime !== undefined ? formatTime(kpis.averageTime) : '—'}
            loading={loading}
            emptyText={t('No timing data')}
          />
        </div>
      )}

      <Button
        variant="secondary"
        fullWidth
        leadingIcon={<History size={17} />}
        onClick={onViewHistory}
      >
        {t('View Test History')}
      </Button>
    </div>
  )
}
