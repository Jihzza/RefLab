import { useEffect, useState, type ReactNode } from 'react'
import { BarChart3, ClipboardList, Clock, History, Play, TrendingUp, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Skeleton, Surface } from '@/components/ui'
import { getTestKPIs } from '../../api/testsApi'
import { formatTime } from '../../hooks/useTestTimer'
import type { TestKPIs } from '../../types'

interface RandomTestLandingProps {
  onStartTest: () => void
  onViewHistory: () => void
}

export default function RandomTestLanding({ onStartTest, onViewHistory }: RandomTestLandingProps) {
  const { t } = useTranslation()
  const [kpis, setKpis] = useState<TestKPIs | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchKPIs() {
      const { data } = await getTestKPIs()
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
    <section className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5" aria-labelledby="random-test-title">
      <Surface
        padding="none"
        className="overflow-hidden border-(--mc-color-border-strong) shadow-none"
      >
        <div className="relative min-h-[208px] overflow-hidden px-5 py-6 sm:min-h-[222px] sm:px-7 sm:py-7">
          <PitchDiagram />

          <div className="relative z-10 max-w-[78%] sm:max-w-[68%]">
            <div className="mb-7 flex size-12 items-center justify-center rounded-(--mc-radius-button) border border-(--mc-color-accent)/45 bg-(--mc-color-accent)/10 text-(--mc-color-accent) sm:mb-8">
              <ClipboardList className="size-7" aria-hidden="true" />
            </div>
            <h2
              id="random-test-title"
              className="text-2xl font-extrabold leading-tight tracking-[-0.03em] text-(--mc-color-text) sm:text-3xl"
            >
              {t('Referee Knowledge Test')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-(--mc-color-text-secondary)">
              {t('20 random questions · 40 minute time limit')}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 border-t border-(--mc-color-border)">
          <KPICard
            icon={<BarChart3 className="size-4" />}
            label={t('Tests This Week')}
            value={kpis?.testsThisWeek.toString() || '0'}
            emptyText={t('No tests yet')}
            loading={loading}
            className="border-r border-b border-(--mc-color-border)"
          />
          <KPICard
            icon={<TrendingUp className="size-4" />}
            label={t('Avg Score (Last 5)')}
            value={kpis && kpis.averageScore !== null ? `${kpis.averageScore}%` : null}
            emptyText={t('Complete tests to see stats')}
            loading={loading}
            className="border-b border-(--mc-color-border)"
          />
          <KPICard
            icon={<Trophy className="size-4" />}
            label={t('Best Score')}
            value={kpis && kpis.bestScore !== null ? `${kpis.bestScore}%` : null}
            emptyText={t('No tests completed')}
            loading={loading}
            className="border-r border-(--mc-color-border)"
          />
          <KPICard
            icon={<Clock className="size-4" />}
            label={t('Avg Time')}
            value={kpis && kpis.averageTime !== null ? formatTime(kpis.averageTime) : null}
            emptyText={t('No timing data')}
            loading={loading}
          />
        </dl>
      </Surface>

      <div className="relative overflow-hidden rounded-(--mc-radius-button)">
        <Button
          fullWidth
          size="lg"
          onClick={onStartTest}
          leadingIcon={<Play className="size-5 fill-current" />}
          className="rounded-none pr-14"
        >
          {t('Start Test')}
        </Button>
        <span
          className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-9 -skew-x-[24deg] bg-(--mc-color-danger)"
          aria-hidden="true"
        />
      </div>

      <Button
        fullWidth
        size="lg"
        variant="secondary"
        onClick={onViewHistory}
        leadingIcon={<History className="size-5 text-(--mc-color-accent)" />}
      >
        {t('View Test History')}
      </Button>
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
    <div className={`flex min-h-[126px] flex-col items-center justify-center px-3 py-5 text-center sm:min-h-[138px] sm:px-5 ${className}`}>
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
          <span className="max-w-[9.5rem] text-xs leading-4 text-(--mc-color-text-muted)">{emptyText}</span>
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
