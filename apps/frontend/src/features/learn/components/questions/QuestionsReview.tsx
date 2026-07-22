import { useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  RotateCcw,
  Target,
  XCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, ProgressBar, Surface } from '@/components/ui'
import { formatTime } from '../../hooks/useTestTimer'
import type { AnsweredQuestion, SessionResult } from '../../types'
import { LearningSectionHeading, MatchAccent } from '../LearningUI'

interface QuestionsReviewProps {
  result: SessionResult
  onStartNew: () => void
  onRestart: () => void
}

const LETTERS = ['A', 'B', 'C', 'D'] as const
const getOption = (question: AnsweredQuestion['question'], index: number) =>
  [question.option_a, question.option_b, question.option_c, question.option_d][index]

export default function QuestionsReview({ result, onStartNew, onRestart }: QuestionsReviewProps) {
  const { t } = useTranslation()
  const [showCorrections, setShowCorrections] = useState(false)
  const { totalAnswered, totalCorrect, durationSeconds, answers } = result
  const scorePercent = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
  const isPassing = scorePercent >= 75

  return (
    <div className="space-y-5 md:space-y-6">
      <LearningSectionHeading
        eyebrow={t('Questions')}
        title={t('Session Complete')}
        description={t('{{correct}} correct out of {{answered}} answered', {
          correct: totalCorrect,
          answered: totalAnswered,
        })}
      />

      <Surface className="relative overflow-hidden border-(--mc-color-accent)/35" padding="lg" variant="raised">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <MatchAccent />
              <Badge variant={isPassing ? 'success' : 'warning'}>
                {isPassing ? t('Excellent work!') : t('Review Recommended')}
              </Badge>
            </div>
            <p className={`mc-tabular text-6xl font-extrabold tracking-[-0.06em] ${
              isPassing ? 'text-(--mc-color-success)' : 'text-(--mc-color-warning)'
            }`}>
              {scorePercent}%
            </p>
            <p className="mt-2 text-sm text-(--mc-color-text-secondary)">
              {t('{{correct}} correct out of {{answered}} answered', {
                correct: totalCorrect,
                answered: totalAnswered,
              })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
            <SummaryFact icon={<Target size={17} />} value={t('{{score}}% accuracy', { score: scorePercent })} />
            <SummaryFact icon={<Clock size={17} />} value={formatTime(durationSeconds)} />
          </div>
        </div>
        <ProgressBar className="mt-6" value={scorePercent} tone={isPassing ? 'success' : 'warning'} size="sm" />
      </Surface>

      {answers.length > 0 && (
        <Surface padding="none">
          <button
            type="button"
            onClick={() => setShowCorrections((current) => !current)}
            className="mc-focus-ring flex min-h-14 w-full items-center justify-between gap-3 rounded-(--mc-radius-card) px-4 py-3 text-left hover:bg-(--mc-color-surface-hover)"
            aria-expanded={showCorrections}
          >
            <span className="font-semibold text-(--mc-color-text)">
              {t('Review Answers ({{count}})', { count: answers.length })}
            </span>
            <span className="text-(--mc-color-text-muted)" aria-hidden="true">
              {showCorrections ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
            </span>
          </button>

          {showCorrections && (
            <div className="space-y-3 border-t border-(--mc-color-border) p-3 sm:p-4">
              {answers.map((answered, index) => {
                const { question, selectedIndex, isCorrect } = answered
                const correctIndex = LETTERS.indexOf(question.correct_option)
                const selectedText = getOption(question, selectedIndex)
                const correctText = getOption(question, correctIndex)

                return (
                  <article
                    key={`${question.id}-${index}`}
                    className={`rounded-xl border p-4 ${
                      isCorrect
                        ? 'border-(--mc-color-success)/35 bg-(--mc-color-success)/5'
                        : 'border-(--mc-color-danger)/35 bg-(--mc-color-danger)/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-(--mc-color-success)" aria-hidden="true" />
                      ) : (
                        <XCircle size={19} className="mt-0.5 shrink-0 text-(--mc-color-danger)" aria-hidden="true" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-6 text-(--mc-color-text)">{question.question_text}</p>
                        <div className="mt-3 space-y-2 text-xs leading-5">
                          <p className="grid grid-cols-[auto_1fr] gap-2">
                            <span className="text-(--mc-color-text-muted)">{t('Your answer')}:</span>
                            <span className={isCorrect ? 'text-(--mc-color-success)' : 'text-(--mc-color-danger)'}>
                              <strong>{LETTERS[selectedIndex]}</strong> · {selectedText}
                            </span>
                          </p>
                          {!isCorrect && (
                            <p className="grid grid-cols-[auto_1fr] gap-2">
                              <span className="text-(--mc-color-text-muted)">{t('Correct answer')}:</span>
                              <span className="text-(--mc-color-success)">
                                <strong>{question.correct_option}</strong> · {correctText}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </Surface>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="secondary" fullWidth leadingIcon={<ArrowLeft size={17} />} onClick={onStartNew}>
          {t('Back')}
        </Button>
        <Button fullWidth leadingIcon={<RotateCcw size={17} />} onClick={onRestart}>
          {t('Practice Again')}
        </Button>
      </div>
    </div>
  )
}

function SummaryFact({ icon, value }: { icon: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-(--mc-color-border) bg-(--mc-color-canvas)/80 px-3 py-2 text-sm font-semibold text-(--mc-color-text-secondary)">
      <span className="text-(--mc-color-accent)" aria-hidden="true">{icon}</span>
      <span>{value}</span>
    </div>
  )
}
