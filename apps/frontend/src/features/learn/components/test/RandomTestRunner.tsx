import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Clock, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { generateRandomTest, saveAnswer, submitRandomTest } from '../../api/testsApi'
import { useTestTimer, getTimerColorClass } from '../../hooks/useTestTimer'
import type { TestQuestion, OptionLetter } from '../../types'

interface RandomTestRunnerProps {
  onComplete: (attemptId: string, correct: number, total: number) => void
}

// Total time budget for a random test. When the timer runs out, the elapsed
// time is exactly this full duration.
const TEST_DURATION_SECONDS = 2400 // 40 minutes

/**
 * RandomTestRunner - Test-taking interface with timer and navigation
 *
 * Features:
 * - 20 random questions
 * - 40-minute countdown timer
 * - Progress bar
 * - Answer locking
 * - Auto-submit at 0:00
 * - Navigation between questions
 */
export default function RandomTestRunner({ onComplete }: RandomTestRunnerProps) {
  const { t } = useTranslation()
  // Loading states
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Test data
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [attemptId, setAttemptId] = useState<string>('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({}) // questionId -> index (0-3)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)

  // Current question
  const currentQuestion = questions[currentIndex]
  const answeredCount = Object.keys(answers).length
  const isAnswered = currentQuestion && currentQuestion.id in answers
  const isLastQuestion = currentIndex === questions.length - 1

  // Timer
  const handleTimerExpire = useCallback(async () => {
    if (submitting) return // Prevent double submission
    setSubmitting(true)
    // On natural expiry the elapsed time equals the full test duration.
    // Using the constant avoids referencing `timerData` before it is declared.
    const { data } = await submitRandomTest(attemptId, TEST_DURATION_SECONDS, true)
    onComplete(attemptId, data?.score_correct ?? 0, data?.score_total ?? 0)
  }, [attemptId, submitting, onComplete])

  const timerData = useTestTimer(TEST_DURATION_SECONDS, handleTimerExpire)

  // Initialize test
  useEffect(() => {
    let cancelled = false

    async function init() {
      const { data, error } = await generateRandomTest()

      if (cancelled) return

      if (error || !data) {
        console.error('Failed to generate test:', error)
        setLoading(false)
        return
      }

      setQuestions(data.questions)
      setAttemptId(data.attemptId)
      setLoading(false)
    }

    init()

    return () => {
      cancelled = true
    }
  }, [])

  // Restore selected option when navigating
  useEffect(() => {
    if (currentQuestion) {
      setSelectedOption(answers[currentQuestion.id] ?? null)
    }
  }, [currentIndex, currentQuestion, answers])

  // Handle option selection
  const handleSelectOption = async (index: number) => {
    if (!currentQuestion || isAnswered) return // Can't change answer once locked

    setSelectedOption(index)

    // Save answer immediately
    const optionLetter = String.fromCharCode(65 + index) as OptionLetter // 0=A, 1=B, etc.
    await saveAnswer(attemptId, currentQuestion.id, optionLetter)

    // Lock answer
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: index }))
  }

  // Navigation
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  // Submit test
  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)

    const { elapsed } = timerData
    const { data } = await submitRandomTest(attemptId, elapsed, false)
    onComplete(attemptId, data?.score_correct ?? 0, data?.score_total ?? 0)
  }

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-(--info) mx-auto mb-4" />
          <p className="text-sm text-(--text-secondary)">{t('Generating your test...')}</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (questions.length === 0) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={48} className="text-(--error) mx-auto mb-4" />
        <p className="text-(--text-primary) font-semibold">{t('Failed to load test')}</p>
        <p className="text-sm text-(--text-secondary) mt-2">{t('Please try again')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Header: Timer and Progress */}
      <div className="glass flex items-center justify-between gap-4 p-4 border border-(--border-subtle) rounded-(--radius-card)">
        <div className="flex items-center gap-2">
          <Clock size={18} className={getTimerColorClass(timerData.timeRemaining)} />
          <span className={`numeral font-mono font-bold text-base ${getTimerColorClass(timerData.timeRemaining)}`}>
            {timerData.formatted}
          </span>
        </div>
        <div className="numeral text-sm font-semibold text-(--text-secondary)">
          {t('Question {{current}} of {{total}}', { current: currentIndex + 1, total: questions.length })}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-(--bg-surface-2) rounded-(--radius-pill) overflow-hidden border border-(--border-subtle)">
        <div
          className="absolute top-0 left-0 h-full rounded-(--radius-pill) bg-(--info) transition-all duration-300"
          style={{ width: `${(answeredCount / questions.length) * 100}%` }}
        />
      </div>
      <p className="numeral text-xs text-(--text-muted) text-center">
        {t('{{answered}} of {{total}} answered', { answered: answeredCount, total: questions.length })}
      </p>

      {/* Question Card */}
      <div className="card-console p-6">
        <h3 className="text-lg font-semibold text-(--text-primary) leading-snug mb-6">
          {currentQuestion.question_text}
        </h3>

        <div className="space-y-3">
          {[
            { letter: 'A', text: currentQuestion.option_a },
            { letter: 'B', text: currentQuestion.option_b },
            { letter: 'C', text: currentQuestion.option_c },
            { letter: 'D', text: currentQuestion.option_d },
          ].map((option, index) => {
            const isSelected = selectedOption === index
            const isLocked = isAnswered

            return (
              <button
                key={option.letter}
                onClick={() => handleSelectOption(index)}
                disabled={isLocked}
                className={`
                  w-full p-4 text-left rounded-(--radius-button) border-2 transition-all
                  ${
                    isSelected
                      ? 'bg-(--info)/10 border-(--info) text-(--text-primary) ring-1 ring-(--info)/40'
                      : 'bg-(--bg-surface-2) border-(--border-subtle) text-(--text-primary) hover:border-(--border-strong)'
                  }
                  ${isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-(--radius-button) text-sm font-bold ${
                      isSelected
                        ? 'bg-(--info) text-white'
                        : 'bg-(--bg-elevated) text-(--text-muted)'
                    }`}
                  >
                    {option.letter}
                  </span>
                  <span className="text-sm pt-0.5">{option.text}</span>
                </div>
              </button>
            )
          })}
        </div>

        {isAnswered && (
          <p className="text-xs text-(--text-muted) mt-4 text-center">
            {t('Answer locked. Use navigation buttons to continue.')}
          </p>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-3 rounded-(--radius-button) border border-(--border-subtle) bg-(--bg-surface-2) text-(--text-primary) hover:border-(--border-strong) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={18} />
          {t('Back')}
        </button>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={submitting || answeredCount < questions.length}
            className="flex-1 px-6 py-3 rounded-(--radius-button) bg-(--success) text-(--bg-primary) font-bold transition-[filter] hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? t('Submitting...') : t('Submit Test')}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!isAnswered}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-(--radius-button) bg-(--info) text-white font-semibold transition-[filter] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('Next')}
            <ChevronRight size={18} />
          </button>
        )}
      </div>

    </div>
  )
}
