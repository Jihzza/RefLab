import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Clock, AlertTriangle } from 'lucide-react'
import { generateRandomTest, saveAnswer, submitRandomTest } from '../../api/testsApi'
import { useTestTimer, getTimerColorClass } from '../../hooks/useTestTimer'
import type { TestQuestion, OptionLetter } from '../../types'

interface RandomTestRunnerProps {
  onComplete: (attemptId: string) => void
}

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
    const { elapsed } = timerData
    await submitRandomTest(attemptId, elapsed, true)
    onComplete(attemptId)
  }, [attemptId, submitting, onComplete])

  const timerData = useTestTimer(2400, handleTimerExpire) // 40 minutes

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
    await submitRandomTest(attemptId, elapsed, false)
    onComplete(attemptId)
  }

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-(--info) mx-auto mb-4" />
          <p className="text-sm text-(--text-secondary)">Generating your test...</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (questions.length === 0) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={48} className="text-(--error) mx-auto mb-4" />
        <p className="text-(--text-primary) font-semibold">Failed to load test</p>
        <p className="text-sm text-(--text-secondary) mt-2">Please try again</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header: Timer and Progress */}
      <div className="flex items-center justify-between gap-4 p-4 bg-(--bg-surface) border border-(--border-subtle) rounded-xl">
        <div className="flex items-center gap-2">
          <Clock size={18} className={getTimerColorClass(timerData.timeRemaining)} />
          <span className={`font-mono font-semibold text-sm ${getTimerColorClass(timerData.timeRemaining)}`}>
            {timerData.formatted}
          </span>
        </div>
        <div className="text-sm text-(--text-secondary)">
          Question {currentIndex + 1} of {questions.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-(--bg-surface) rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-(--info) transition-all duration-300"
          style={{ width: `${(answeredCount / questions.length) * 100}%` }}
        />
      </div>
      <p className="text-xs text-(--text-secondary) text-center">
        {answeredCount} of {questions.length} answered
      </p>

      {/* Question Card */}
      <div className="p-6 bg-(--bg-surface) border border-(--border-subtle) rounded-2xl">
        <h3 className="text-lg font-semibold text-(--text-primary) mb-6">
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
                  w-full p-4 text-left rounded-xl border transition-all
                  ${
                    isSelected
                      ? 'bg-(--info)/10 border-(--info) text-(--text-primary)'
                      : 'bg-(--bg-primary) border-(--border-subtle) text-(--text-primary) hover:border-(--border-default)'
                  }
                  ${isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-sm shrink-0">{option.letter}.</span>
                  <span className="text-sm">{option.text}</span>
                </div>
              </button>
            )
          })}
        </div>

        {isAnswered && (
          <p className="text-xs text-(--text-secondary) mt-4 text-center">
            Answer locked. Use navigation buttons to continue.
          </p>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-(--border-subtle) bg-(--bg-surface) text-(--text-primary) hover:bg-(--bg-hover) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={18} />
          Back
        </button>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={submitting || answeredCount < questions.length}
            className="flex-1 px-6 py-3 rounded-xl bg-(--success) text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!isAnswered}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-(--info) text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight size={18} />
          </button>
        )}
      </div>

    </div>
  )
}
