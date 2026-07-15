import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, BarChart3, BookOpen, MapPin, Play, Scale, Target, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Skeleton, Surface } from '@/components/ui'
import { getQuestionSessionKPIs } from '../../api/testsApi'
import type { QuestionSessionKPIs } from '../../types'

interface QuestionsLandingProps {
  onStartQuick: () => void
  onStartByLaw: () => void
  onStartByArea: () => void
  creating?: boolean
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
  creating = false,
}: QuestionsLandingProps) {
  const { t } = useTranslation()
  const [kpis, setKpis] = useState<QuestionSessionKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [kpiError, setKpiError] = useState(false)
  const [loadVersion, setLoadVersion] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchKPIs() {
      setKpiError(false)
      const { data, error } = await getQuestionSessionKPIs()
      if (!cancelled) {
        setKpis(data)
        setKpiError(Boolean(error))
        setLoading(false)
      }
    }

    fetchKPIs()

    return () => {
      cancelled = true
    }
  }, [loadVersion])

  return (
    <section
      className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5"
      aria-labelledby="practice-questions-title"
    >
      <Surface
        padding="none"
        className="overflow-hidden border-(--mc-color-border-strong) shadow-none"
      >
        <div className="relative min-h-[204px] overflow-hidden px-5 py-6 sm:min-h-[218px] sm:px-7 sm:py-7">
          <PitchDiagram />

          <div className="relative z-10 max-w-[82%] sm:max-w-[68%]">
            <span className="mc-brand-stripes mb-7" aria-hidden="true" />
            <p className="mc-eyebrow mb-2">{t('Quick Questions')}</p>
            <h2
              id="practice-questions-title"
              className="text-2xl font-extrabold leading-tight tracking-[-0.03em] text-(--mc-color-text) sm:text-3xl"
            >
              {t('Practice Questions')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-(--mc-color-text-secondary)">
              {t('Answer at your own pace · No time limit')}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 border-t border-(--mc-color-border)">
          <KPICard
            icon={<BarChart3 className="size-4" />}
            label={t('Sessions This Week')}
            value={kpis ? kpis.sessionsThisWeek.toString() : null}
            emptyText={kpiError ? t('Data unavailable') : t('No sessions yet')}
            loading={loading}
            className="border-r border-b border-(--mc-color-border)"
          />
          <KPICard
            icon={<BookOpen className="size-4" />}
            label={t('Questions Answered')}
            value={kpis ? kpis.totalQuestionsAnswered.toString() : null}
            emptyText={kpiError ? t('Data unavailable') : t('No answers yet')}
            loading={loading}
            className="border-b border-(--mc-color-border)"
          />
          <KPICard
            icon={<Target className="size-4" />}
            label={t('Overall Accuracy')}
            value={kpis?.overallAccuracy !== null && kpis?.overallAccuracy !== undefined
              ? `${kpis.overallAccuracy}%`
              : null}
            emptyText={kpiError ? t('Data unavailable') : t('Answer questions to see')}
            loading={loading}
            className="border-r border-(--mc-color-border)"
          />
          <KPICard
            icon={<TrendingUp className="size-4" />}
            label={t('Avg Session Accuracy')}
            value={kpis?.avgSessionAccuracy !== null && kpis?.avgSessionAccuracy !== undefined
              ? `${kpis.avgSessionAccuracy}%`
              : null}
            emptyText={kpiError ? t('Data unavailable') : t('Complete a session')}
            loading={loading}
          />
        </dl>

        {kpiError && (
          <div
            className="flex flex-wrap items-center gap-2.5 border-t border-(--mc-color-danger)/30 bg-(--mc-color-danger)/8 px-4 py-3 text-xs text-(--mc-color-danger) sm:px-5"
            role="alert"
          >
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">{t('Failed to load progress data.')}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLoading(true)
                setLoadVersion((version) => version + 1)
              }}
              className="text-(--mc-color-danger) hover:text-(--mc-color-danger)"
            >
              {t('Try Again')}
            </Button>
          </div>
        )}
      </Surface>

      <div className="relative overflow-hidden rounded-(--mc-radius-button)">
        <Button
          fullWidth
          size="lg"
          onClick={onStartQuick}
          disabled={creating}
          loading={creating}
          loadingText={t('Starting...')}
          leadingIcon={<Play className="size-5 fill-current" />}
          className="rounded-none pr-14"
        >
          {t('Quick Questions')}
        </Button>
        <span
          className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-9 -skew-x-[24deg] bg-(--mc-color-danger)"
          aria-hidden="true"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          fullWidth
          size="lg"
          variant="secondary"
          onClick={onStartByLaw}
          disabled={creating}
          leadingIcon={<Scale className="size-5 text-(--mc-color-accent)" />}
        >
          {t('By Law')}
        </Button>
        <Button
          fullWidth
          size="lg"
          variant="secondary"
          onClick={onStartByArea}
          disabled={creating}
          leadingIcon={<MapPin className="size-5 text-(--mc-color-accent)" />}
        >
          {t('By Area')}
        </Button>
      </div>
    </section>
  )
}

function KPICard({
  icon,
  label,
  value,
  emptyText,
  loading,
  className = '',
}: {
  icon: ReactNode
  label: string
  value: string | null
  emptyText: string
  loading: boolean
  className?: string
}) {
  return (
    <div
      className={`flex min-h-[126px] flex-col items-center justify-center px-3 py-5 text-center sm:min-h-[138px] sm:px-5 ${className}`}
    >
      <dt className="flex max-w-full items-center justify-center gap-1.5 text-xs leading-5 text-(--mc-color-text-secondary)">
        <span className="shrink-0 text-(--mc-color-accent)" aria-hidden="true">{icon}</span>
        <span>{label}</span>
      </dt>
      <dd className="mt-2 flex min-h-10 items-center justify-center">
        {loading ? (
          <Skeleton variant="text" width="4.75rem" height="2.25rem" />
        ) : value !== null ? (
          <span className="text-[32px] font-extrabold leading-none tracking-[-0.04em] tabular-nums text-(--mc-color-accent) sm:text-4xl">
            {value}
          </span>
        ) : (
          <span className="max-w-[9.5rem] text-xs leading-4 text-(--mc-color-text-muted)">
            {emptyText}
          </span>
        )}
      </dd>
    </div>
  )
}

function PitchDiagram() {
  return (
    <svg
      viewBox="0 0 240 170"
      className="pointer-events-none absolute -right-9 top-0 h-full w-[62%] text-(--mc-color-border-strong) opacity-75"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M49 8 229 24 209 158 13 126Z" />
      <path d="m128 15-9 127" />
      <ellipse cx="122" cy="78" rx="25" ry="19" transform="rotate(-5 122 78)" />
      <path d="M42 55 17 52M39 87 14 82M201 60l24 3M196 105l23 5" />
      <path d="m46 43-26-3-5 51 25 6M204 47l23 3-8 72-25-6" />
    </svg>
  )
}
