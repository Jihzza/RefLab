import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  RotateCcw,
  Send,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, ProgressBar, Skeleton, Surface } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import {
  getOrCreateAttempt,
  getTestByReference,
  saveAnswer,
  submitAttempt,
} from '../api/testsApi'
import type {
  OptionLetter,
  Test,
  TestAttempt,
  TestAttemptAnswer,
  TestQuestion,
} from '../types'
import QuestionCard from './QuestionCard'
import TestResults from './TestResults'

/**
 * TestPage - The main test-taking experience
 *
 * Features:
 * - Loads test and questions from Supabase
 * - Creates or resumes an attempt
 * - Allows navigation between questions
 * - Saves answers as you go
 * - Submit to see results
 */
export default function TestPage() {
  const { t } = useTranslation()
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id ?? null

  // Data state
  const [test, setTest] = useState<Test | null>(null)
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [attempt, setAttempt] = useState<TestAttempt | null>(null)
  const [answers, setAnswers] = useState<Map<string, OptionLetter>>(new Map())

  // UI state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canRetryLoad, setCanRetryLoad] = useState(true)
  const [loadVersion, setLoadVersion] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null)
  const [answerError, setAnswerError] = useState<string | null>(null)
  const submittingRef = useRef(false)
  const loadGenerationRef = useRef(0)

  // Load test data on mount
  useEffect(() => {
    let cancelled = false
    const generation = loadGenerationRef.current + 1
    loadGenerationRef.current = generation

    async function loadTest() {
      setTest(null)
      setQuestions([])
      setAttempt(null)
      setAnswers(new Map())
      setCurrentIndex(0)
      setSubmitting(false)
      submittingRef.current = false
      setSavingQuestionId(null)
      setAnswerError(null)

      if (!slug || !userId) {
        setError(t('No test specified'))
        setCanRetryLoad(false)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      setCanRetryLoad(true)

      try {
        // 1. Get the test
        const { data: testData, error: testError } = await getTestByReference(slug)
        if (cancelled) return
        if (testError || !testData) {
          setError(t('Could not load this test. Check your connection and try again.'))
          setLoading(false)
          return
        }
        setTest(testData)

        // 2. Atomically start/resume and load its fixed question snapshot.
        const { data: launchData, error: attemptError } = await getOrCreateAttempt(
          testData.id,
          userId,
        )
        if (cancelled) return
        if (attemptError || !launchData) {
          setError(t('Could not load this test. Check your connection and try again.'))
          setLoading(false)
          return
        }
        setQuestions(launchData.questions)
        setAttempt(launchData.attempt)

        const answersMap = new Map<string, OptionLetter>()
        launchData.answers.forEach((answer: TestAttemptAnswer) => {
          answersMap.set(answer.question_id, answer.selected_option)
        })
        setAnswers(answersMap)

        setLoading(false)
      } catch {
        if (cancelled) return
        setError(t('Could not load this test. Check your connection and try again.'))
        setLoading(false)
      }
    }

    void loadTest()
    return () => {
      cancelled = true
      if (loadGenerationRef.current === generation) {
        loadGenerationRef.current += 1
      }
    }
  }, [loadVersion, slug, t, userId])

  // Handle selecting an option
  const handleSelectOption = async (option: OptionLetter) => {
    if (!attempt || !questions[currentIndex] || savingQuestionId || submittingRef.current) return

    const questionId = questions[currentIndex].id
    const previousOption = answers.get(questionId)
    const generation = loadGenerationRef.current

    // Update local state immediately for responsiveness
    setAnswerError(null)
    setSavingQuestionId(questionId)
    setAnswers((previous) => new Map(previous).set(questionId, option))

    // Save to database
    try {
      const { error: saveError } = await saveAnswer(attempt.id, questionId, option)
      if (saveError) throw saveError
    } catch (error) {
      console.error('Failed to save test answer:', error)
      if (loadGenerationRef.current !== generation) return
      setAnswers((previous) => {
        const restored = new Map(previous)
        if (previousOption) restored.set(questionId, previousOption)
        else restored.delete(questionId)
        return restored
      })
      setAnswerError(t('An unexpected error occurred'))
    } finally {
      if (loadGenerationRef.current === generation) {
        setSavingQuestionId(null)
      }
    }
  }

  // Navigate to next question
  const handleNext = () => {
    if (!savingQuestionId && !submittingRef.current && currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  // Navigate to previous question
  const handlePrev = () => {
    if (!savingQuestionId && !submittingRef.current && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  // Submit the test
  const handleSubmit = async () => {
    if (!attempt || savingQuestionId || submittingRef.current) return

    submittingRef.current = true
    setSubmitting(true)
    setAnswerError(null)
    const generation = loadGenerationRef.current

    try {
      const { data: updatedAttempt, error: submitError } = await submitAttempt(attempt.id)
      if (submitError || !updatedAttempt) throw submitError || new Error('Missing submitted attempt')
      if (loadGenerationRef.current === generation) setAttempt(updatedAttempt)
    } catch (error) {
      console.error('Failed to submit test:', error)
      if (loadGenerationRef.current === generation) setAnswerError(t('Failed to submit test'))
    } finally {
      if (loadGenerationRef.current === generation) {
        submittingRef.current = false
        setSubmitting(false)
      }
    }
  }

  // Loading state
  if (loading) {
    return (
      <section
        className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6"
        role="status"
        aria-live="polite"
        aria-label={t('Loading questions…')}
      >
        <Surface padding="md" className="border-(--mc-color-border-strong) shadow-none sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <Skeleton variant="text" width="11rem" height="2.25rem" />
            <Skeleton variant="text" width="7rem" />
          </div>
          <Skeleton variant="rectangular" height="0.6rem" className="mt-5" />
          <Skeleton variant="rectangular" height="10rem" className="mt-5" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} variant="rectangular" height="4.5rem" />
            ))}
          </div>
        </Surface>
      </section>
    )
  }

  // Error state
  if (error) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <Surface
          padding="none"
          className="border-(--mc-color-danger)/40 shadow-none"
          role="alert"
        >
          <EmptyState
            icon={<AlertTriangle className="size-5 text-(--mc-color-danger)" />}
            title={error}
            action={
              <>
                {canRetryLoad && (
                  <Button
                    onClick={() => {
                      setLoading(true)
                      setLoadVersion((version) => version + 1)
                    }}
                    leadingIcon={<RotateCcw className="size-4" />}
                  >
                    {t('Try Again')}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => navigate('/app/learn')}
                  leadingIcon={<ArrowLeft className="size-4" />}
                >
                  {t('Back to Learn')}
                </Button>
              </>
            }
          />
        </Surface>
      </section>
    )
  }

  // Show results if test is submitted
  if (attempt?.status === 'submitted') {
    return <TestResults attempt={attempt} testTitle={test?.title || t('Test')} />
  }

  if (questions.length === 0) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <Surface padding="none" className="border-(--mc-color-border-strong) shadow-none">
          <EmptyState
            icon={<ClipboardList className="size-5" />}
            title={t('No questions available for this test.')}
            action={
              <Button
                variant="secondary"
                onClick={() => navigate('/app/learn')}
                leadingIcon={<ArrowLeft className="size-4" />}
              >
                {t('Back to Learn')}
              </Button>
            }
          />
        </Surface>
      </section>
    )
  }

  // Current question
  const currentQuestion = questions[currentIndex]
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) || null : null
  const answeredCount = answers.size
  const allAnswered = questions.length > 0 && answeredCount === questions.length
  const answeredLabel = t('{{answered}} / {{total}} answered', {
    answered: answeredCount,
    total: questions.length,
  })

  return (
    <section
      className="mx-auto w-full max-w-3xl space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-7"
      aria-labelledby="test-page-title"
    >
      <Surface padding="md" className="border-(--mc-color-border-strong) shadow-none sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/learn')}
              leadingIcon={<ArrowLeft className="size-4" />}
              className="-ml-2 shrink-0"
            >
              {t('Back to Learn')}
            </Button>
          </div>

          <div className="flex min-w-0 flex-1 items-start gap-3 sm:order-first">
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-(--mc-radius-compact) border border-(--mc-color-accent)/45 bg-(--mc-color-accent)/10 text-(--mc-color-accent)"
              aria-hidden="true"
            >
              <ClipboardList className="size-6" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="mc-eyebrow mb-1">{t('Test')}</p>
              <h2
                id="test-page-title"
                className="text-xl font-extrabold leading-tight tracking-[-0.025em] text-(--mc-color-text) sm:text-2xl"
              >
                {test?.title}
              </h2>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-(--mc-color-border) pt-4">
          <ProgressBar
            value={answeredCount}
            max={questions.length}
            size="md"
            tone="accent"
            aria-label={answeredLabel}
            aria-valuetext={answeredLabel}
          />
          <span className="text-xs font-medium tabular-nums text-(--mc-color-text-secondary) sm:text-sm">
            {answeredLabel}
          </span>
        </div>
      </Surface>

      {currentQuestion && (
        <QuestionCard
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          selectedOption={currentAnswer}
          onSelectOption={handleSelectOption}
          isSaving={savingQuestionId === currentQuestion.id}
          disabled={submitting}
        />
      )}

      {answerError && (
        <div
          className="flex items-start gap-2.5 rounded-(--mc-radius-button) border border-(--mc-color-danger)/40 bg-(--mc-color-danger)/8 px-4 py-3 text-sm text-(--mc-color-danger)"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{answerError}</span>
        </div>
      )}

      {questions.length > 0 && (
        <nav aria-label={t('Practice Questions')}>
          <Surface padding="sm" className="border-(--mc-color-border-strong) shadow-none">
            <div className="no-scrollbar flex gap-2 overflow-x-auto overscroll-x-contain">
              {questions.map((question, index) => {
                const isAnswered = answers.has(question.id)
                const isCurrent = index === currentIndex

                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => {
                      if (!submittingRef.current) setCurrentIndex(index)
                    }}
                    disabled={Boolean(savingQuestionId) || submitting}
                    aria-label={t('Go to question {{number}}', { number: index + 1 })}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`mc-interactive mc-focus-ring flex size-11 shrink-0 items-center justify-center rounded-(--mc-radius-compact) border text-sm font-bold tabular-nums ${
                      isCurrent
                        ? 'border-(--mc-color-accent) bg-(--mc-color-accent) text-(--mc-color-canvas) shadow-[0_0_0_1px_var(--mc-color-accent)]'
                        : isAnswered
                          ? 'border-(--mc-color-accent)/60 bg-(--mc-color-accent)/10 text-(--mc-color-accent)'
                          : 'border-(--mc-color-border-strong) bg-(--mc-color-surface) text-(--mc-color-text-secondary) hover:border-(--mc-color-accent)/55 hover:bg-(--mc-color-surface-hover)'
                    }`}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>
          </Surface>
        </nav>
      )}

      <div className="grid grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <Button
          fullWidth
          size="lg"
          variant="secondary"
          onClick={handlePrev}
          disabled={currentIndex === 0 || Boolean(savingQuestionId) || submitting}
          leadingIcon={<ChevronLeft className="size-5" />}
        >
          {t('Previous')}
        </Button>

        <div className="relative overflow-hidden rounded-(--mc-radius-button)">
          {currentIndex === questions.length - 1 ? (
            <Button
              fullWidth
              size="lg"
              onClick={() => void handleSubmit()}
              disabled={!allAnswered || submitting || Boolean(savingQuestionId)}
              loading={submitting}
              loadingText={t('Submitting...')}
              leadingIcon={<Send className="size-5" />}
              className="rounded-none pr-14"
            >
              {t('Submit')}
            </Button>
          ) : (
            <Button
              fullWidth
              size="lg"
              onClick={handleNext}
              disabled={Boolean(savingQuestionId) || submitting}
              trailingIcon={<ChevronRight className="size-5" />}
              className="rounded-none pr-14"
            >
              {t('Next')}
            </Button>
          )}
          <span
            className={`pointer-events-none absolute -bottom-3 -right-3 h-16 w-9 -skew-x-[24deg] bg-(--mc-color-danger) ${
              currentIndex === questions.length - 1 && (!allAnswered || submitting)
                ? 'opacity-50'
                : ''
            }`}
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  )
}
