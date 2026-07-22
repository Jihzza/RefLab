import { useEffect, useState } from 'react'
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, ProgressBar, Surface } from '@/components/ui'
import {
  getAttemptAnswers,
  getOrCreateAttempt,
  getQuestions,
  getTestBySlug,
  saveAnswer,
  submitAttempt,
} from '../api/testsApi'
import type { OptionLetter, Test, TestAttempt, TestAttemptAnswer, TestQuestion } from '../types'
import QuestionCard from './QuestionCard'
import TestResults from './TestResults'
import { LearningError, LearningLoading, LearningMessage, LearningSectionHeading } from './LearningUI'

export default function TestPage() {
  const { t } = useTranslation()
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [test, setTest] = useState<Test | null>(null)
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [attempt, setAttempt] = useState<TestAttempt | null>(null)
  const [answers, setAnswers] = useState<Map<string, OptionLetter>>(new Map())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadTest() {
      if (!slug) {
        setError(t('No test specified'))
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const { data: testData, error: testError } = await getTestBySlug(slug)
        if (cancelled) return
        if (testError || !testData) {
          setError(testError?.message || t('Test not found'))
          setLoading(false)
          return
        }
        setTest(testData)

        const { data: questionsData, error: questionsError } = await getQuestions(testData.id)
        if (cancelled) return
        if (questionsError || !questionsData) {
          setError(questionsError?.message || t('Failed to load questions'))
          setLoading(false)
          return
        }
        setQuestions(questionsData)

        const { data: attemptData, error: attemptError } = await getOrCreateAttempt(testData.id)
        if (cancelled) return
        if (attemptError || !attemptData) {
          setError(attemptError?.message || t('Failed to create attempt'))
          setLoading(false)
          return
        }
        setAttempt(attemptData)

        const { data: existingAnswers } = await getAttemptAnswers(attemptData.id)
        if (cancelled) return
        if (existingAnswers) {
          const answersMap = new Map<string, OptionLetter>()
          existingAnswers.forEach((answer: TestAttemptAnswer) => {
            answersMap.set(answer.question_id, answer.selected_option)
          })
          setAnswers(answersMap)
        }
      } catch {
        if (!cancelled) setError(t('An unexpected error occurred'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadTest()
    return () => { cancelled = true }
  }, [slug, t])

  const handleSelectOption = async (option: OptionLetter) => {
    if (!attempt || !questions[currentIndex]) return
    const questionId = questions[currentIndex].id
    setAnswers((current) => new Map(current).set(questionId, option))
    await saveAnswer(attempt.id, questionId, option)
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex((current) => current + 1)
  }

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((current) => current - 1)
  }

  const handleSubmit = async () => {
    if (!attempt) return
    setSubmitting(true)
    const { data: updatedAttempt, error: submitError } = await submitAttempt(attempt.id)
    if (submitError || !updatedAttempt) {
      setError(submitError?.message || t('Failed to submit test'))
      setSubmitting(false)
      return
    }
    setAttempt(updatedAttempt)
    setSubmitting(false)
  }

  if (loading) {
    return (
      <section className="min-h-full bg-(--mc-color-canvas) pb-24 pt-4 md:pt-6">
        <div className="mc-page mc-page--narrow">
          <LearningLoading label={t('Loading...')} />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="min-h-full bg-(--mc-color-canvas) pb-24 pt-4 md:pt-6">
        <div className="mc-page mc-page--narrow">
          <LearningError
            title={error}
            description={t('Please try again')}
            retryLabel={t('Back to Learn')}
            onRetry={() => navigate('/app/learn')}
          />
        </div>
      </section>
    )
  }

  if (attempt?.status === 'submitted') {
    return <TestResults attempt={attempt} testTitle={test?.title || t('Test')} />
  }

  if (questions.length === 0) {
    return (
      <section className="min-h-full bg-(--mc-color-canvas) pb-24 pt-4 md:pt-6">
        <div className="mc-page mc-page--narrow">
          <LearningMessage
            icon={<BookOpen size={22} />}
            title={t('No questions found for the selected filters.')}
            action={<Button variant="secondary" onClick={() => navigate('/app/learn')}>{t('Back to Learn')}</Button>}
          />
        </div>
      </section>
    )
  }

  const currentQuestion = questions[currentIndex]
  const currentAnswer = answers.get(currentQuestion.id) || null
  const answeredCount = answers.size
  const allAnswered = answeredCount === questions.length

  return (
    <section className="min-h-full bg-(--mc-color-canvas) pb-24 pt-4 md:pt-6" aria-label={test?.title}>
      <div className="mc-page mc-page--narrow space-y-4 md:space-y-5">
        <LearningSectionHeading
          eyebrow={test?.topic ?? t('Test')}
          title={test?.title ?? t('Test')}
          description={t('{{answered}} / {{total}} answered', { answered: answeredCount, total: questions.length })}
          action={(
            <Button variant="ghost" size="sm" leadingIcon={<ArrowLeft size={16} />} onClick={() => navigate('/app/learn')}>
              {t('Back to Learn')}
            </Button>
          )}
        />

        <Surface className="sticky top-2 z-10 backdrop-blur-xl" padding="sm" variant="raised">
          <ProgressBar
            value={answeredCount}
            max={questions.length}
            size="sm"
            tone="accent"
            label={t('Question {{current}} of {{total}}', { current: currentIndex + 1, total: questions.length })}
            valueLabel={t('{{answered}} / {{total}} answered', { answered: answeredCount, total: questions.length })}
            showValue
          />
        </Surface>

        <QuestionCard
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          selectedOption={currentAnswer}
          onSelectOption={(option) => void handleSelectOption(option)}
        />

        <div className="no-scrollbar flex gap-2 overflow-x-auto py-1" aria-label={t('Learn navigation')}>
          {questions.map((question, index) => {
            const isCurrent = index === currentIndex
            const isAnswered = answers.has(question.id)
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`mc-focus-ring flex size-9 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${
                  isCurrent
                    ? 'border-(--mc-color-accent) bg-(--mc-color-accent) text-(--mc-color-canvas)'
                    : isAnswered
                      ? 'border-(--mc-color-accent)/45 bg-(--mc-color-accent)/10 text-(--mc-color-accent)'
                      : 'border-(--mc-color-border) bg-(--mc-color-surface) text-(--mc-color-text-muted)'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={t('Go to question {{number}}', { number: index + 1 })}
              >
                {index + 1}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Button variant="secondary" leadingIcon={<ChevronLeft size={17} />} onClick={handlePrev} disabled={currentIndex === 0}>
            {t('Previous')}
          </Button>
          {currentIndex === questions.length - 1 ? (
            <Button fullWidth loading={submitting} disabled={!allAnswered} onClick={() => void handleSubmit()}>
              {submitting ? t('Submitting...') : t('Submit')}
            </Button>
          ) : (
            <Button fullWidth trailingIcon={<ChevronRight size={17} />} onClick={handleNext}>
              {t('Next')}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
