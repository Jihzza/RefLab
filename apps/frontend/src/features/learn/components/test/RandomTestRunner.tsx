import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Clock3, LockKeyhole, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, ProgressBar, Skeleton, Surface } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import { generateRandomTest, saveAnswer, submitRandomTest } from '../../api/testsApi'
import { useTestTimer } from '../../hooks/useTestTimer'
import type { OptionLetter, TestQuestion } from '../../types'

interface RandomTestRunnerProps {
  onComplete: (attemptId: string) => void
  onBackToTests: () => void
}

const TEST_TIME_LIMIT_SECONDS = 2400

export default function RandomTestRunner({
  onComplete,
  onBackToTests,
}: RandomTestRunnerProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [loading, setLoading] = useState(true)
  const [startError, setStartError] = useState(false)
  const [startVersion, setStartVersion] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [expired, setExpired] = useState(false)

  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [attemptId, setAttemptId] = useState<string>('')
  const [attemptStartedAt, setAttemptStartedAt] = useState<string | null>(null)
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(TEST_TIME_LIMIT_SECONDS)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [pendingSelection, setPendingSelection] = useState<{ questionId: string; index: number } | null>(null)
  const [answerError, setAnswerError] = useState<string | null>(null)
  const pendingSaveRef = useRef<Promise<void> | null>(null)
  const submittingRef = useRef(false)
  const startRequestRef = useRef<{
    version: number
    ownerId: string
    request: ReturnType<typeof generateRandomTest>
  } | null>(null)

  const currentQuestion = questions[currentIndex]
  const answeredCount = Object.keys(answers).length
  const isAnswered = Boolean(currentQuestion && currentQuestion.id in answers)
  const isSavingAnswer = pendingSelection !== null
  const isLastQuestion = currentIndex === questions.length - 1
  const selectedOption = currentQuestion
    ? answers[currentQuestion.id] ?? (pendingSelection?.questionId === currentQuestion.id ? pendingSelection.index : null)
    : null

  const handleTimerExpire = useCallback(async () => {
    if (submittingRef.current || !attemptId) return
    setExpired(true)
    submittingRef.current = true
    setSubmitting(true)
    setAnswerError(null)

    try {
      await pendingSaveRef.current
      const { data, error } = await submitRandomTest(
        attemptId,
      )
      if (error || !data) throw error || new Error('Missing submitted attempt')
      onComplete(attemptId)
    } catch (error) {
      console.error('Failed to submit random test:', error)
      submittingRef.current = false
      setSubmitting(false)
      setAnswerError(t('Failed to submit test'))
    }
  }, [attemptId, onComplete, t])

  const timerData = useTestTimer(
    timeLimitSeconds,
    handleTimerExpire,
    !loading && Boolean(attemptId) && questions.length > 0,
    attemptStartedAt,
  )

  useEffect(() => {
    let cancelled = false

    async function init() {
      if (!userId) {
        setStartError(true)
        setLoading(false)
        return
      }

      const request = startRequestRef.current?.version === startVersion
        && startRequestRef.current.ownerId === userId
        ? startRequestRef.current.request
        : generateRandomTest(userId)

      startRequestRef.current = { version: startVersion, ownerId: userId, request }
      const { data, error } = await request

      if (cancelled) return

      if (error || !data || data.questions.length === 0) {
        console.error('Failed to generate test:', error)
        setStartError(true)
        setLoading(false)
        return
      }

      const restoredAnswers = data.answers.reduce<Record<string, number>>((restored, answer) => {
        restored[answer.question_id] = answer.selected_option.charCodeAt(0) - 65
        return restored
      }, {})
      const firstUnansweredIndex = data.questions.findIndex(
        (question) => !(question.id in restoredAnswers),
      )

      setQuestions(data.questions)
      setAttemptId(data.attempt.id)
      setAttemptStartedAt(data.attempt.started_at)
      setTimeLimitSeconds(data.attempt.time_limit_seconds || TEST_TIME_LIMIT_SECONDS)
      setAnswers(restoredAnswers)
      setCurrentIndex(
        firstUnansweredIndex >= 0
          ? firstUnansweredIndex
          : Math.max(data.questions.length - 1, 0),
      )
      setStartError(false)
      setLoading(false)
    }

    void init()

    return () => {
      cancelled = true
    }
  }, [startVersion, userId])

  const handleRetryStart = () => {
    setQuestions([])
    setAttemptId('')
    setAttemptStartedAt(null)
    setTimeLimitSeconds(TEST_TIME_LIMIT_SECONDS)
    setCurrentIndex(0)
    setAnswers({})
    setPendingSelection(null)
    setAnswerError(null)
    setExpired(false)
    setSubmitting(false)
    submittingRef.current = false
    pendingSaveRef.current = null
    setStartError(false)
    setLoading(true)
    setStartVersion((version) => version + 1)
  }

  const handleSelectOption = async (index: number) => {
    if (
      !currentQuestion ||
      isAnswered ||
      isSavingAnswer ||
      expired ||
      submittingRef.current
    ) return

    setAnswerError(null)
    setPendingSelection({ questionId: currentQuestion.id, index })

    const optionLetter = String.fromCharCode(65 + index) as OptionLetter
    const saveOperation = (async () => {
      try {
        const { error: saveError } = await saveAnswer(
          attemptId,
          currentQuestion.id,
          optionLetter,
        )
        if (saveError) throw saveError
        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: index }))
      } catch (error) {
        console.error('Failed to save random test answer:', error)
        setAnswerError(t('An unexpected error occurred'))
      } finally {
        setPendingSelection(null)
      }
    })()

    pendingSaveRef.current = saveOperation
    await saveOperation
    if (pendingSaveRef.current === saveOperation) pendingSaveRef.current = null
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (!isSavingAnswer && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setAnswerError(null)

    try {
      await pendingSaveRef.current
      const { data, error } = await submitRandomTest(
        attemptId,
      )
      if (error || !data) throw error || new Error('Missing submitted attempt')
      onComplete(attemptId)
    } catch (error) {
      console.error('Failed to submit random test:', error)
      submittingRef.current = false
      setSubmitting(false)
      setAnswerError(t('Failed to submit test'))
    }
  }

  if (loading) {
    return (
      <section
        className="mx-auto w-full max-w-3xl py-8"
        role="status"
        aria-live="polite"
        aria-label={t('Generating your test...')}
      >
        <Surface padding="md" className="border-(--mc-color-border-strong) shadow-none">
          <div className="flex items-center justify-between gap-4">
            <Skeleton variant="text" width="7rem" height="2.5rem" />
            <Skeleton variant="text" width="8rem" />
          </div>
          <Skeleton variant="rectangular" height="0.5rem" className="mt-5" />
          <Skeleton variant="rectangular" height="11rem" className="mt-5" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} variant="rectangular" height="4.5rem" />
            ))}
          </div>
          <p className="mt-5 text-center text-sm text-(--mc-color-text-secondary)">
            {t('Generating your test...')}
          </p>
        </Surface>
      </section>
    )
  }

  if (questions.length === 0) {
    return (
      <Surface padding="none" className="mx-auto w-full max-w-3xl border-(--mc-color-danger)/35 shadow-none">
        <EmptyState
          icon={<AlertTriangle className="size-5 text-(--mc-color-danger)" />}
          title={t('Failed to load test')}
          description={startError
            ? t('Could not start your test. Check your connection and try again.')
            : t('Please try again')}
          action={
            <>
              <Button
                onClick={handleRetryStart}
                leadingIcon={<RotateCcw className="size-4" />}
              >
                {t('Try Again')}
              </Button>
              <Button variant="secondary" onClick={onBackToTests}>
                {t('Back to Tests')}
              </Button>
            </>
          }
        />
      </Surface>
    )
  }

  const answerOptions = [
    { letter: 'A', text: currentQuestion.option_a },
    { letter: 'B', text: currentQuestion.option_b },
    { letter: 'C', text: currentQuestion.option_c },
    { letter: 'D', text: currentQuestion.option_d },
  ]
  const timerToneClass = getMatchTimerColorClass(timerData.timeRemaining)
  const questionContext = getQuestionContext(currentQuestion, t)
  const progressLabel = t('{{answered}} of {{total}} answered', {
    answered: answeredCount,
    total: questions.length,
  })

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5" aria-labelledby="random-test-question">
      <Surface padding="md" className="border-(--mc-color-border-strong) shadow-none sm:p-5">
        <div className="flex items-end justify-between gap-4 border-b border-(--mc-color-border) pb-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-(--mc-color-text-secondary)">
              {t('Referee Knowledge Test')}
            </p>
            <div className={`mt-1 flex items-center gap-2 ${timerToneClass}`}>
              <Clock3 className="size-5 shrink-0" aria-hidden="true" />
              <time
                className="font-mono text-[30px] font-extrabold leading-none tracking-[-0.04em] tabular-nums"
                dateTime={`PT${timerData.timeRemaining}S`}
              >
                {timerData.formatted}
              </time>
            </div>
          </div>
          <p className="shrink-0 pb-0.5 text-sm text-(--mc-color-text-secondary) sm:text-base">
            {t('Question {{current}} of {{total}}', {
              current: currentIndex + 1,
              total: questions.length,
            })}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <ProgressBar
            value={answeredCount}
            max={questions.length}
            tone="accent"
            size="md"
            aria-label={progressLabel}
          />
          <span className="text-xs tabular-nums text-(--mc-color-text-secondary)">{progressLabel}</span>
        </div>
      </Surface>

      {questionContext && (
        <div className="rounded-(--mc-radius-compact) border border-(--mc-color-border-strong) bg-(--mc-color-surface) px-4 py-3 text-xs font-bold tracking-[0.06em] text-(--mc-color-text-secondary) uppercase sm:text-sm">
          {questionContext}
        </div>
      )}

      <Surface
        padding="none"
        className="relative overflow-hidden border-(--mc-color-border-strong) shadow-none"
      >
        <PitchDiagram />
        <div className="relative z-10 px-5 py-6 sm:px-7 sm:py-8">
          <h2
            id="random-test-question"
            className="max-w-2xl text-[22px] font-bold leading-[1.35] tracking-[-0.025em] text-(--mc-color-text) sm:text-3xl"
          >
            {currentQuestion.question_text}
          </h2>
        </div>
      </Surface>

      <fieldset>
        <legend className="sr-only">{currentQuestion.question_text}</legend>
        <div className="space-y-3">
          {answerOptions.map((option, index) => {
            const isSelected = selectedOption === index
            const isLocked = Boolean(isAnswered)

            return (
              <button
                key={option.letter}
                type="button"
                onClick={() => void handleSelectOption(index)}
                disabled={isLocked || isSavingAnswer || submitting || expired}
                aria-pressed={isSelected}
                aria-busy={isSavingAnswer && isSelected ? true : undefined}
                className={`group flex min-h-[72px] w-full items-center gap-4 rounded-(--mc-radius-button) border px-3.5 py-3 text-left transition-[background-color,border-color,opacity,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) focus-visible:ring-offset-2 focus-visible:ring-offset-(--mc-color-canvas) sm:px-4 ${
                  isSelected
                    ? 'border-(--mc-color-accent) bg-(--mc-color-accent)/10 text-(--mc-color-text) shadow-[inset_0_0_0_1px_var(--mc-color-accent)]'
                    : 'border-(--mc-color-border-strong) bg-(--mc-color-surface) text-(--mc-color-text) hover:border-(--mc-color-accent)/55 hover:bg-(--mc-color-surface-hover)'
                } ${isLocked && !isSelected ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-(--mc-radius-compact) border text-lg font-bold ${
                  isSelected
                    ? 'border-(--mc-color-accent) text-(--mc-color-accent)'
                    : 'border-(--mc-color-border-strong) text-(--mc-color-text)'
                }`}>
                  {option.letter}
                </span>
                <span className="min-w-0 text-sm font-medium leading-6 sm:text-base">{option.text}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      {answerError && (
        <div
          className="flex flex-wrap items-center gap-2.5 rounded-(--mc-radius-button) border border-(--mc-color-danger)/40 bg-(--mc-color-danger)/8 px-4 py-3 text-sm text-(--mc-color-danger)"
          role="alert"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{answerError}</span>
          {expired && !submitting && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleTimerExpire()}
            >
              {t('Try Again')}
            </Button>
          )}
        </div>
      )}

      {isAnswered && (
        <div
          className="flex items-start gap-3 rounded-(--mc-radius-button) border border-(--mc-color-border) bg-(--mc-color-surface) px-4 py-3.5 text-(--mc-color-text-secondary)"
          role="status"
        >
          <LockKeyhole className="mt-0.5 size-5 shrink-0 text-(--mc-color-text-muted)" aria-hidden="true" />
          <p className="text-xs leading-5 sm:text-sm">
            {t('Answer locked. Use navigation buttons to continue.')}
          </p>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)] gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <Button
          fullWidth
          size="lg"
          variant="secondary"
          onClick={handlePrevious}
          disabled={currentIndex === 0 || isSavingAnswer || submitting || expired}
          leadingIcon={<ChevronLeft className="size-5" />}
        >
          {t('Back')}
        </Button>

        <div className="relative overflow-hidden rounded-(--mc-radius-button)">
          {isLastQuestion ? (
            <Button
              fullWidth
              size="lg"
              onClick={() => void handleSubmit()}
              disabled={submitting || expired || answeredCount < questions.length}
              loading={submitting}
              loadingText={t('Submitting...')}
              className="rounded-none pr-14"
            >
              {t('Submit Test')}
            </Button>
          ) : (
            <Button
              fullWidth
              size="lg"
              onClick={handleNext}
              disabled={!isAnswered || submitting || expired}
              trailingIcon={<ChevronRight className="size-5" />}
              className="rounded-none pr-14"
            >
              {t('Next')}
            </Button>
          )}
          <span
            className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-9 -skew-x-[24deg] bg-(--mc-color-danger)"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  )
}

function getMatchTimerColorClass(timeRemaining: number): string {
  if (timeRemaining <= 60) return 'text-(--mc-color-danger)'
  if (timeRemaining <= 300) return 'text-(--mc-color-warning)'
  return 'text-(--mc-color-accent)'
}

function getQuestionContext(question: TestQuestion, t: (key: string, options?: Record<string, unknown>) => string): string | null {
  const translatedTopic = question.topic ? t(question.topic) : null
  if (question.law !== null) {
    const translated = t('Law {{law}} — {{name}}', {
      law: question.law,
      name: translatedTopic ?? '',
    })
    return translatedTopic ? translated : translated.replace(/\s*[—-]\s*$/, '')
  }
  return translatedTopic
}

function PitchDiagram() {
  return (
    <svg
      viewBox="0 0 240 170"
      className="pointer-events-none absolute -right-10 top-0 h-full w-[55%] text-(--mc-color-border-strong) opacity-65"
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
