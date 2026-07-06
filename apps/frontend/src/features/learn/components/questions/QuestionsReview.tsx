import { useState } from 'react'
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Clock, Target, RotateCcw, ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatTime } from '../../hooks/useTestTimer'
import type { SessionResult, AnsweredQuestion } from '../../types'

interface QuestionsReviewProps {
  result: SessionResult
  onStartNew: () => void
  onRestart: () => void
}

const LETTERS = ['A', 'B', 'C', 'D'] as const
const getOption = (q: AnsweredQuestion['question'], idx: number) =>
  [q.option_a, q.option_b, q.option_c, q.option_d][idx]

/**
 * QuestionsReview - Post-session summary screen
 *
 * Shows:
 * - Score summary (fraction, percentage, duration)
 * - Collapsible per-question corrections list
 * - CTA buttons to start a new session or return to the landing
 *
 * All data comes from the result prop — no async loading needed.
 */
export default function QuestionsReview({ result, onStartNew, onRestart }: QuestionsReviewProps) {
  const { t } = useTranslation()
  const [showCorrections, setShowCorrections] = useState(false)

  const { totalAnswered, totalCorrect, durationSeconds, answers } = result
  const scorePercent = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
  const isPassing = scorePercent >= 75

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Score summary card */}
      <div className="card-console field-lines relative overflow-hidden p-6 text-center space-y-3">
        <span className="flag-accent absolute inset-x-0 top-0 h-1" aria-hidden="true" />
        <p className="eyebrow">{t('Debrief')}</p>
        <h2 className="text-xl font-bold text-(--text-primary)">{t('Session Complete')}</h2>

        <div
          className={`numeral text-display-sm ${isPassing ? 'text-(--success)' : 'text-(--error)'}`}
        >
          {scorePercent}%
        </div>

        <p className="text-sm text-(--text-secondary)">
          {t('{{correct}} correct out of {{answered}} answered', { correct: totalCorrect, answered: totalAnswered })}
        </p>

        <div className="flex items-center justify-center gap-6 pt-1">
          <StatPill icon={<Target size={14} />} label={t('{{score}}% accuracy', { score: scorePercent })} />
          <StatPill icon={<Clock size={14} />} label={formatTime(durationSeconds)} />
        </div>
      </div>

      {/* Corrections toggle */}
      {answers.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowCorrections(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 card-console text-sm font-semibold text-(--text-primary) hover:border-(--border-strong) transition-colors"
          >
            <span>{t('Review Answers ({{count}})', { count: answers.length })}</span>
            {showCorrections ? <ChevronUp size={16} className="text-(--text-muted)" /> : <ChevronDown size={16} className="text-(--text-muted)" />}
          </button>

          {showCorrections && (
            <div className="space-y-3">
              {answers.map((answered, i) => {
                const { question, selectedIndex, correctOption, isCorrect } = answered
                const correctIdx = ['A', 'B', 'C', 'D'].indexOf(correctOption)
                const selectedText = getOption(question, selectedIndex)
                const correctText = getOption(question, correctIdx)

                return (
                  <div
                    key={`${question.id}-${i}`}
                    className={`card-console p-4 border-l-2 ${
                      isCorrect
                        ? 'border-l-(--success)'
                        : 'border-l-(--error)'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-3">
                      {isCorrect ? (
                        <CheckCircle2 size={16} className="text-(--success) shrink-0 mt-0.5" />
                      ) : (
                        <XCircle size={16} className="text-(--error) shrink-0 mt-0.5" />
                      )}
                      <p className="text-sm font-medium text-(--text-primary) leading-snug">
                        {question.question_text}
                      </p>
                    </div>

                    <div className="space-y-1 ml-6">
                      <p className="text-xs text-(--text-muted)">
                        <span className="font-semibold">{t('Your answer')}:</span>{' '}
                        <span className={isCorrect ? 'text-(--success)' : 'text-(--error)'}>
                          {LETTERS[selectedIndex]}. {selectedText}
                        </span>
                      </p>
                      {!isCorrect && (
                        <p className="text-xs text-(--text-muted)">
                          <span className="font-semibold">{t('Correct answer')}:</span>{' '}
                          <span className="text-(--success) font-semibold">
                            {correctOption}. {correctText}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* CTA buttons */}
      <div className="flex gap-3">
        <button
          onClick={onStartNew}
          className="flex-1 py-3 card-console text-(--text-primary) rounded-(--radius-button) font-semibold flex items-center justify-center gap-2 hover:border-(--border-strong) transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          {t('Back')}
        </button>
        <button
          onClick={onRestart}
          className="flex-1 py-3 bg-(--info) text-white rounded-(--radius-button) font-semibold flex items-center justify-center gap-2 transition-[filter] hover:brightness-110 active:scale-[0.99] text-sm"
        >
          <RotateCcw size={16} />
          {t('Practice Again')}
        </button>
      </div>
    </div>
  )
}

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-(--radius-pill) border border-(--border-subtle) bg-(--bg-surface-2) px-3 py-1.5 text-(--text-secondary) text-sm">
      <span className="text-(--brand-yellow)">{icon}</span>
      <span className="numeral">{label}</span>
    </div>
  )
}
