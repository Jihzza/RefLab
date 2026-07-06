import { useState, useEffect } from 'react'
import { Trophy, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, RotateCcw, Home } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabaseClient'
import { getAttemptTopicBreakdown, getAttemptCorrections } from '../../api/testsApi'
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

      // Fetch corrections — the server reveals the answer key only for the
      // caller's own submitted attempt (get_attempt_corrections RPC).
      const { data: correctionsData } = await getAttemptCorrections(attemptId)
      if (correctionsData) {
        setCorrections(
          correctionsData.map((c) => ({
            question: c.question,
            selectedOption: c.selected_option,
            correctOption: c.correct_option,
            isCorrect: c.is_correct,
          }))
        )
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
          className="mt-4 px-6 py-2 bg-(--info) text-white rounded-(--radius-button) font-semibold hover:opacity-90"
        >
          {t('Back to Tests')}
        </button>
      </div>
    )
  }

  const scorePercent = attempt.score_percent || 0
  const isPassing = scorePercent >= 80

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Score Card */}
      <div className="card-console field-lines relative overflow-hidden p-6 text-center">
        <span className="flag-accent absolute inset-x-0 top-0 h-1" aria-hidden="true" />
        <Trophy
          size={40}
          className={`mx-auto mb-3 ${isPassing ? 'text-(--success)' : 'text-(--warning)'}`}
        />
        <p className="eyebrow mb-1">{t('Result')}</p>
        <h2 className={`numeral text-display-sm mb-1 ${isPassing ? 'text-(--success)' : 'text-(--warning)'}`}>
          {attempt.score_correct}/{attempt.score_total}
        </h2>
        <p className="numeral text-lg font-semibold text-(--text-secondary) mb-4">
          {scorePercent}% · {isPassing ? t('Pass') : t('Review Recommended')}
        </p>

        {attempt.time_elapsed_seconds !== null && (
          <div className="inline-flex items-center justify-center gap-2 rounded-(--radius-pill) border border-(--border-subtle) bg-(--bg-surface-2) px-3 py-1.5 text-sm text-(--text-secondary)">
            <Clock size={16} />
            <span className="numeral">{t('Time')}: {formatTime(attempt.time_elapsed_seconds)}</span>
            {attempt.auto_submitted && <span className="text-(--warning)">({t('Auto-submitted')})</span>}
          </div>
        )}
      </div>

      {/* Strong Points */}
      {strong.length > 0 && (
        <div className="card-console p-5 border-l-2 border-l-(--success)">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-(--success)" />
            <h3 className="font-bold text-(--text-primary)">{t('Strong Points')}</h3>
          </div>
          <div className="space-y-3">
            {strong.map((topic) => (
              <div key={topic.topic} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-(--text-primary)">{topic.topic}</span>
                  <span className="numeral font-bold text-(--success)">
                    {topic.accuracy}% ({topic.correct}/{topic.total})
                  </span>
                </div>
                <div className="h-1.5 rounded-(--radius-pill) bg-(--bg-surface-2) overflow-hidden">
                  <div className="h-full rounded-(--radius-pill) bg-(--success)" style={{ width: `${topic.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weak Points */}
      {weak.length > 0 && (
        <div className="card-console p-5 border-l-2 border-l-(--error)">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={20} className="text-(--error)" />
            <h3 className="font-bold text-(--text-primary)">{t('Areas to Improve')}</h3>
          </div>
          <div className="space-y-3">
            {weak.map((topic) => (
              <div key={topic.topic} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-(--text-primary)">{topic.topic}</span>
                  <span className="numeral font-bold text-(--error)">
                    {topic.accuracy}% ({topic.correct}/{topic.total})
                  </span>
                </div>
                <div className="h-1.5 rounded-(--radius-pill) bg-(--bg-surface-2) overflow-hidden">
                  <div className="h-full rounded-(--radius-pill) bg-(--error)" style={{ width: `${topic.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Corrections Section */}
      <div className="card-console p-5">
        <button
          onClick={() => setShowCorrections(!showCorrections)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="font-bold text-(--text-primary)">{t('Review All Questions')}</h3>
          {showCorrections ? <ChevronUp size={20} className="text-(--text-muted)" /> : <ChevronDown size={20} className="text-(--text-muted)" />}
        </button>

        {showCorrections && (
          <div className="mt-4 space-y-4">
            {corrections.map((correction, index) => (
              <div
                key={correction.question.id}
                className={`
                  p-4 rounded-(--radius-button) border-l-2 bg-(--bg-surface-2)
                  ${
                    correction.isCorrect
                      ? 'border-l-(--success)'
                      : 'border-l-(--error)'
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
                    <p className="eyebrow mb-1">
                      {t('Question {{number}}', { number: index + 1 })}
                    </p>
                    <p className="text-sm text-(--text-primary) mb-3 leading-snug">
                      {correction.question.question_text}
                    </p>

                    <div className="space-y-1 text-xs">
                      <p>
                        <span className="text-(--text-muted)">{t('Your answer')}: </span>
                        <span
                          className={`numeral font-semibold ${correction.isCorrect ? 'text-(--success)' : 'text-(--error)'}`}
                        >
                          {correction.selectedOption}
                        </span>
                      </p>
                      {!correction.isCorrect && (
                        <p>
                          <span className="text-(--text-muted)">{t('Correct answer')}: </span>
                          <span className="numeral text-(--success) font-bold">
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
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-(--radius-button) card-console text-(--text-primary) font-semibold hover:border-(--border-strong) transition-colors"
        >
          <Home size={18} />
          {t('Back to Tests')}
        </button>
        <button
          onClick={onRestart}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-(--radius-button) bg-(--info) text-white font-semibold transition-[filter] hover:brightness-110 active:scale-[0.99]"
        >
          <RotateCcw size={18} />
          {t('Take Another Test')}
        </button>
      </div>
    </div>
  )
}
