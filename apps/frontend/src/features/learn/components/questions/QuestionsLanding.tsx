import { useState, useEffect } from 'react'
import { Zap, Scale, MapPin, BarChart3, Target, TrendingUp, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getQuestionSessionKPIs } from '../../api/testsApi'
import type { QuestionSessionKPIs } from '../../types'

interface QuestionsLandingProps {
  onStartQuick: () => void
  onStartByLaw: () => void
  onStartByArea: () => void
}

/**
 * QuestionsLanding - Landing dashboard for the Questions tab
 *
 * Displays:
 * - 4 KPI cards (sessions this week, questions answered, overall accuracy, avg session accuracy)
 * - 3 mode buttons: Quick Questions, By Law, By Area
 * - Info box describing the session format
 */
export default function QuestionsLanding({
  onStartQuick,
  onStartByLaw,
  onStartByArea,
}: QuestionsLandingProps) {
  const { t } = useTranslation()
  const [kpis, setKpis] = useState<QuestionSessionKPIs | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchKPIs() {
      const { data } = await getQuestionSessionKPIs()
      if (!cancelled) {
        setKpis(data)
        setLoading(false)
      }
    }

    fetchKPIs()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-(--text-primary) mb-2">
          {t('Practice Questions')}
        </h2>
        <p className="text-sm text-(--text-secondary)">
          {t('Answer at your own pace · No time limit')}
        </p>
      </div>

      {/* KPIs Section */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard
          icon={<BarChart3 size={18} />}
          label={t('Sessions This Week')}
          value={loading ? '—' : kpis?.sessionsThisWeek.toString() || '0'}
          emptyText={t('No sessions yet')}
        />
        <KPICard
          icon={<BookOpen size={18} />}
          label={t('Questions Answered')}
          value={loading ? '—' : kpis?.totalQuestionsAnswered.toString() || '0'}
          emptyText={t('No answers yet')}
        />
        <KPICard
          icon={<Target size={18} />}
          label={t('Overall Accuracy')}
          value={loading ? '—' : kpis?.overallAccuracy !== null && kpis?.overallAccuracy !== undefined ? `${kpis.overallAccuracy}%` : '—'}
          emptyText={t('Answer questions to see')}
        />
        <KPICard
          icon={<TrendingUp size={18} />}
          label={t('Avg Session Accuracy')}
          value={loading ? '—' : kpis?.avgSessionAccuracy !== null && kpis?.avgSessionAccuracy !== undefined ? `${kpis.avgSessionAccuracy}%` : '—'}
          emptyText={t('Complete a session')}
        />
      </div>

      {/* Mode Buttons */}
      <div className="space-y-3">
        <button
          onClick={onStartQuick}
          className="w-full py-4 bg-(--info) text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md"
        >
          <Zap size={22} />
          {t('Quick Questions')}
        </button>

        <button
          onClick={onStartByLaw}
          className="w-full py-3 bg-(--bg-surface) border border-(--border-subtle) text-(--text-primary) rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-(--bg-hover) transition-colors"
        >
          <Scale size={18} />
          {t('By Law')}
        </button>

        <button
          onClick={onStartByArea}
          className="w-full py-3 bg-(--bg-surface) border border-(--border-subtle) text-(--text-primary) rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-(--bg-hover) transition-colors"
        >
          <MapPin size={18} />
          {t('By Area')}
        </button>
      </div>
    </div>
  )
}

/**
 * KPICard - Reusable card for displaying a single KPI metric
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
