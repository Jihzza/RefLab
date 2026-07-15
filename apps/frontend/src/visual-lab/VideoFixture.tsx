import { ArrowLeft, CheckCircle2, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Surface } from '@/components/ui'
import FixtureShell from './FixtureShell'
import { LearnFixtureNav, PitchDiagram, PrimaryActionFrame } from './LearnFixtureParts'

const sanctions = [
  { label: 'No card', card: null },
  { label: 'Yellow card (caution)', card: 'yellow' },
  { label: 'Red card (sending off)', card: 'red' },
] as const

export default function VideoFixture() {
  const { t } = useTranslation()

  return (
    <FixtureShell title="Aprender">
      <div className="min-h-full bg-(--mc-color-canvas) pb-8 text-(--mc-color-text)">
        <div className="mx-auto w-full max-w-5xl px-4 pb-4 sm:px-6 xl:px-8">
          <LearnFixtureNav activeTab="videos" />

          <div
            id="fixture-learn-panel"
            role="tabpanel"
            aria-labelledby="fixture-learn-tab-videos"
            className="pt-5 sm:pt-6"
          >
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-start">
              <Surface padding="none" className="min-w-0 overflow-hidden border-(--mc-color-border-strong) shadow-none">
                <div className="flex min-h-14 items-center justify-between gap-4 border-b border-(--mc-color-border) px-4 py-3 sm:px-5">
                  <h2 className="text-lg font-bold tracking-[-0.02em] text-(--mc-color-text) sm:text-xl">
                    {t('Video Analysis')}
                  </h2>
                  <span className="shrink-0 text-lg font-semibold tabular-nums text-(--mc-color-text-secondary)">
                    1 / 1
                  </span>
                </div>

                <div className="relative aspect-video overflow-hidden bg-black">
                  <OffsideScene />
                  <button
                    type="button"
                    className="absolute left-1/2 top-1/2 z-10 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-lg backdrop-blur-sm"
                    aria-label="Reproduzir vídeo"
                  >
                    <Play className="ml-1 size-7 fill-current" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex min-h-12 items-center gap-3 border-t border-(--mc-color-border) bg-(--mc-color-canvas) px-4 py-2">
                  <div className="relative h-1.5 min-w-0 flex-1 overflow-visible rounded-full bg-(--mc-color-surface-raised)" aria-label="00:08 / 00:14" role="progressbar" aria-valuenow={8} aria-valuemin={0} aria-valuemax={14}>
                    <div className="h-full w-[57%] rounded-full bg-(--mc-color-accent)" />
                    <span className="absolute left-[57%] top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-(--mc-color-accent) bg-(--mc-color-canvas)" />
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-(--mc-color-text-secondary)">
                    00:08 / 00:14
                  </span>
                </div>

                <div className="relative overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
                  <PitchDiagram className="-bottom-10 -right-8 h-40 w-56 opacity-40" />
                  <div className="relative z-10 sm:max-w-[76%]">
                    <h3 className="text-lg font-semibold leading-tight text-(--mc-color-text) sm:text-xl">
                      Análise de fora de jogo 1
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-(--mc-color-text-secondary)">
                      Analisa esta situação de fora de jogo e determina a decisão correta do árbitro.
                    </p>
                  </div>
                </div>
              </Surface>

              <div className="min-w-0 space-y-4">
                <Surface padding="sm" className="border-(--mc-color-border-strong) shadow-none">
                  <ol className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs font-bold uppercase tracking-[0.08em] text-(--mc-color-text-muted) sm:text-sm">
                    <li className="flex items-center justify-end gap-2 text-(--mc-color-success)">
                      <CheckCircle2 className="size-5" aria-hidden="true" />
                      {t('Action')}
                    </li>
                    <li className="h-px w-16 bg-linear-to-r from-(--mc-color-success) to-(--mc-color-accent)" aria-hidden="true" />
                    <li className="flex items-center gap-2 text-(--mc-color-accent)">
                      <span className="grid size-7 place-items-center rounded-full bg-(--mc-color-accent) text-(--mc-color-canvas)">2</span>
                      {t('Sanction')}
                    </li>
                  </ol>
                </Surface>

                <Surface padding="md" className="border-(--mc-color-border-strong) shadow-none sm:p-5">
                  <fieldset>
                    <legend className="mb-4 text-base font-semibold leading-6 text-(--mc-color-text)">
                      {t('What sanction should be applied?')}
                    </legend>
                    <div className="space-y-2.5">
                      {sanctions.map((sanction, index) => (
                        <label key={sanction.label} className="block cursor-default">
                          <input
                            type="radio"
                            name="fixture-video-sanction"
                            checked={index === 0}
                            readOnly
                            className="peer sr-only"
                          />
                          <span className={`flex min-h-14 items-center gap-3 rounded-(--mc-radius-input) border px-4 py-3 text-sm ${
                            index === 0
                              ? 'border-(--mc-color-accent) bg-(--mc-color-accent)/8 text-(--mc-color-text)'
                              : 'border-(--mc-color-border-strong) text-(--mc-color-text-secondary)'
                          }`}>
                            <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 ${index === 0 ? 'border-(--mc-color-accent)' : 'border-(--mc-color-text-muted)'}`} aria-hidden="true">
                              {index === 0 && <span className="size-3.5 rounded-full bg-(--mc-color-accent)" />}
                            </span>
                            <span className="min-w-0 flex-1 leading-5">{t(sanction.label)}</span>
                            {sanction.card === 'yellow' && <span className="h-8 w-5 rounded-sm bg-(--mc-color-accent)" aria-hidden="true" />}
                            {sanction.card === 'red' && <span className="h-8 w-5 rounded-sm bg-(--mc-color-danger)" aria-hidden="true" />}
                          </span>
                        </label>
                      ))}
                    </div>

                    <div className="mt-5 grid grid-cols-[minmax(7rem,0.8fr)_minmax(0,1.2fr)] gap-3">
                      <Button
                        variant="secondary"
                        size="lg"
                        leadingIcon={<ArrowLeft className="size-4" />}
                        className="border-(--mc-color-accent) bg-transparent px-3 text-(--mc-color-accent)"
                      >
                        {t('Back')}
                      </Button>
                      <PrimaryActionFrame>
                        <Button fullWidth size="lg" className="rounded-none pr-10">
                          {t('Confirm')}
                        </Button>
                      </PrimaryActionFrame>
                    </div>
                  </fieldset>
                </Surface>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FixtureShell>
  )
}

function OffsideScene() {
  return (
    <svg viewBox="0 0 800 450" className="size-full" role="img" aria-label="Situação simulada de fora de jogo">
      <defs>
        <linearGradient id="fixture-grass" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#4f7935" />
          <stop offset="1" stopColor="#2c5627" />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#fixture-grass)" />
      {Array.from({ length: 8 }, (_, index) => (
        <rect key={index} x={index * 100} width="100" height="450" fill={index % 2 ? '#ffffff0a' : '#0000000a'} />
      ))}
      <g fill="none" stroke="#f5f5ef" strokeWidth="4" opacity=".72">
        <path d="M430 0v450M430 52h310v346H430M690 115h110v220H690" />
        <path d="M430 148h95v154h-95" />
      </g>
      <g stroke="#10151b" strokeWidth="10" strokeLinecap="round">
        <path d="m274 195-17 68m17-68 35 62m-35-62-31-28" />
        <circle cx="275" cy="167" r="16" fill="#c9946e" stroke="none" />
        <path d="m350 140-12 72m12-72 34 63m-34-63-25-29" />
        <circle cx="350" cy="113" r="16" fill="#c9946e" stroke="none" />
        <path d="m410 215-15 70m15-70 33 62m-33-62-28-29" />
        <circle cx="410" cy="187" r="16" fill="#c9946e" stroke="none" />
      </g>
      <g stroke="#f4c017" strokeWidth="11" strokeLinecap="round">
        <path d="m210 235-15 70m15-70 34 63m-34-63-28-29" />
        <circle cx="210" cy="207" r="16" fill="#c9946e" stroke="none" />
        <path d="m465 165-15 70m15-70 34 62m-34-62-29-28" />
        <circle cx="465" cy="137" r="16" fill="#c9946e" stroke="none" />
      </g>
      <circle cx="650" cy="230" r="22" fill="#55a56b" />
      <circle cx="244" cy="315" r="11" fill="#f5f5ef" stroke="#12161b" strokeWidth="3" />
      <path d="M376 0 282 450" stroke="#ffbf00" strokeWidth="5" />
      <path d="M405 0 311 450" stroke="#f3262b" strokeWidth="5" />
    </svg>
  )
}
