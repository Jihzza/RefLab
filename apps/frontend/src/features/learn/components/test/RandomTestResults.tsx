import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
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
import { Badge, Button, EmptyState, Skeleton, Surface } from '@/components/ui'
import { supabase } from '@/lib/supabaseClient'
import { getAttemptAnswers, getAttemptTopicBreakdown } from '../../api/testsApi'
import { formatTime } from '../../hooks/useTestTimer'
import type { TestAttempt, TestQuestion, TopicPerformance } from '../../types'

interface RandomTestResultsProps {
  attemptId: string
  onRestart: () => void
  onBackToTests: () => void
}

export default function RandomTestResults({ attemptId, onRestart, onBackToTests }: RandomTestResultsProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState<TestAttempt | null>(null)
  const [strong, setStrong] = useState<TopicPerformance[]>([])
  const [weak, setWeak] = useState<TopicPerformance[]>([])
  const [detailsError, setDetailsError] = useState(false)
  const [loadVersion, setLoadVersion] = useState(0)
  const [corrections, setCorrections] = useState<
    Array<{
      question: TestQuestion
      selectedOption: string
      correctOption: string
      isCorrect: boolean
      explanation: string | null
    }>
  >([])
  const [showCorrections, setShowCorrections] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchResults() {
      setDetailsError(false)
      setStrong([])
      setWeak([])
      setCorrections([])
      const { data: attemptData, error: attemptError } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('id', attemptId)
        .single()

      if (cancelled) return

      if (attemptError || !attemptData) {
        console.error('Failed to fetch attempt:', attemptError)
        setLoading(false)
        return
      }

      setAttempt(attemptData as TestAttempt)

      const { data: breakdownData, error: breakdownError } = await getAttemptTopicBreakdown(attemptId)
      if (cancelled) return
      if (breakdownError) setDetailsError(true)
      if (breakdownData) {
        setStrong(breakdownData.strong || [])
        setWeak(breakdownData.weak || [])
      }

      const { data: answersData, error: answersError } = await getAttemptAnswers(attemptId)
      if (cancelled) return
      if (answersError) setDetailsError(true)
      if (answersData) {
        const questionIds = answersData.map((answer) => answer.question_id)

        if (questionIds.length > 0) {
          const { data: questionsData, error: questionsError } = await supabase
            .from('question_bank')
            .select('*')
            .in('id', questionIds)

          if (cancelled) return
          if (questionsError) setDetailsError(true)

          if (questionsData) {
            const correctionsData = answersData.flatMap((answer) => {
              const question = questionsData.find((candidate) => candidate.id === answer.question_id)
              if (!question) return []
              return [{
                question: question as TestQuestion,
                selectedOption: answer.selected_option,
                correctOption: question.correct_option,
                isCorrect: answer.is_correct || false,
                explanation: answer.ai_explanation,
              }]
            })
            if (correctionsData.length !== answersData.length) setDetailsError(true)
            setCorrections(correctionsData)
          }
        }
      }

      setLoading(false)
    }

    void fetchResults()

    return () => {
      cancelled = true
    }
  }, [attemptId, loadVersion])

  if (loading) {
    return (
      <section
        className="mx-auto w-full max-w-3xl space-y-4 py-4"
        role="status"
        aria-live="polite"
        aria-label={t('Loading results...')}
      >
        <Skeleton variant="text" width="12rem" height="2.25rem" />
        <Skeleton variant="rectangular" height="13rem" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton variant="rectangular" height="10rem" />
          <Skeleton variant="rectangular" height="10rem" />
        </div>
        <Skeleton variant="rectangular" height="4.5rem" />
        <p className="text-center text-sm text-(--mc-color-text-secondary)">{t('Loading results...')}</p>
      </section>
    )
  }

  if (!attempt) {
    return (
      <Surface padding="none" className="mx-auto w-full max-w-3xl border-(--mc-color-danger)/35 shadow-none">
        <EmptyState
          icon={<AlertTriangle className="size-5 text-(--mc-color-danger)" />}
          title={t('Failed to load results')}
          action={(
            <Button variant="secondary" onClick={onBackToTests}>
              {t('Back to Tests')}
            </Button>
          )}
        />
      </Surface>
    )
  }

  const scorePercent = attempt.score_percent || 0
  const boundedScorePercent = Math.min(Math.max(scorePercent, 0), 100)
  const isPassing = scorePercent >= 80
  const scoreCorrect = attempt.score_correct ?? 0
  const scoreTotal = attempt.score_total ?? 0

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5" aria-labelledby="test-results-title">
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
        <span className="pointer-events-none absolute -left-8 top-0 h-24 w-16 -skew-x-[28deg] bg-(--mc-color-accent)" aria-hidden="true" />
        <PitchDiagram />

        <div className="relative z-10 grid min-h-[180px] grid-cols-[3.5rem_5.75rem_minmax(0,1fr)] items-center gap-3 px-4 py-6 sm:min-h-[205px] sm:grid-cols-[5rem_7.25rem_minmax(0,1fr)] sm:gap-6 sm:px-7">
          <Trophy className="size-11 justify-self-center text-(--mc-color-accent) sm:size-16" aria-hidden="true" />

          <div
            className="grid size-[92px] place-items-center rounded-full p-2 sm:size-[116px] sm:p-2.5"
            style={{
              background: `conic-gradient(var(--mc-color-accent) ${boundedScorePercent}%, var(--mc-color-surface-raised) 0)`,
            }}
            role="img"
            aria-label={`${scoreCorrect}/${scoreTotal}, ${scorePercent}%`}
          >
            <div className="grid size-full place-items-center rounded-full bg-(--mc-color-surface)">
              <span className="text-xl font-extrabold tracking-[-0.04em] tabular-nums text-(--mc-color-text) sm:text-2xl">
                {scoreCorrect}<span className="text-sm text-(--mc-color-text-secondary) sm:text-base">/{scoreTotal}</span>
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <p className={`text-lg font-bold leading-tight sm:text-2xl ${isPassing ? 'text-(--mc-color-success)' : 'text-(--mc-color-warning)'}`}>
              {scorePercent}% · {isPassing ? t('Pass') : t('Review Recommended')}
            </p>
            {attempt.time_elapsed_seconds !== null && (
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-(--mc-color-text-secondary) sm:text-sm">
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
      </Surface>

      {detailsError && (
        <div
          className="flex flex-wrap items-center gap-2.5 rounded-(--mc-radius-button) border border-(--mc-color-warning)/40 bg-(--mc-color-warning)/8 px-4 py-3 text-sm text-(--mc-color-warning)"
          role="alert"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{t('Some result details could not be loaded.')}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setLoading(true)
              setLoadVersion((version) => version + 1)
            }}
          >
            {t('Try Again')}
          </Button>
        </div>
      )}

      {(strong.length > 0 || weak.length > 0) && (
        <div className={`grid gap-3 ${strong.length > 0 && weak.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {strong.length > 0 && (
            <PerformancePanel
              title={t('Strong Points')}
              topics={strong}
              tone="success"
              icon={<TrendingUp className="size-5" />}
            />
          )}
          {weak.length > 0 && (
            <PerformancePanel
              title={t('Areas to Improve')}
              topics={weak}
              tone="danger"
              icon={<TrendingDown className="size-5" />}
            />
          )}
        </div>
      )}

      <Surface padding="none" className="overflow-hidden border-(--mc-color-border-strong) shadow-none">
        <h2>
          <button
            type="button"
            onClick={() => setShowCorrections((current) => !current)}
            className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-(--mc-color-surface-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--mc-color-focus) sm:px-5"
            aria-expanded={showCorrections}
            aria-controls="random-test-corrections"
          >
            <span className="text-base font-semibold text-(--mc-color-text) sm:text-lg">
              {t('Review All Questions')}
            </span>
            {showCorrections ? (
              <ChevronUp className="size-5 shrink-0 text-(--mc-color-text-secondary)" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-5 shrink-0 text-(--mc-color-text-secondary)" aria-hidden="true" />
            )}
          </button>
        </h2>

        {showCorrections && (
          <div id="random-test-corrections" className="border-t border-(--mc-color-border) p-3 sm:p-4">
            {corrections.length > 0 ? (
              <ol className="space-y-3">
                {corrections.map((correction, index) => {
                  const selectedText = getOptionText(correction.question, correction.selectedOption)
                  const correctText = getOptionText(correction.question, correction.correctOption)

                  return (
                    <li
                      key={correction.question.id}
                      className={`relative overflow-hidden rounded-(--mc-radius-button) border p-4 sm:p-5 ${
                        correction.isCorrect
                          ? 'border-(--mc-color-success)/35 bg-(--mc-color-success)/5'
                          : 'border-(--mc-color-danger)/35 bg-(--mc-color-danger)/5'
                      }`}
                    >
                      <p className="text-sm font-bold text-(--mc-color-accent)">
                        {t('Question {{number}}', { number: index + 1 })}
                      </p>
                      <p className="mt-2 text-sm font-medium leading-6 text-(--mc-color-text) sm:text-base">
                        {correction.question.question_text}
                      </p>

                      <div className="mt-4 space-y-3 text-sm">
                        <div className={`flex items-start gap-2.5 ${correction.isCorrect ? 'text-(--mc-color-success)' : 'text-(--mc-color-danger)'}`}>
                          {correction.isCorrect ? (
                            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                          ) : (
                            <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                          )}
                          <p className="min-w-0 leading-5">
                            <span className="font-semibold">{t('Your answer')}:</span>{' '}
                            <span>{correction.selectedOption}{selectedText ? ` · ${selectedText}` : ''}</span>
                          </p>
                        </div>

                        {!correction.isCorrect && (
                          <div className="flex items-start gap-2.5 text-(--mc-color-success)">
                            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                            <p className="min-w-0 leading-5">
                              <span className="font-semibold">{t('Correct answer')}:</span>{' '}
                              <span>{correction.correctOption}{correctText ? ` · ${correctText}` : ''}</span>
                            </p>
                          </div>
                        )}

                        {correction.explanation && (
                          <div className="rounded-(--mc-radius-compact) border border-(--mc-color-accent)/30 bg-(--mc-color-accent)/8 px-3.5 py-3 text-(--mc-color-text-secondary)">
                            <p className="text-xs font-bold tracking-[0.06em] text-(--mc-color-accent) uppercase">
                              {t('Explanation')}
                            </p>
                            <p className="mt-1.5 leading-6">{correction.explanation}</p>
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="py-6 text-center text-sm text-(--mc-color-text-muted)">{t('No data yet')}</p>
            )}
          </div>
        )}
      </Surface>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          fullWidth
          size="lg"
          variant="secondary"
          onClick={onBackToTests}
          leadingIcon={<Home className="size-5 text-(--mc-color-accent)" />}
        >
          {t('Back to Tests')}
        </Button>

        <div className="relative overflow-hidden rounded-(--mc-radius-button)">
          <Button
            fullWidth
            size="lg"
            onClick={onRestart}
            leadingIcon={<RotateCcw className="size-5" />}
            className="rounded-none pr-14"
          >
            {t('Take Another Test')}
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

function PerformancePanel({
  title,
  topics,
  tone,
  icon,
}: {
  title: string
  topics: TopicPerformance[]
  tone: 'success' | 'danger'
  icon: React.ReactNode
}) {
  const { t } = useTranslation()
  const toneClass = tone === 'success' ? 'text-(--mc-color-success)' : 'text-(--mc-color-danger)'
  const borderClass = tone === 'success' ? 'border-(--mc-color-success)/35' : 'border-(--mc-color-danger)/35'

  return (
    <Surface padding="sm" className={`min-w-0 border ${borderClass} shadow-none sm:p-4`}>
      <div className={`flex items-start gap-2 ${toneClass}`}>
        <span className="mt-0.5 shrink-0" aria-hidden="true">{icon}</span>
        <h2 className="text-sm font-semibold leading-5 sm:text-base">{title}</h2>
      </div>
      <ul className="mt-3 divide-y divide-(--mc-color-border)">
        {topics.map((topic) => (
          <li key={topic.topic} className="py-2 first:pt-0 last:pb-0">
            <p className="break-words text-xs leading-5 text-(--mc-color-text-secondary) sm:text-sm">{t(topic.topic)}</p>
            <p className={`mt-0.5 text-sm font-bold tabular-nums sm:text-base ${toneClass}`}>
              {topic.accuracy}% <span className="font-medium text-(--mc-color-text-secondary)">({topic.correct}/{topic.total})</span>
            </p>
          </li>
        ))}
      </ul>
    </Surface>
  )
}

function getOptionText(question: TestQuestion, option: string): string {
  const optionMap: Record<string, string> = {
    A: question.option_a,
    B: question.option_b,
    C: question.option_c,
    D: question.option_d,
  }
  return optionMap[option] ?? ''
}

function PitchDiagram() {
  return (
    <svg
      viewBox="0 0 240 170"
      className="pointer-events-none absolute -right-10 top-0 h-full w-[48%] text-(--mc-color-border-strong) opacity-55"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M49 8 229 24 209 158 13 126Z" />
      <path d="m128 15-9 127" />
      <ellipse cx="122" cy="78" rx="25" ry="19" transform="rotate(-5 122 78)" />
      <path d="m46 43-26-3-5 51 25 6M204 47l23 3-8 72-25-6" />
    </svg>
  )
}
