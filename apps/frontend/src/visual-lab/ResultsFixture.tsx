import type { ReactNode } from 'react'
import {
  CheckCircle2,
  ChevronUp,
  Clock3,
  Home,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Trophy,
  XCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Surface } from '@/components/ui'
import FixtureShell from './FixtureShell'
import { PitchDiagram, PrimaryActionFrame } from './LearnFixtureParts'

export default function ResultsFixture() {
  const { t } = useTranslation()

  return (
    <FixtureShell title="Aprender">
      <div className="min-h-full bg-(--mc-color-canvas) pb-8 text-(--mc-color-text)">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
          <section className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5" aria-labelledby="fixture-test-results-title">
            <h2
              id="fixture-test-results-title"
              className="text-[28px] font-extrabold leading-tight tracking-[-0.035em] text-(--mc-color-text) sm:text-4xl"
            >
              {t('Test Completed')}
            </h2>

            <Surface padding="none" className="relative overflow-hidden border-(--mc-color-border-strong) shadow-none">
              <span className="pointer-events-none absolute -left-8 top-0 h-24 w-16 -skew-x-[28deg] bg-(--mc-color-accent)" aria-hidden="true" />
              <PitchDiagram className="-right-9 top-0 h-full w-[45%] opacity-45" />

              <div className="relative z-10 grid min-h-[180px] grid-cols-[3.5rem_5.75rem_minmax(0,1fr)] items-center gap-3 px-4 py-6 sm:min-h-[205px] sm:grid-cols-[5rem_7.25rem_minmax(0,1fr)] sm:gap-6 sm:px-7">
                <Trophy className="size-11 justify-self-center text-(--mc-color-accent) sm:size-16" aria-hidden="true" />
                <div
                  className="grid size-[92px] place-items-center rounded-full p-2 sm:size-[116px] sm:p-2.5"
                  style={{
                    background: 'conic-gradient(var(--mc-color-accent) 85%, var(--mc-color-surface-raised) 0)',
                  }}
                  role="img"
                  aria-label="17/20, 85%"
                >
                  <div className="grid size-full place-items-center rounded-full bg-(--mc-color-surface)">
                    <span className="text-xl font-extrabold tracking-[-0.04em] tabular-nums text-(--mc-color-text) sm:text-2xl">
                      17<span className="text-sm text-(--mc-color-text-secondary) sm:text-base">/20</span>
                    </span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-tight text-(--mc-color-success) sm:text-2xl">
                    85% · {t('Pass')}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-(--mc-color-text-secondary) sm:text-sm">
                    <Clock3 className="size-4 shrink-0" aria-hidden="true" />
                    <span>{t('Time')}: 23:48</span>
                  </p>
                </div>
              </div>
            </Surface>

            <div className="grid grid-cols-2 gap-3">
              <PerformancePanel
                title={t('Strong Points')}
                tone="success"
                icon={<TrendingUp className="size-5" />}
                topics={[
                  { name: 'Fora de jogo', score: '100%', count: '3/3' },
                  { name: 'Cartões', score: '100%', count: '2/2' },
                ]}
              />
              <PerformancePanel
                title={t('Areas to Improve')}
                tone="danger"
                icon={<TrendingDown className="size-5" />}
                topics={[
                  { name: 'Faltas', score: '33%', count: '1/3' },
                ]}
              />
            </div>

            <Surface padding="none" className="overflow-hidden border-(--mc-color-border-strong) shadow-none">
              <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 sm:px-5">
                <h3 className="text-base font-semibold text-(--mc-color-text) sm:text-lg">
                  {t('Review All Questions')}
                </h3>
                <ChevronUp className="size-5 shrink-0 text-(--mc-color-text-secondary)" aria-hidden="true" />
              </div>

              <div className="border-t border-(--mc-color-border) p-3 sm:p-4">
                <article className="relative overflow-hidden rounded-(--mc-radius-button) border border-(--mc-color-danger)/35 bg-(--mc-color-danger)/5 p-4 sm:p-5">
                  <PitchDiagram className="-bottom-12 -right-12 h-44 w-60 opacity-35" />
                  <div className="relative z-10">
                    <p className="text-sm font-bold text-(--mc-color-accent)">
                      {t('Question {{number}}', { number: 4 })}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-(--mc-color-text) sm:text-base">
                      Um jogador usa força excessiva ao disputar a bola com um adversário. Qual é a sanção disciplinar mínima?
                    </p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-start gap-2.5 text-(--mc-color-danger)">
                        <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                        <p className="min-w-0 leading-5">
                          <span className="font-semibold">{t('Your answer')}:</span>{' '}
                          A · Advertência (cartão amarelo)
                        </p>
                      </div>
                      <div className="flex items-start gap-2.5 text-(--mc-color-success)">
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                        <p className="min-w-0 leading-5">
                          <span className="font-semibold">{t('Correct answer')}:</span>{' '}
                          B · Expulsão (cartão vermelho)
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </Surface>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                fullWidth
                size="lg"
                variant="secondary"
                leadingIcon={<Home className="size-5 text-(--mc-color-accent)" />}
              >
                {t('Back to Tests')}
              </Button>
              <PrimaryActionFrame>
                <Button
                  fullWidth
                  size="lg"
                  leadingIcon={<RotateCcw className="size-5" />}
                  className="rounded-none pr-14"
                >
                  {t('Take Another Test')}
                </Button>
              </PrimaryActionFrame>
            </div>
          </section>
        </div>
      </div>
    </FixtureShell>
  )
}

function PerformancePanel({
  title,
  tone,
  icon,
  topics,
}: {
  title: string
  tone: 'success' | 'danger'
  icon: ReactNode
  topics: Array<{ name: string; score: string; count: string }>
}) {
  const toneClass = tone === 'success' ? 'text-(--mc-color-success)' : 'text-(--mc-color-danger)'
  const borderClass = tone === 'success' ? 'border-(--mc-color-success)/35' : 'border-(--mc-color-danger)/35'

  return (
    <Surface padding="md" className={`${borderClass} min-h-40 shadow-none`}>
      <h3 className={`flex items-center gap-2 text-sm font-bold sm:text-base ${toneClass}`}>
        <span aria-hidden="true">{icon}</span>
        <span>{title}</span>
      </h3>
      <dl className="mt-3 divide-y divide-(--mc-color-border)">
        {topics.map((topic) => (
          <div key={topic.name} className="py-2 first:pt-0 last:pb-0">
            <dt className="text-xs text-(--mc-color-text-secondary) sm:text-sm">{topic.name}</dt>
            <dd className={`mt-1 text-sm font-semibold tabular-nums sm:text-base ${toneClass}`}>
              {topic.score} <span className="font-normal text-(--mc-color-text-secondary)">({topic.count})</span>
            </dd>
          </div>
        ))}
      </dl>
    </Surface>
  )
}
