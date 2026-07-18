import { useEffect, useId, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HelpCircle,
  XCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Dialog, EmptyState, Skeleton, Surface } from '@/components/ui'
import {
  completeQuestionSession,
  getQuestionsByFilters,
  saveQuestionPracticeAnswer,
} from '../../api/testsApi'
import type {
  AnsweredQuestion,
  OptionLetter,
  QuestionSessionMode,
  SessionResult,
  TestQuestion,
} from '../../types'

/* ─── Helpers ─── */

const LETTERS: OptionLetter[] = ['A', 'B', 'C', 'D']
const getOptions = (question: TestQuestion) => [
  question.option_a,
  question.option_b,
  question.option_c,
  question.option_d,
]
const indexToLetter = (index: number): OptionLetter => LETTERS[index]
const letterToIndex = (letter: OptionLetter): number => LETTERS.indexOf(letter)

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
  }
  return shuffled
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

/* ─── Warning Modal ─── */

function WarningModal({
  title,
  message,
  confirmLabel,
  ending,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  ending: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const messageId = useId()

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !ending) onCancel()
      }}
      title={title}
      aria-describedby={messageId}
      size="sm"
      dialogRole="alertdialog"
      showCloseButton={false}
      closeOnEscape={!ending}
      closeOnOverlayClick={false}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={ending}
            className="min-w-28 flex-1"
          >
            {t('Cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            loading={ending}
            loadingText={confirmLabel}
            className="min-w-28 flex-1"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-(--mc-radius-compact) border border-(--mc-color-danger)/40 bg-(--mc-color-danger)/10 text-(--mc-color-danger)"
          aria-hidden="true"
        >
          <AlertTriangle className="size-5" />
        </span>
        <p id={messageId} className="pt-1 text-sm leading-6 text-(--mc-color-text-secondary)">
          {message}
        </p>
      </div>
    </Dialog>
  )
}

/* ─── QuestionsSession ─── */

interface QuestionsSessionProps {
  sessionId: string
  mode: QuestionSessionMode
  filterLaws: number[] | null
  filterAreas: string[] | null
  onEndSession: (result: SessionResult) => void
  onExitSession: () => void
}

/**
 * QuestionsSession - Active question practice session
 *
 * Features:
 * - Loads questions filtered by the chosen mode/laws/areas
 * - Each filtered question can be answered once per session
 * - Count-up timer (no limit)
 * - Immediate feedback after each answer
 * - "End Session" button with confirmation modal
 * - Saves each answer to DB (linked to session)
 */
export default function QuestionsSession({
  sessionId,
  mode,
  filterLaws,
  filterAreas,
  onEndSession,
  onExitSession,
}: QuestionsSessionProps) {
  const { t } = useTranslation()
  const [, setQueue] = useState<TestQuestion[]>([])
  const [questionCount, setQuestionCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [loadVersion, setLoadVersion] = useState(0)

  const [currentQ, setCurrentQ] = useState<TestQuestion | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [savedIsCorrect, setSavedIsCorrect] = useState<boolean | null>(null)
  const [savingAnswer, setSavingAnswer] = useState(false)
  const [operationError, setOperationError] = useState<string | null>(null)

  const [answeredQuestions, setAnsweredQuestions] = useState<AnsweredQuestion[]>([])
  const [totalCorrect, setTotalCorrect] = useState(0)

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [ending, setEnding] = useState(false)
  const endingRef = useRef(false)
  const pendingAnswerRef = useRef<{ signature: string; answerId: string } | null>(null)

  // Load question pool on mount
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoadError(false)
      try {
        const { data, error } = await getQuestionsByFilters({
          laws: filterLaws ?? undefined,
          areas: filterAreas ?? undefined,
        })
        if (cancelled) return
        if (error) {
          setLoadError(true)
        } else if (data && data.length > 0) {
          const shuffled = shuffle(data)
          setQuestionCount(data.length)
          setQueue(shuffled)
          setCurrentQ(shuffled[0])
        }
      } catch (error) {
        console.error('Failed to load practice questions:', error)
        if (!cancelled) setLoadError(true)
      }
      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [filterLaws, filterAreas, loadVersion])

  // Start count-up timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((previous) => previous + 1)
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const advanceQuestion = () => {
    if (savingAnswer || endingRef.current) return
    setSelectedOption(null)
    setShowAnswer(false)
    setSavedIsCorrect(null)
    pendingAnswerRef.current = null

    setQueue((previousQueue) => {
      const remaining = previousQueue.slice(1)

      // A question can be answered only once in a session. Once the finite
      // pool is exhausted, keep the last result visible and offer completion.
      if (remaining.length === 0) {
        setShowEndConfirm(true)
        return previousQueue
      }

      const next = remaining[0]
      setCurrentQ(next)
      return remaining
    })
  }

  const handleCheck = async () => {
    if (selectedOption === null || !currentQ || showAnswer || savingAnswer || endingRef.current) return

    const selectedLetter = indexToLetter(selectedOption)
    const signature = `${sessionId}:${currentQ.id}:${selectedLetter}`
    if (!pendingAnswerRef.current || pendingAnswerRef.current.signature !== signature) {
      pendingAnswerRef.current = { signature, answerId: crypto.randomUUID() }
    }
    const answerId = pendingAnswerRef.current.answerId

    setSavingAnswer(true)
    setOperationError(null)

    try {
      const { data, error } = await saveQuestionPracticeAnswer(
        answerId,
        currentQ.id,
        selectedLetter,
        sessionId,
      )
      if (error || !data) throw error || new Error('Missing saved answer')

      const answered: AnsweredQuestion = {
        question: currentQ,
        selectedOption: selectedLetter,
        selectedIndex: selectedOption,
        isCorrect: data.is_correct,
      }

      pendingAnswerRef.current = null
      setSavedIsCorrect(data.is_correct)
      setShowAnswer(true)
      setAnsweredQuestions((previous) => [...previous, answered])
      if (data.is_correct) setTotalCorrect((previous) => previous + 1)
    } catch (error) {
      console.error('Failed to save practice answer:', error)
      setOperationError(t('Failed to save answer. Please try again.'))
    } finally {
      setSavingAnswer(false)
    }
  }

  const handleEndSession = async () => {
    if (endingRef.current || savingAnswer) return
    endingRef.current = true
    setEnding(true)
    setOperationError(null)

    try {
      const { data, error } = await completeQuestionSession(sessionId)
      if (error || !data) throw error || new Error('Missing completed session')
      if (!data.ended_at || data.duration_seconds === null) {
        throw new Error('Completed session is missing server timing')
      }

      if (timerRef.current) clearInterval(timerRef.current)
      onEndSession({
        sessionId,
        startedAt: data.started_at,
        endedAt: data.ended_at,
        durationSeconds: data.duration_seconds,
        totalAnswered: data.total_answered,
        totalCorrect: data.total_correct,
        answers: answeredQuestions,
      })
    } catch (error) {
      console.error('Failed to end question session:', error)
      endingRef.current = false
      setEnding(false)
      setShowEndConfirm(false)
      setOperationError(t('Failed to end session. Please try again.'))
    }
  }

  const handleExitEmptySession = async () => {
    if (endingRef.current || savingAnswer) return
    endingRef.current = true
    setEnding(true)
    setOperationError(null)

    try {
      const { data, error } = await completeQuestionSession(sessionId)
      if (error || !data) throw error || new Error('Missing completed session')
      if (timerRef.current) clearInterval(timerRef.current)
      onExitSession()
    } catch (error) {
      console.error('Failed to close empty question session:', error)
      endingRef.current = false
      setEnding(false)
      setOperationError(t('Failed to end session. Please try again.'))
    }
  }

  if (loading) {
    return (
      <section
        className="mx-auto w-full max-w-3xl py-8"
        role="status"
        aria-live="polite"
        aria-label={t('Loading questions…')}
      >
        <Surface padding="md" className="border-(--mc-color-border-strong) shadow-none sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <Skeleton variant="text" width="8rem" height="2.5rem" />
            <Skeleton variant="text" width="7rem" />
          </div>
          <Skeleton variant="rectangular" height="10rem" className="mt-5" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} variant="rectangular" height="4.5rem" />
            ))}
          </div>
          <p className="mt-5 text-center text-sm text-(--mc-color-text-secondary)">
            {t('Loading questions…')}
          </p>
        </Surface>
      </section>
    )
  }

  if (!currentQ) {
    return (
      <Surface
        padding="none"
        className="mx-auto w-full max-w-3xl border-(--mc-color-border-strong) shadow-none"
      >
        <EmptyState
          icon={loadError || operationError
            ? <AlertTriangle className="size-5 text-(--mc-color-danger)" />
            : <HelpCircle className="size-5" />}
          title={loadError
            ? t('Failed to load questions')
            : t('No questions found for the selected filters.')}
          description={operationError ?? (loadError ? t('Please try again') : undefined)}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {loadError && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setLoading(true)
                    setLoadVersion((version) => version + 1)
                  }}
                >
                  {t('Try Again')}
                </Button>
              )}
              <Button
                variant={loadError ? 'ghost' : 'secondary'}
                onClick={() => void handleExitEmptySession()}
                loading={ending}
                loadingText={t('Go Back')}
              >
                {t('Go Back')}
              </Button>
            </div>
          }
        />
      </Surface>
    )
  }

  const options = getOptions(currentQ)
  const correctIndex = letterToIndex(currentQ.correct_option)
  const totalAnswered = answeredQuestions.length
  const selectedIsCorrect = savedIsCorrect ?? (selectedOption === correctIndex)
  const isFinalQuestion = showAnswer && answeredQuestions.length >= questionCount
  const modeLabel = mode === 'quick'
    ? t('Quick Questions')
    : mode === 'by_law'
      ? t('By Law')
      : t('By Area')
  const questionContext = getQuestionContext(currentQ, t)

  return (
    <>
      {showEndConfirm && (
        <WarningModal
          title={t('End Session?')}
          message={t("You've answered {{total}} {{label}} so far. Your results will be shown on the next screen.", {
            total: totalAnswered,
            label: t(totalAnswered === 1 ? 'question' : 'questions'),
          })}
          confirmLabel={t('End Session')}
          ending={ending}
          onConfirm={() => void handleEndSession()}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}

      <section
        className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5"
        aria-labelledby="practice-question-title"
      >
        <Surface padding="md" className="border-(--mc-color-border-strong) shadow-none sm:p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-(--mc-color-text-secondary)">
                {modeLabel}
              </p>
              <div className="mt-1 flex items-center gap-2 text-(--mc-color-accent)">
                <Clock3 className="size-5 shrink-0" aria-hidden="true" />
                <time
                  className="font-mono text-[30px] font-extrabold leading-none tracking-[-0.04em] tabular-nums"
                  dateTime={`PT${elapsedSeconds}S`}
                >
                  {formatElapsed(elapsedSeconds)}
                </time>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEndConfirm(true)}
              disabled={ending || savingAnswer}
              className="-mr-2 text-(--mc-color-danger) hover:bg-(--mc-color-danger)/10 hover:text-(--mc-color-danger)"
            >
              {t('End Session')}
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 border-t border-(--mc-color-border) pt-3">
            <span className="text-xs font-semibold tracking-[0.06em] text-(--mc-color-text-secondary) uppercase">
              {t('Practice Questions')}
            </span>
            <span className="text-sm tabular-nums text-(--mc-color-text-secondary)">
              {t('{{correct}}/{{total}} correct', { correct: totalCorrect, total: totalAnswered })}
            </span>
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
              id="practice-question-title"
              className="max-w-2xl text-[22px] font-bold leading-[1.35] tracking-[-0.025em] text-(--mc-color-text) sm:text-3xl"
            >
              {currentQ.question_text}
            </h2>
          </div>
        </Surface>

        <fieldset>
          <legend className="mc-visually-hidden">{currentQ.question_text}</legend>
          <div className="space-y-3">
            {options.map((option, index) => {
              const isSelected = selectedOption === index
              const isCorrectOption = index === correctIndex
              const isWrongSelection = showAnswer && isSelected && !isCorrectOption

              let optionClasses = 'border-(--mc-color-border-strong) bg-(--mc-color-surface) text-(--mc-color-text)'
              let markerClasses = 'border-(--mc-color-border-strong) text-(--mc-color-text)'

              if (showAnswer && isCorrectOption) {
                optionClasses = 'border-(--mc-color-success) bg-(--mc-color-success)/10 text-(--mc-color-text) shadow-[inset_0_0_0_1px_var(--mc-color-success)]'
                markerClasses = 'border-(--mc-color-success) text-(--mc-color-success)'
              } else if (isWrongSelection) {
                optionClasses = 'border-(--mc-color-danger) bg-(--mc-color-danger)/10 text-(--mc-color-text) shadow-[inset_0_0_0_1px_var(--mc-color-danger)]'
                markerClasses = 'border-(--mc-color-danger) text-(--mc-color-danger)'
              } else if (!showAnswer && isSelected) {
                optionClasses = 'border-(--mc-color-accent) bg-(--mc-color-accent)/10 text-(--mc-color-text) shadow-[inset_0_0_0_1px_var(--mc-color-accent)]'
                markerClasses = 'border-(--mc-color-accent) text-(--mc-color-accent)'
              } else if (showAnswer) {
                optionClasses = 'border-(--mc-color-border) bg-(--mc-color-surface) text-(--mc-color-text-muted) opacity-65'
                markerClasses = 'border-(--mc-color-border) text-(--mc-color-text-muted)'
              }

              return (
                <button
                  key={LETTERS[index]}
                  type="button"
                  onClick={() => {
                    if (!showAnswer) setSelectedOption(index)
                  }}
                  disabled={showAnswer || savingAnswer || ending}
                  aria-pressed={isSelected}
                  className={`mc-interactive mc-focus-ring group flex min-h-[72px] w-full items-center gap-4 rounded-(--mc-radius-button) border px-3.5 py-3 text-left sm:px-4 ${optionClasses} ${
                    showAnswer ? 'cursor-default' : 'hover:border-(--mc-color-accent)/55 hover:bg-(--mc-color-surface-hover)'
                  }`}
                >
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-(--mc-radius-compact) border text-lg font-bold ${markerClasses}`}
                    aria-hidden="true"
                  >
                    {LETTERS[index]}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium leading-6 sm:text-base">
                    {option}
                  </span>
                  {showAnswer && isCorrectOption && (
                    <CheckCircle2 className="size-5 shrink-0 text-(--mc-color-success)" aria-hidden="true" />
                  )}
                  {isWrongSelection && (
                    <XCircle className="size-5 shrink-0 text-(--mc-color-danger)" aria-hidden="true" />
                  )}
                </button>
              )
            })}
          </div>
        </fieldset>

        {showAnswer && selectedOption !== null && (
          <div
            className={`flex items-start gap-3 rounded-(--mc-radius-button) border px-4 py-3.5 ${
              selectedIsCorrect
                ? 'border-(--mc-color-success)/45 bg-(--mc-color-success)/10 text-(--mc-color-success)'
                : 'border-(--mc-color-danger)/45 bg-(--mc-color-danger)/10 text-(--mc-color-danger)'
            }`}
            role="status"
            aria-live="polite"
          >
            {selectedIsCorrect ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold">
                {selectedIsCorrect ? t('Correct') : t('Incorrect')}
              </p>
              {!selectedIsCorrect && (
                <p className="mt-1 text-sm leading-5 text-(--mc-color-text-secondary)">
                  <span className="font-semibold text-(--mc-color-success)">
                    {t('Correct answer')}:
                  </span>{' '}
                  {currentQ.correct_option}. {options[correctIndex]}
                </p>
              )}
            </div>
          </div>
        )}

        {operationError && (
          <div
            className="flex items-start gap-2.5 rounded-(--mc-radius-button) border border-(--mc-color-danger)/40 bg-(--mc-color-danger)/8 px-4 py-3 text-sm text-(--mc-color-danger)"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{operationError}</span>
          </div>
        )}

        <div className="relative overflow-hidden rounded-(--mc-radius-button)">
          {!showAnswer ? (
            <Button
              fullWidth
              size="lg"
              onClick={() => void handleCheck()}
              disabled={selectedOption === null || savingAnswer || ending}
              loading={savingAnswer}
              loadingText={t('Saving...')}
              className="rounded-none pr-14"
            >
              {t('Check Answer')}
            </Button>
          ) : (
            <Button
              fullWidth
              size="lg"
              onClick={isFinalQuestion ? () => setShowEndConfirm(true) : advanceQuestion}
              disabled={ending}
              trailingIcon={isFinalQuestion ? undefined : <ChevronRight className="size-5" />}
              className="rounded-none pr-14"
            >
              {isFinalQuestion ? t('End Session') : t('Next Question')}
            </Button>
          )}
          <span
            className={`pointer-events-none absolute -bottom-3 -right-3 h-16 w-9 -skew-x-[24deg] bg-(--mc-color-danger) ${
              !showAnswer && selectedOption === null ? 'opacity-50' : ''
            }`}
            aria-hidden="true"
          />
        </div>
      </section>
    </>
  )
}

function getQuestionContext(
  question: TestQuestion,
  t: (key: string, options?: Record<string, unknown>) => string,
): string | null {
  if (question.law !== null) {
    const translatedTopic = question.topic ? t(question.topic) : ''
    const translated = t('Law {{law}} — {{name}}', {
      law: question.law,
      name: translatedTopic,
    })
    return translatedTopic ? translated : translated.replace(/\s*[—-]\s*$/, '')
  }
  return question.topic ? t(question.topic) : null
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
