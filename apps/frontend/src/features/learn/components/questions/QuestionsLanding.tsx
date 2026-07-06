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
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="card-console field-lines relative overflow-hidden p-6 text-center">
        <span className="flag-accent absolute inset-x-0 top-0 h-1" aria-hidden="true" />
        <p className="eyebrow mb-2">{t('Practice')}</p>
        <h2 className="text-display-sm text-(--text-primary) mb-2">
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
          className="glow-brand w-full py-4 text-(--bg-primary) rounded-(--radius-card) font-bold text-lg flex items-center justify-center gap-2 transition-[filter,transform] duration-(--dur-fast) hover:brightness-105 active:scale-[0.99]"
          style={{ backgroundImage: 'var(--grad-brand)' }}
        >
          <Zap size={22} />
          {t('Quick Questions')}
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onStartByLaw}
            className="w-full py-3 card-console text-(--text-primary) font-semibold flex items-center justify-center gap-2 transition-colors hover:border-(--border-strong)"
          >
            <Scale size={18} className="text-(--brand-yellow)" />
            {t('By Law')}
          </button>

          <button
            onClick={onStartByArea}
            className="w-full py-3 card-console text-(--text-primary) font-semibold flex items-center justify-center gap-2 transition-colors hover:border-(--border-strong)"
          >
            <MapPin size={18} className="text-(--brand-yellow)" />
            {t('By Area')}
          </button>
        </div>
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
    <div className="card-console p-4 transition-colors hover:border-(--border-strong)">
      <div className="flex items-center gap-2 mb-2 text-(--brand-yellow)">
        {icon}
        <span className="eyebrow !text-(--text-muted)">{label}</span>
      </div>
      <div className="numeral text-2xl font-extrabold text-(--text-primary)">
        {isEmpty ? (
          <span className="text-sm font-normal text-(--text-faint)">{emptyText}</span>
        ) : (
          value
        )}
      </div>
    </div>
  )
}
