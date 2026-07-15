import type { ReactNode } from 'react'
import {
  BarChart3,
  ClipboardList,
  Clock,
  History,
  Play,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Surface } from '@/components/ui'
import FixtureShell from './FixtureShell'
import { LearnFixtureNav, PitchDiagram, PrimaryActionFrame } from './LearnFixtureParts'

const kpis = [
  { label: 'Tests This Week', value: '3', icon: BarChart3 },
  { label: 'Avg Score (Last 5)', value: '82%', icon: TrendingUp },
  { label: 'Best Score', value: '95%', icon: Trophy },
  { label: 'Avg Time', value: '24:36', icon: Clock },
] as const

export default function LearnFixture() {
  const { t } = useTranslation()

  return (
    <FixtureShell title="Aprender">
      <div className="min-h-full bg-(--mc-color-canvas) pb-8 text-(--mc-color-text)">
        <div className="mx-auto w-full max-w-5xl px-4 pb-4 sm:px-6 xl:px-8">
          <header className="pb-1 pt-5 sm:pt-7">
            <h2 className="text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-(--mc-color-text) sm:text-3xl">
              {t('Learn')}
            </h2>
          </header>

          <LearnFixtureNav activeTab="test" />

          <div
            id="fixture-learn-panel"
            role="tabpanel"
            aria-labelledby="fixture-learn-tab-test"
            className="pt-5 sm:pt-6"
          >
            <section className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5" aria-labelledby="fixture-random-test-title">
              <Surface padding="none" className="overflow-hidden border-(--mc-color-border-strong) shadow-none">
                <div className="relative min-h-[208px] overflow-hidden px-5 py-6 sm:min-h-[222px] sm:px-7 sm:py-7">
                  <PitchDiagram className="-right-9 top-0 h-full w-[62%] opacity-75" />
                  <div className="relative z-10 max-w-[78%] sm:max-w-[68%]">
                    <div className="mb-7 flex size-12 items-center justify-center rounded-(--mc-radius-button) border border-(--mc-color-accent)/45 bg-(--mc-color-accent)/10 text-(--mc-color-accent) sm:mb-8">
                      <ClipboardList className="size-7" aria-hidden="true" />
                    </div>
                    <h3
                      id="fixture-random-test-title"
                      className="text-2xl font-extrabold leading-tight tracking-[-0.03em] text-(--mc-color-text) sm:text-3xl"
                    >
                      {t('Referee Knowledge Test')}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-(--mc-color-text-secondary)">
                      {t('20 random questions · 40 minute time limit')}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 border-t border-(--mc-color-border)">
                  {kpis.map((kpi, index) => (
                    <KpiCard
                      key={kpi.label}
                      icon={<kpi.icon className="size-4" />}
                      label={t(kpi.label)}
                      value={kpi.value}
                      className={`${index % 2 === 0 ? 'border-r' : ''} ${index < 2 ? 'border-b' : ''} border-(--mc-color-border)`}
                    />
                  ))}
                </dl>
              </Surface>

              <PrimaryActionFrame>
                <Button
                  fullWidth
                  size="lg"
                  leadingIcon={<Play className="size-5 fill-current" />}
                  className="rounded-none pr-14"
                >
                  {t('Start Test')}
                </Button>
              </PrimaryActionFrame>

              <Button
                fullWidth
                size="lg"
                variant="secondary"
                leadingIcon={<History className="size-5 text-(--mc-color-accent)" />}
              >
                {t('View Test History')}
              </Button>
            </section>
          </div>
        </div>
      </div>
    </FixtureShell>
  )
}

function KpiCard({
  icon,
  label,
  value,
  className,
}: {
  icon: ReactNode
  label: string
  value: string
  className: string
}) {
  return (
    <div className={`flex min-h-[126px] flex-col items-center justify-center px-3 py-5 text-center sm:min-h-[138px] sm:px-5 ${className}`}>
      <dt className="flex max-w-full items-center justify-center gap-1.5 text-xs leading-5 text-(--mc-color-text-secondary)">
        <span className="shrink-0 text-(--mc-color-accent)" aria-hidden="true">{icon}</span>
        <span>{label}</span>
      </dt>
      <dd className="mt-2 text-[32px] font-extrabold leading-none tracking-[-0.04em] tabular-nums text-(--mc-color-accent) sm:text-4xl">
        {value}
      </dd>
    </div>
  )
}
