import { ArrowLeft, Clock3, LayoutDashboard, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Surface } from '@/components/ui'
import type { TestAttempt } from '../types'

interface TestResultsProps {
  attempt: TestAttempt
  testTitle: string
}

type ScoreTone = 'success' | 'warning' | 'danger'

const scoreToneClasses: Record<ScoreTone, string> = {
  success: 'text-(--mc-color-success)',
  warning: 'text-(--mc-color-warning)',
  danger: 'text-(--mc-color-danger)',
}

/** Displays the score after a test is submitted. */
export default function TestResults({ attempt, testTitle }: TestResultsProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const scorePercent = attempt.score_percent ?? 0
  const scoreCorrect = attempt.score_correct ?? 0
  const scoreTotal = attempt.score_total ?? 0
  const boundedScorePercent = Math.min(Math.max(scorePercent, 0), 100)
  const scoreTone: ScoreTone = scorePercent >= 80
    ? 'success'
    : scorePercent >= 60
      ? 'warning'
      : 'danger'

  const scoreMessage = scorePercent >= 80
    ? t('Excellent work!')
    : scorePercent >= 60
      ? t('Good effort!')
      : t('Keep practicing!')

  const scoreLabel = t('{{correct}} out of {{total}} correct', {
    correct: scoreCorrect,
    total: scoreTotal,
  })

  return (
    <section
      className="mx-auto w-full max-w-3xl space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-7"
      aria-labelledby="test-results-title"
    >
      <h2
        id="test-results-title"
        className="text-[28px] font-extrabold leading-tight tracking-[-0.035em] text-(--mc-color-text) sm:text-4xl"
      >
        {t('Test Completed')}
      </h2>

      <Surface
        padding="none"
        className="relative overflow-hidden border-(--mc-color-border-strong) shadow-none"
      >
        <span
          className="pointer-events-none absolute -left-8 top-0 h-24 w-16 -skew-x-[28deg] bg-(--mc-color-accent)"
          aria-hidden="true"
        />
        <PitchDiagram />

        <div className="relative z-10 grid min-h-[190px] grid-cols-[3.5rem_5.75rem_minmax(0,1fr)] items-center gap-3 px-4 py-6 sm:min-h-[220px] sm:grid-cols-[5rem_7.25rem_minmax(0,1fr)] sm:gap-6 sm:px-7">
          <Trophy
            className="size-11 justify-self-center text-(--mc-color-accent) sm:size-16"
            aria-hidden="true"
          />

          <div
            className="grid size-[92px] place-items-center rounded-full p-2 sm:size-[116px] sm:p-2.5"
            style={{
              background: `conic-gradient(var(--mc-color-accent) ${boundedScorePercent}%, var(--mc-color-surface-raised) 0)`,
            }}
            role="img"
            aria-label={`${scoreLabel}, ${scorePercent}%`}
          >
            <div className="grid size-full place-items-center rounded-full bg-(--mc-color-surface)">
              <span className="text-xl font-extrabold tracking-[-0.04em] tabular-nums text-(--mc-color-text) sm:text-2xl">
                {scoreCorrect}
                <span className="text-sm text-(--mc-color-text-secondary) sm:text-base">
                  /{scoreTotal}
                </span>
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-5 text-(--mc-color-text-secondary) sm:text-base">
              {testTitle}
            </h3>
            <p className={`mt-2 text-lg font-bold leading-tight sm:text-2xl ${scoreToneClasses[scoreTone]}`}>
              {scorePercent}% · {scoreMessage}
            </p>
            {attempt.time_elapsed_seconds !== null && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-(--mc-color-text-secondary) sm:text-sm">
                <Clock3 className="size-4 shrink-0" aria-hidden="true" />
                <span>{t('Time')}: {formatTime(attempt.time_elapsed_seconds)}</span>
              </p>
            )}
            {attempt.auto_submitted && (
              <Badge variant="warning" size="sm" className="mt-2">
                {t('Auto-submitted')}
              </Badge>
            )}
          </div>
        </div>

        <p className="relative z-10 border-t border-(--mc-color-border) px-4 py-3 text-center text-sm text-(--mc-color-text-secondary) sm:px-6">
          {scoreLabel}
        </p>
      </Surface>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          fullWidth
          size="lg"
          variant="secondary"
          onClick={() => navigate('/app/learn')}
          leadingIcon={<ArrowLeft className="size-5 text-(--mc-color-accent)" />}
          aria-label={t('Back to learn')}
        >
          {t('Back to Learn')}
        </Button>

        <PrimaryActionFrame>
          <Button
            fullWidth
            size="lg"
            onClick={() => navigate('/app/dashboard')}
            leadingIcon={<LayoutDashboard className="size-5" />}
            className="rounded-none pr-14"
            aria-label={t('View dashboard')}
          >
            {t('View Dashboard')}
          </Button>
        </PrimaryActionFrame>
      </div>
    </section>
  )
}

function PrimaryActionFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-(--mc-radius-button)">
      {children}
      <span
        className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-9 -skew-x-[24deg] bg-(--mc-color-danger)"
        aria-hidden="true"
      />
    </div>
  )
}

function PitchDiagram() {
  return (
    <svg
      viewBox="0 0 280 170"
      className="pointer-events-none absolute -right-10 -top-10 h-48 w-72 rotate-12 text-(--mc-color-border-strong) opacity-35"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden="true"
    >
      <rect x="8" y="8" width="264" height="154" />
      <path d="M140 8v154" />
      <circle cx="140" cy="85" r="27" />
      <path d="M8 52h45v66H8M272 52h-45v66h45" />
      <path d="M8 68h19v34H8M272 68h-19v34h19" />
    </svg>
  )
}

function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((value) => value.toString().padStart(2, '0'))
      .join(':')
  }

  return [minutes, seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':')
}
