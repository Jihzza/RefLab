import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  getTestBySlug,
  getQuestions,
  getOrCreateAttempt,
  getAttemptAnswers,
  saveAnswer,
  submitAttempt,
} from '../api/testsApi'
import type { Test, TestQuestion, TestAttempt, TestAttemptAnswer, OptionLetter } from '../types'
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

  // Data state
  const [test, setTest] = useState<Test | null>(null)
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [attempt, setAttempt] = useState<TestAttempt | null>(null)
  const [answers, setAnswers] = useState<Map<string, OptionLetter>>(new Map())

  // UI state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Load test data on mount
  useEffect(() => {
    async function loadTest() {
      if (!slug) {
        setError(t('No test specified'))
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // 1. Get the test
        const { data: testData, error: testError } = await getTestBySlug(slug)
        if (testError || !testData) {
          setError(testError?.message || t('Test not found'))
          setLoading(false)
          return
        }
        setTest(testData)

        // 2. Get questions
        const { data: questionsData, error: questionsError } = await getQuestions(testData.id)
        if (questionsError || !questionsData) {
          setError(questionsError?.message || t('Failed to load questions'))
          setLoading(false)
          return
        }
        setQuestions(questionsData)

        // 3. Get or create attempt
        const { data: attemptData, error: attemptError } = await getOrCreateAttempt(testData.id)
        if (attemptError || !attemptData) {
          setError(attemptError?.message || t('Failed to create attempt'))
          setLoading(false)
          return
        }
        setAttempt(attemptData)

        // 4. Load existing answers (for resume)
        const { data: existingAnswers } = await getAttemptAnswers(attemptData.id)
        if (existingAnswers) {
          const answersMap = new Map<string, OptionLetter>()
          existingAnswers.forEach((answer: TestAttemptAnswer) => {
            answersMap.set(answer.question_id, answer.selected_option)
          })
          setAnswers(answersMap)
        }

        setLoading(false)
      } catch (err) {
        setError(t('An unexpected error occurred'))
        setLoading(false)
      }
    }

    loadTest()
  }, [slug, t])

  // Handle selecting an option
  const handleSelectOption = async (option: OptionLetter) => {
    if (!attempt || !questions[currentIndex]) return

    const questionId = questions[currentIndex].id

    // Update local state immediately for responsiveness
    setAnswers((prev) => new Map(prev).set(questionId, option))

    // Save to database
    await saveAnswer(attempt.id, questionId, option)
  }

  // Navigate to next question
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  // Navigate to previous question
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  // Submit the test
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

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-(--bg-surface-2) rounded w-1/3"></div>
          <div className="h-64 bg-(--bg-surface-2) rounded"></div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-(--error)">{error}</p>
          <button
            onClick={() => navigate('/app/learn')}
            className="mt-4 text-(--info) hover:underline"
          >
            {t('Back to Learn')}
          </button>
        </div>
      </div>
    )
  }

  // Show results if test is submitted
  if (attempt?.status === 'submitted') {
    return <TestResults attempt={attempt} testTitle={test?.title || t('Test')} />
  }

  // Current question
  const currentQuestion = questions[currentIndex]
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) || null : null
  const answeredCount = answers.size
  const allAnswered = answeredCount === questions.length

  return (
    <div className="min-h-full bg-(--bg-primary)">
      {/* Header */}
      <div className="bg-(--bg-surface) border-b border-(--border-subtle) px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/app/learn')}
              className="text-(--text-muted) hover:text-(--text-secondary) text-sm mb-1"
            >
              &larr; {t('Back to Learn')}
            </button>
            <h1 className="text-xl font-bold text-(--text-primary)">{test?.title}</h1>
          </div>
          <div className="text-sm text-(--text-muted)">
            {t('{{answered}} / {{total}} answered', { answered: answeredCount, total: questions.length })}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="p-6 max-w-2xl mx-auto">
        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            questionNumber={currentIndex + 1}
            totalQuestions={questions.length}
            selectedOption={currentAnswer}
            onSelectOption={handleSelectOption}
          />
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`
              px-4 py-2 rounded-lg font-medium
              ${currentIndex === 0
                ? 'bg-(--bg-surface-2) text-(--text-muted) cursor-not-allowed'
                : 'bg-(--bg-surface-2) text-(--text-secondary) hover:bg-(--bg-hover)'
              }
            `}
          >
            {t('Previous')}
          </button>

          {/* Question dots */}
          <div className="flex gap-2">
            {questions.map((q, idx) => {
              const isAnswered = answers.has(q.id)
              const isCurrent = idx === currentIndex

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`
                    w-3 h-3 rounded-full transition-all
                    ${isCurrent
                      ? 'bg-(--info) scale-125'
                      : isAnswered
                        ? 'bg-(--info)/50'
                        : 'bg-(--bg-surface-2)'
                    }
                  `}
                  aria-label={t('Go to question {{number}}', { number: idx + 1 })}
                />
              )
            })}
          </div>

          {currentIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className={`
                px-4 py-2 rounded-lg font-medium
                ${allAnswered && !submitting
                  ? 'bg-(--success) text-(--bg-primary) hover:bg-(--success)/80'
                  : 'bg-(--bg-surface-2) text-(--text-muted) cursor-not-allowed'
                }
              `}
            >
              {submitting ? t('Submitting...') : t('Submit')}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-(--brand-yellow) text-(--bg-primary) rounded-(--radius-button) font-medium hover:bg-(--brand-yellow-soft)"
            >
              {t('Next')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
