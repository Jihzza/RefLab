import { useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, ProgressBar, Surface } from '@/components/ui'
import { formatTime } from '../../hooks/useTestTimer'
import type { AnsweredQuestion, SessionResult } from '../../types'

interface QuestionsReviewProps {
  result: SessionResult
  onStartNew: () => void
  onRestart: () => void
  creating?: boolean
}

const LETTERS = ['A', 'B', 'C', 'D'] as const
const getOption = (question: AnsweredQuestion['question'], index: number) =>
  [question.option_a, question.option_b, question.option_c, question.option_d][index]

/**
 * QuestionsReview - Post-session summary screen
 *
 * Shows:
 * - Score summary (fraction, percentage, duration)
 * - Collapsible per-question corrections list
 * - CTA buttons to start a new session or return to the landing
 *
 * All data comes from the result prop — no async loading needed.
 */
export default function QuestionsReview({
  result,
  onStartNew,
  onRestart,
  creating = false,
}: QuestionsReviewProps) {
  const { t } = useTranslation()
  const [showCorrections, setShowCorrections] = useState(false)

  const { totalAnswered, totalCorrect, durationSeconds, answers } = result
  const scorePercent = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
  const totalIncorrect = Math.max(0, totalAnswered - totalCorrect)
  const isPassing = scorePercent >= 75
  const accuracyLabel = t('{{score}}% accuracy', { score: scorePercent })

  return (
    <section
      className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5"
      aria-labelledby="questions-review-title"
    >
      <Surface
        padding="none"
        className="overflow-hidden border-(--mc-color-border-strong) shadow-none"
      >
        <div className="relative overflow-hidden px-5 py-7 text-center sm:px-7 sm:py-8">
          <PitchDiagram />
          <div className="relative z-10 flex flex-col items-center">
            <span
              className={`flex size-14 items-center justify-center rounded-full border bg-(--mc-color-canvas) ${
                isPassing
                  ? 'border-(--mc-color-success)/50 text-(--mc-color-success)'
                  : 'border-(--mc-color-danger)/50 text-(--mc-color-danger)'
              }`}
              aria-hidden="true"
            >
              <Trophy className="size-7" />
            </span>
            <p
              className={`mt-4 text-xs font-extrabold tracking-[0.08em] uppercase ${
                isPassing ? 'text-(--mc-color-success)' : 'text-(--mc-color-danger)'
              }`}
            >
              {isPassing ? t('Excellent work!') : t('Keep practicing!')}
            </p>
            <h2 id="questions-review-title" className="mt-1 text-xl font-bold text-(--mc-color-text) sm:text-2xl">
              {t('Session Complete')}
            </h2>

            <div className="mt-5 text-[64px] font-extrabold leading-none tracking-[-0.055em] tabular-nums text-(--mc-color-accent) sm:text-7xl">
              {scorePercent}%
            </div>
            <p className="mt-3 text-sm leading-6 text-(--mc-color-text-secondary)">
              {t('{{correct}} correct out of {{answered}} answered', {
                correct: totalCorrect,
                answered: totalAnswered,
              })}
            </p>

            <div className="mt-5 w-full max-w-md">
              <ProgressBar
                value={scorePercent}
                max={100}
                size="md"
                tone={isPassing ? 'success' : 'danger'}
                aria-label={accuracyLabel}
                aria-valuetext={accuracyLabel}
              />
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-(--mc-radius-pill) border border-(--mc-color-border-strong) bg-(--mc-color-canvas) px-3 py-2 text-sm text-(--mc-color-text-secondary)">
              <Clock3 className="size-4 text-(--mc-color-accent)" aria-hidden="true" />
              <span className="font-mono font-semibold tabular-nums">{formatTime(durationSeconds)}</span>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 border-t border-(--mc-color-border)">
          <StatCard
            icon={<CheckCircle2 className="size-5" />}
            label={t('Correct')}
            value={totalCorrect}
            tone="success"
            className="border-r border-(--mc-color-border)"
          />
          <StatCard
            icon={<XCircle className="size-5" />}
            label={t('Incorrect')}
            value={totalIncorrect}
            tone="danger"
          />
        </dl>
      </Surface>

      {answers.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowCorrections((visible) => !visible)}
            aria-expanded={showCorrections}
            aria-controls="question-session-corrections"
            className="mc-interactive mc-focus-ring flex min-h-12 w-full items-center justify-between gap-4 rounded-(--mc-radius-button) border border-(--mc-color-border-strong) bg-(--mc-color-surface) px-4 py-3 text-left text-sm font-semibold text-(--mc-color-text) hover:border-(--mc-color-accent)/55 hover:bg-(--mc-color-surface-hover)"
          >
            <span>{t('Review Answers ({{count}})', { count: answers.length })}</span>
            {showCorrections ? (
              <ChevronUp className="size-5 shrink-0 text-(--mc-color-accent)" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-5 shrink-0 text-(--mc-color-accent)" aria-hidden="true" />
            )}
          </button>

          {showCorrections && (
            <ol id="question-session-corrections" className="space-y-3">
              {answers.map((answered, index) => {
                const { question, selectedIndex, isCorrect } = answered
                const correctIndex = LETTERS.indexOf(question.correct_option)
                const selectedText = getOption(question, selectedIndex)
                const correctText = getOption(question, correctIndex)

                return (
                  <li key={`${question.id}-${index}`}>
                    <Surface
                      padding="none"
                      className={`overflow-hidden shadow-none ${
                        isCorrect
                          ? 'border-(--mc-color-success)/45'
                          : 'border-(--mc-color-danger)/45'
                      }`}
                    >
                      <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
                        <span
                          className={`flex size-9 shrink-0 items-center justify-center rounded-(--mc-radius-compact) border ${
                            isCorrect
                              ? 'border-(--mc-color-success)/45 bg-(--mc-color-success)/10 text-(--mc-color-success)'
                              : 'border-(--mc-color-danger)/45 bg-(--mc-color-danger)/10 text-(--mc-color-danger)'
                          }`}
                          aria-hidden="true"
                        >
                          {isCorrect
                            ? <CheckCircle2 className="size-5" />
                            : <XCircle className="size-5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-bold tracking-[0.06em] text-(--mc-color-text-secondary) uppercase">
                              {t('Question {{number}}', { number: index + 1 })}
                            </p>
                            <span
                              className={`text-xs font-bold ${
                                isCorrect ? 'text-(--mc-color-success)' : 'text-(--mc-color-danger)'
                              }`}
                            >
                              {isCorrect ? t('Correct') : t('Incorrect')}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-semibold leading-6 text-(--mc-color-text) sm:text-base">
                            {question.question_text}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 border-t border-(--mc-color-border) bg-(--mc-color-canvas) px-4 py-4 sm:px-5">
                        <AnswerLine
                          label={t('Your answer')}
                          letter={LETTERS[selectedIndex]}
                          text={selectedText}
                          tone={isCorrect ? 'success' : 'danger'}
                        />
                        {!isCorrect && (
                          <AnswerLine
                            label={t('Correct answer')}
                            letter={question.correct_option}
                            text={correctText}
                            tone="success"
                          />
                        )}
                      </div>
                    </Surface>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          fullWidth
          size="lg"
          variant="secondary"
          onClick={onStartNew}
          disabled={creating}
          leadingIcon={<ArrowLeft className="size-5" />}
        >
          {t('Back')}
        </Button>

        <div className="relative overflow-hidden rounded-(--mc-radius-button)">
          <Button
            fullWidth
            size="lg"
            onClick={onRestart}
            disabled={creating}
            loading={creating}
            loadingText={t('Starting...')}
            leadingIcon={<RotateCcw className="size-5" />}
            className="rounded-none pr-14"
          >
            {t('Practice Again')}
          </Button>
          <span
            className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-9 -skew-x-[24deg] bg-(--mc-color-danger)"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  )
}

function StatCard({
  icon,
  label,
  value,
  tone,
  className = '',
}: {
  icon: ReactNode
  label: string
  value: number
  tone: 'success' | 'danger'
  className?: string
}) {
  const toneClasses = tone === 'success'
    ? 'text-(--mc-color-success)'
    : 'text-(--mc-color-danger)'

  return (
    <div className={`flex min-h-[118px] flex-col items-center justify-center px-4 py-5 text-center ${className}`}>
      <dt className={`flex items-center gap-2 text-sm font-semibold ${toneClasses}`}>
        <span aria-hidden="true">{icon}</span>
        <span>{label}</span>
      </dt>
      <dd className={`mt-2 text-4xl font-extrabold leading-none tabular-nums ${toneClasses}`}>
        {value}
      </dd>
    </div>
  )
}

function AnswerLine({
  label,
  letter,
  text,
  tone,
}: {
  label: string
  letter: string
  text: string
  tone: 'success' | 'danger'
}) {
  const toneClasses = tone === 'success'
    ? 'border-(--mc-color-success)/45 bg-(--mc-color-success)/10 text-(--mc-color-success)'
    : 'border-(--mc-color-danger)/45 bg-(--mc-color-danger)/10 text-(--mc-color-danger)'

  return (
    <div>
      <p className="text-xs font-semibold text-(--mc-color-text-secondary)">{label}</p>
      <div className="mt-1.5 flex items-start gap-3">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-(--mc-radius-compact) border text-sm font-extrabold ${toneClasses}`}
          aria-hidden="true"
        >
          {letter}
        </span>
        <p className="pt-1 text-sm leading-5 text-(--mc-color-text)">{text}</p>
      </div>
    </div>
  )
}

function PitchDiagram() {
  return (
    <svg
      viewBox="0 0 360 220"
      className="pointer-events-none absolute inset-0 h-full w-full text-(--mc-color-border-strong) opacity-25"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M28 22h304v176H28z" />
      <path d="M180 22v176" />
      <circle cx="180" cy="110" r="35" />
      <path d="M28 63h48v94H28M332 63h-48v94h48" />
      <path d="M28 82h22v56H28M332 82h-22v56h22" />
    </svg>
  )
}
