import { useState, useEffect } from 'react'
import { Trophy, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, RotateCcw, Home } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabaseClient'
import { getAttemptTopicBreakdown, getAttemptAnswers } from '../../api/testsApi'
import { formatTime } from '../../hooks/useTestTimer'
import type { TestAttempt, TestQuestion, TopicPerformance } from '../../types'

interface RandomTestResultsProps {
  attemptId: string
  onRestart: () => void
  onBackToTests: () => void
}

/**
 * RandomTestResults - Comprehensive results page after test submission
 *
 * Displays:
 * - Score (X/20, percentage)
 * - Time taken
 * - Strong points (topics >= 75% accuracy, min 2 questions)
 * - Weak points (topics < 50% accuracy)
 * - Corrections (all questions with answers)
 * - Restart and Back buttons
 */
export default function RandomTestResults({ attemptId, onRestart, onBackToTests }: RandomTestResultsProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState<TestAttempt | null>(null)
  const [strong, setStrong] = useState<TopicPerformance[]>([])
  const [weak, setWeak] = useState<TopicPerformance[]>([])
  const [corrections, setCorrections] = useState<
    Array<{
      question: TestQuestion
      selectedOption: string
      correctOption: string
      isCorrect: boolean
    }>
  >([])
  const [showCorrections, setShowCorrections] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchResults() {
      // Fetch attempt details
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

      // Fetch topic breakdown
      const { data: breakdownData } = await getAttemptTopicBreakdown(attemptId)
      if (breakdownData) {
        setStrong(breakdownData.strong || [])
        setWeak(breakdownData.weak || [])
      }

      // Fetch corrections
      const { data: answersData } = await getAttemptAnswers(attemptId)
      if (answersData) {
        const questionIds = answersData.map((a) => a.question_id)

        // Fetch all questions
        const { data: questionsData } = await supabase
          .from('question_bank')
          .select('*')
          .in('id', questionIds)

        if (questionsData) {
          const correctionsData = answersData.map((answer) => {
            const question = questionsData.find((q) => q.id === answer.question_id)
            return {
              question: question as TestQuestion,
              selectedOption: answer.selected_option,
              correctOption: question?.correct_option || '',
              isCorrect: answer.is_correct || false,
            }
          })
          setCorrections(correctionsData)
        }
      }

      setLoading(false)
    }

    fetchResults()

    return () => {
      cancelled = true
    }
  }, [attemptId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-(--info) mx-auto mb-4" />
          <p className="text-sm text-(--text-secondary)">{t('Loading results...')}</p>
        </div>
      </div>
    )
  }

  if (!attempt) {
    return (
      <div className="text-center py-20">
        <p className="text-(--text-primary) font-semibold">{t('Failed to load results')}</p>
        <button
          onClick={onBackToTests}
          className="mt-4 px-6 py-2 bg-(--info) text-white rounded-xl font-semibold hover:opacity-90"
        >
          {t('Back to Tests')}
        </button>
      </div>
    )
  }

  const scorePercent = attempt.score_percent || 0
  const isPassing = scorePercent >= 80

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <div className="p-6 bg-(--bg-surface) border border-(--border-subtle) rounded-2xl text-center">
        <Trophy
          size={48}
          className={`mx-auto mb-4 ${isPassing ? 'text-(--success)' : 'text-(--warning)'}`}
        />
        <h2 className="text-3xl font-bold text-(--text-primary) mb-2">
          {attempt.score_correct}/{attempt.score_total}
        </h2>
        <p className="text-lg text-(--text-secondary) mb-4">
          {scorePercent}% {isPassing ? t('Pass') : t('Review Recommended')}
        </p>

        {attempt.time_elapsed_seconds !== null && (
          <div className="flex items-center justify-center gap-2 text-sm text-(--text-secondary)">
            <Clock size={16} />
            <span>{t('Time')}: {formatTime(attempt.time_elapsed_seconds)}</span>
            {attempt.auto_submitted && <span className="text-(--warning)">({t('Auto-submitted')})</span>}
          </div>
        )}
      </div>

      {/* Strong Points */}
      {strong.length > 0 && (
        <div className="p-5 bg-(--success)/10 border border-(--success)/30 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={20} className="text-(--success)" />
            <h3 className="font-semibold text-(--text-primary)">{t('Strong Points')}</h3>
          </div>
          <div className="space-y-2">
            {strong.map((topic) => (
              <div key={topic.topic} className="flex items-center justify-between text-sm">
                <span className="text-(--text-primary)">{topic.topic}</span>
                <span className="font-semibold text-(--success)">
                  {topic.accuracy}% ({topic.correct}/{topic.total})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weak Points */}
      {weak.length > 0 && (
        <div className="p-5 bg-(--error)/10 border border-(--error)/30 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={20} className="text-(--error)" />
            <h3 className="font-semibold text-(--text-primary)">{t('Areas to Improve')}</h3>
          </div>
          <div className="space-y-2">
            {weak.map((topic) => (
              <div key={topic.topic} className="flex items-center justify-between text-sm">
                <span className="text-(--text-primary)">{topic.topic}</span>
                <span className="font-semibold text-(--error)">
                  {topic.accuracy}% ({topic.correct}/{topic.total})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Corrections Section */}
      <div className="p-5 bg-(--bg-surface) border border-(--border-subtle) rounded-xl">
        <button
          onClick={() => setShowCorrections(!showCorrections)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="font-semibold text-(--text-primary)">{t('Review All Questions')}</h3>
          {showCorrections ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {showCorrections && (
          <div className="mt-4 space-y-4">
            {corrections.map((correction, index) => (
              <div
                key={correction.question.id}
                className={`
                  p-4 rounded-xl border
                  ${
                    correction.isCorrect
                      ? 'bg-(--success)/5 border-(--success)/30'
                      : 'bg-(--error)/5 border-(--error)/30'
                  }
                `}
              >
                <div className="flex items-start gap-2 mb-2">
                  {correction.isCorrect ? (
                    <CheckCircle2 size={20} className="text-(--success) shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={20} className="text-(--error) shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-(--text-primary) text-sm mb-1">
                      {t('Question {{number}}', { number: index + 1 })}
                    </p>
                    <p className="text-sm text-(--text-primary) mb-3">
                      {correction.question.question_text}
                    </p>

                    <div className="space-y-1 text-xs">
                      <p>
                        <span className="text-(--text-secondary)">{t('Your answer')}: </span>
                        <span
                          className={correction.isCorrect ? 'text-(--success)' : 'text-(--error)'}
                        >
                          {correction.selectedOption}
                        </span>
                      </p>
                      {!correction.isCorrect && (
                        <p>
                          <span className="text-(--text-secondary)">{t('Correct answer')}: </span>
                          <span className="text-(--success) font-semibold">
                            {correction.correctOption}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBackToTests}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-(--bg-surface) border border-(--border-subtle) text-(--text-primary) font-semibold hover:bg-(--bg-hover) transition-colors"
        >
          <Home size={18} />
          {t('Back to Tests')}
        </button>
        <button
          onClick={onRestart}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-(--info) text-white font-semibold hover:opacity-90 transition-opacity"
        >
          <RotateCcw size={18} />
          {t('Take Another Test')}
        </button>
      </div>
    </div>
  )
}
