import { useState, useEffect, useCallback } from 'react'
import { PlayCircle, BarChart3, TrendingUp, Trophy, Clock, History } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getTestKPIs } from '../../api/testsApi'
import { formatTime } from '../../hooks/useTestTimer'
import type { TestKPIs } from '../../types'

interface RandomTestLandingProps {
  onStartTest: () => void
  onViewHistory: () => void
}

/**
 * RandomTestLanding - Landing page for the random test feature
 *
 * Displays:
 * - Test KPIs (tests this week, average score, best score, average time)
 * - Large "Start Test" button
 * - Link to test history
 */
export default function RandomTestLanding({ onStartTest, onViewHistory }: RandomTestLandingProps) {
  const { t } = useTranslation()
  const [kpis, setKpis] = useState<TestKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchKPIs = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: kpiError } = await getTestKPIs()
    if (kpiError) {
      setError(kpiError.message || t('Failed to load stats.'))
    } else {
      setKpis(data)
    }
    setLoading(false)
  }, [t])

  useEffect(() => {
    void fetchKPIs()
  }, [fetchKPIs])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-(--text-primary) mb-2">
          {t('Referee Knowledge Test')}
        </h2>
        <p className="text-sm text-(--text-secondary)">
          {t('20 random questions · 40 minute time limit')}
        </p>
      </div>

      {/* Error banner */}
      {error && !loading && (
        <div className="text-center p-4 bg-(--error)/10 border border-(--error)/30 rounded-xl">
          <p className="text-(--error) text-sm mb-3">{error}</p>
          <button
            onClick={() => void fetchKPIs()}
            className="px-4 py-2 text-sm font-medium bg-(--brand-yellow) text-(--bg-primary) rounded-(--radius-button) hover:bg-(--brand-yellow-soft) transition-colors"
          >
            {t('Try Again')}
          </button>
        </div>
      )}

      {/* KPIs Section */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard
          icon={<BarChart3 size={18} />}
          label={t('Tests This Week')}
          value={loading ? '—' : kpis?.testsThisWeek.toString() || '0'}
          emptyText={t('No tests yet')}
        />
        <KPICard
          icon={<TrendingUp size={18} />}
          label={t('Avg Score (Last 5)')}
          value={loading ? '—' : kpis && kpis.averageScore !== null ? `${kpis.averageScore}%` : '—'}
          emptyText={t('Complete tests to see stats')}
        />
        <KPICard
          icon={<Trophy size={18} />}
          label={t('Best Score')}
          value={loading ? '—' : kpis && kpis.bestScore !== null ? `${kpis.bestScore}%` : '—'}
          emptyText={t('No tests completed')}
        />
        <KPICard
          icon={<Clock size={18} />}
          label={t('Avg Time')}
          value={loading ? '—' : kpis && kpis.averageTime !== null ? formatTime(kpis.averageTime) : '—'}
          emptyText={t('No timing data')}
        />
      </div>

      {/* Start Test Button */}
      <button
        onClick={onStartTest}
        className="w-full py-4 bg-(--info) text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md"
      >
        <PlayCircle size={24} />
        {t('Start Test')}
      </button>

      {/* View History Link */}
      <button
        onClick={onViewHistory}
        className="w-full py-3 bg-(--bg-surface) border border-(--border-subtle) text-(--text-primary) rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-(--bg-hover) transition-colors"
      >
        <History size={18} />
        {t('View Test History')}
      </button>
    </div>
  )
}

/**
 * KPICard - Reusable card component for displaying a single KPI
 */
function KPICard({
  icon,
  label,
  value,
  emptyText,
}: {
  icon: React.ReactNode
  label: string
  value: string
  emptyText: string
}) {
  const isEmpty = value === '—'

  return (
    <div className="p-4 bg-(--bg-surface) border border-(--border-subtle) rounded-xl">
      <div className="flex items-center gap-2 mb-2 text-(--text-secondary)">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-(--text-primary)">
        {isEmpty ? (
          <span className="text-sm font-normal text-(--text-tertiary)">{emptyText}</span>
        ) : (
          value
        )}
      </div>
    </div>
  )
}
