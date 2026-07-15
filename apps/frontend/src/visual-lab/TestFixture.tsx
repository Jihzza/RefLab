import { ChevronLeft, ChevronRight, Clock3, LockKeyhole } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, ProgressBar, Surface } from '@/components/ui'
import FixtureShell from './FixtureShell'
import { PitchDiagram, PrimaryActionFrame } from './LearnFixtureParts'

const answers = [
  { letter: 'A', text: 'Advertência (cartão amarelo)' },
  { letter: 'B', text: 'Expulsão (cartão vermelho)' },
  { letter: 'C', text: 'Apenas pontapé-livre indireto' },
  { letter: 'D', text: 'Advertência verbal' },
] as const

export default function TestFixture() {
  const { t } = useTranslation()
  const selectedIndex = 1
  const progressLabel = t('{{answered}} of {{total}} answered', {
    answered: 7,
    total: 20,
  })

  return (
    <FixtureShell title="Aprender">
      <div className="min-h-full bg-(--mc-color-canvas) pb-8 text-(--mc-color-text)">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
          <section className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5" aria-labelledby="fixture-random-test-question">
            <Surface padding="md" className="border-(--mc-color-border-strong) shadow-none sm:p-5">
              <div className="flex items-end justify-between gap-4 border-b border-(--mc-color-border) pb-4">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-(--mc-color-text-secondary)">
                    {t('Referee Knowledge Test')}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-(--mc-color-accent)">
                    <Clock3 className="size-5 shrink-0" aria-hidden="true" />
                    <time
                      className="font-mono text-[30px] font-extrabold leading-none tracking-[-0.04em] tabular-nums"
                      dateTime="PT32M18S"
                    >
                      32:18
                    </time>
                  </div>
                </div>
                <p className="shrink-0 pb-0.5 text-sm text-(--mc-color-text-secondary) sm:text-base">
                  {t('Question {{current}} of {{total}}', { current: 7, total: 20 })}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                <ProgressBar
                  value={7}
                  max={20}
                  tone="accent"
                  size="md"
                  aria-label={progressLabel}
                />
                <span className="text-xs tabular-nums text-(--mc-color-text-secondary)">
                  {progressLabel}
                </span>
              </div>
            </Surface>

            <div className="rounded-(--mc-radius-compact) border border-(--mc-color-border-strong) bg-(--mc-color-surface) px-4 py-3 text-xs font-bold tracking-[0.06em] text-(--mc-color-text-secondary) uppercase sm:text-sm">
              LEI 12 · FALTAS E CONDUTA ANTIDESPORTIVA
            </div>

            <Surface padding="none" className="relative overflow-hidden border-(--mc-color-border-strong) shadow-none">
              <PitchDiagram className="-bottom-10 -right-8 h-48 w-64 opacity-50" />
              <div className="relative z-10 px-5 py-6 sm:px-7 sm:py-8">
                <h2
                  id="fixture-random-test-question"
                  className="max-w-2xl text-[22px] font-bold leading-[1.35] tracking-[-0.025em] text-(--mc-color-text) sm:text-3xl"
                >
                  Um jogador usa força excessiva ao disputar a bola com um adversário. Qual é a sanção disciplinar mínima?
                </h2>
              </div>
            </Surface>

            <fieldset>
              <legend className="sr-only">
                Um jogador usa força excessiva ao disputar a bola com um adversário. Qual é a sanção disciplinar mínima?
              </legend>
              <div className="space-y-3">
                {answers.map((answer, index) => {
                  const selected = index === selectedIndex
                  return (
                    <button
                      key={answer.letter}
                      type="button"
                      disabled
                      aria-pressed={selected}
                      className={`flex min-h-[72px] w-full items-center gap-4 rounded-(--mc-radius-button) border px-3.5 py-3 text-left sm:px-4 ${
                        selected
                          ? 'border-(--mc-color-accent) bg-(--mc-color-accent)/10 text-(--mc-color-text) shadow-[inset_0_0_0_1px_var(--mc-color-accent)]'
                          : 'border-(--mc-color-border-strong) bg-(--mc-color-surface) text-(--mc-color-text) opacity-60'
                      }`}
                    >
                      <span className={`flex size-11 shrink-0 items-center justify-center rounded-(--mc-radius-compact) border text-lg font-bold ${
                        selected
                          ? 'border-(--mc-color-accent) text-(--mc-color-accent)'
                          : 'border-(--mc-color-border-strong) text-(--mc-color-text)'
                      }`}>
                        {answer.letter}
                      </span>
                      <span className="min-w-0 text-sm font-medium leading-6 sm:text-base">
                        {answer.text}
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div className="flex items-start gap-3 rounded-(--mc-radius-button) border border-(--mc-color-border) bg-(--mc-color-surface) px-4 py-3.5 text-(--mc-color-text-secondary)" role="status">
              <LockKeyhole className="mt-0.5 size-5 shrink-0 text-(--mc-color-text-muted)" aria-hidden="true" />
              <p className="text-xs leading-5 sm:text-sm">
                {t('Answer locked. Use navigation buttons to continue.')}
              </p>
            </div>

            <div className="grid grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)] gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
              <Button
                fullWidth
                size="lg"
                variant="secondary"
                leadingIcon={<ChevronLeft className="size-5" />}
              >
                {t('Back')}
              </Button>
              <PrimaryActionFrame>
                <Button
                  fullWidth
                  size="lg"
                  trailingIcon={<ChevronRight className="size-5" />}
                  className="rounded-none pr-14"
                >
                  {t('Next')}
                </Button>
              </PrimaryActionFrame>
            </div>
          </section>
        </div>
      </div>
    </FixtureShell>
  )
}
