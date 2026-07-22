import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Home,
  RotateCcw,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  XCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, ProgressBar, Surface } from '@/components/ui'
import { supabase } from '@/lib/supabaseClient'
import { getAttemptTopicBreakdown, getAttemptAnswers } from '../../api/testsApi'
import { formatTime } from '../../hooks/useTestTimer'
import type { TestAttempt, TestQuestion, TopicPerformance } from '../../types'
import { LearningError, LearningLoading, LearningSectionHeading, MatchAccent } from '../LearningUI'

interface RandomTestResultsProps {
  attemptId: string
  onRestart: () => void
  onBackToTests: () => void
}

interface Correction {
  question: TestQuestion
  selectedOption: string
  correctOption: string
  isCorrect: boolean
}

function optionText(question: TestQuestion, letter: string) {
  const options: Record<string, string> = {
    A: question.option_a,
    B: question.option_b,
    C: question.option_c,
    D: question.option_d,
  }
  return options[letter] ?? ''
}

export default function RandomTestResults({ attemptId, onRestart, onBackToTests }: RandomTestResultsProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState<TestAttempt | null>(null)
  const [strong, setStrong] = useState<TopicPerformance[]>([])
  const [weak, setWeak] = useState<TopicPerformance[]>([])
  const [corrections, setCorrections] = useState<Correction[]>([])
  const [showCorrections, setShowCorrections] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchResults() {
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

      const { data: breakdownData } = await getAttemptTopicBreakdown(attemptId)
      if (breakdownData) {
        setStrong(breakdownData.strong || [])
        setWeak(breakdownData.weak || [])
      }

      const { data: answersData } = await getAttemptAnswers(attemptId)
      if (answersData?.length) {
        const questionIds = answersData.map((answer) => answer.question_id)
        const { data: questionsData } = await supabase
          .from('question_bank')
          .select('*')
          .in('id', questionIds)

        if (questionsData) {
          const correctionsData = answersData.flatMap((answer) => {
            const question = questionsData.find((item) => item.id === answer.question_id)
            if (!question) return []
            return [{
              question: question as TestQuestion,
              selectedOption: answer.selected_option,
              correctOption: question.correct_option || '',
              isCorrect: Boolean(answer.is_correct),
            }]
          })
          setCorrections(correctionsData)
        }
      }

      if (!cancelled) setLoading(false)
    }

    void fetchResults()
    return () => { cancelled = true }
  }, [attemptId])

  if (loading) return <LearningLoading label={t('Loading results...')} />

  if (!attempt) {
    return (
      <LearningError
        title={t('Failed to load results')}
        description={t('Please try again')}
        retryLabel={t('Back to Tests')}
        onRetry={onBackToTests}
      />
    )
  }

  const scorePercent = attempt.score_percent ?? 0
  const isPassing = scorePercent >= 80

  return (
    <div className="space-y-5 md:space-y-6">
      <LearningSectionHeading
        eyebrow={t('Test Completed')}
        title={isPassing ? t('Excellent work!') : t('Review Recommended')}
        description={t('{{correct}} out of {{total}} correct', {
          correct: attempt.score_correct ?? 0,
          total: attempt.score_total ?? 0,
        })}
      />

      <Surface className="relative overflow-hidden border-(--mc-color-accent)/35" padding="lg" variant="raised">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-40 opacity-15" aria-hidden="true">
          <span className="absolute right-0 top-0 h-full w-20 -skew-x-[18deg] bg-(--mc-color-accent)" />
          <span className="absolute right-24 top-0 h-full w-8 -skew-x-[18deg] bg-(--mc-color-danger)" />
        </div>
        <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <MatchAccent />
              <Badge variant={isPassing ? 'success' : 'warning'}>
                {isPassing ? t('Pass') : t('Review Recommended')}
              </Badge>
            </div>
            <p className={`mc-tabular text-6xl font-extrabold tracking-[-0.06em] ${
              isPassing ? 'text-(--mc-color-success)' : 'text-(--mc-color-warning)'
            }`}>
              {scorePercent}%
            </p>
            <p className="mt-2 text-sm text-(--mc-color-text-secondary)">
              {t('{{correct}} out of {{total}} correct', {
                correct: attempt.score_correct ?? 0,
                total: attempt.score_total ?? 0,
              })}
            </p>
          </div>
          <div className="flex gap-3 sm:flex-col">
            <ResultFact icon={<Trophy size={17} />} value={`${attempt.score_correct ?? 0}/${attempt.score_total ?? 0}`} />
            {attempt.time_elapsed_seconds !== null && (
              <ResultFact icon={<Clock size={17} />} value={formatTime(attempt.time_elapsed_seconds)} />
            )}
          </div>
        </div>
        {attempt.auto_submitted && (
          <p className="relative mt-4 text-xs font-medium text-(--mc-color-warning)">{t('Auto-submitted')}</p>
        )}
      </Surface>

      {(strong.length > 0 || weak.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {strong.length > 0 && (
            <PerformancePanel
              icon={<TrendingUp size={19} />}
              title={t('Strong Points')}
              items={strong}
              tone="success"
            />
          )}
          {weak.length > 0 && (
            <PerformancePanel
              icon={<TrendingDown size={19} />}
              title={t('Areas to Improve')}
              items={weak}
              tone="danger"
            />
          )}
        </div>
      )}

      <Surface padding="none">
        <button
          type="button"
          onClick={() => setShowCorrections((value) => !value)}
          className="mc-focus-ring flex min-h-14 w-full items-center justify-between gap-3 rounded-(--mc-radius-card) px-4 py-3 text-left hover:bg-(--mc-color-surface-hover)"
          aria-expanded={showCorrections}
        >
          <span className="flex items-center gap-2 font-semibold text-(--mc-color-text)">
            <Target size={18} className="text-(--mc-color-accent)" aria-hidden="true" />
            {t('Review All Questions')}
          </span>
          <span className="text-(--mc-color-text-muted)" aria-hidden="true">
            {showCorrections ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
          </span>
        </button>

        {showCorrections && (
          <div className="space-y-3 border-t border-(--mc-color-border) p-3 sm:p-4">
            {corrections.map((correction, index) => (
              <article
                key={correction.question.id}
                className={`rounded-xl border p-4 ${
                  correction.isCorrect
                    ? 'border-(--mc-color-success)/35 bg-(--mc-color-success)/5'
                    : 'border-(--mc-color-danger)/35 bg-(--mc-color-danger)/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  {correction.isCorrect ? (
                    <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-(--mc-color-success)" aria-hidden="true" />
                  ) : (
                    <XCircle size={19} className="mt-0.5 shrink-0 text-(--mc-color-danger)" aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-(--mc-color-text-muted)">
                      {t('Question {{number}}', { number: index + 1 })}
                    </p>
                    <p className="mt-1 text-sm font-medium leading-6 text-(--mc-color-text)">
                      {correction.question.question_text}
                    </p>
                    <div className="mt-3 space-y-2 text-xs leading-5">
                      <AnswerLine
                        label={t('Your answer')}
                        letter={correction.selectedOption}
                        text={optionText(correction.question, correction.selectedOption)}
                        correct={correction.isCorrect}
                      />
                      {!correction.isCorrect && (
                        <AnswerLine
                          label={t('Correct answer')}
                          letter={correction.correctOption}
                          text={optionText(correction.question, correction.correctOption)}
                          correct
                        />
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Surface>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="secondary" fullWidth leadingIcon={<Home size={17} />} onClick={onBackToTests}>
          {t('Back to Tests')}
        </Button>
        <Button fullWidth leadingIcon={<RotateCcw size={17} />} onClick={onRestart}>
          {t('Take Another Test')}
        </Button>
      </div>
    </div>
  )
}

function ResultFact({ icon, value }: { icon: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex min-w-24 items-center gap-2 rounded-xl border border-(--mc-color-border) bg-(--mc-color-canvas)/80 px-3 py-2 text-sm font-bold text-(--mc-color-text)">
      <span className="text-(--mc-color-accent)" aria-hidden="true">{icon}</span>
      <span className="mc-tabular">{value}</span>
    </div>
  )
}

function PerformancePanel({
  icon,
  title,
  items,
  tone,
}: {
  icon: React.ReactNode
  title: React.ReactNode
  items: TopicPerformance[]
  tone: 'success' | 'danger'
}) {
  const color = tone === 'success' ? 'text-(--mc-color-success)' : 'text-(--mc-color-danger)'
  return (
    <Surface padding="md">
      <div className={`mb-4 flex items-center gap-2 ${color}`}>
        {icon}
        <h3 className="font-bold text-(--mc-color-text)">{title}</h3>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <ProgressBar
            key={item.topic}
            value={item.accuracy}
            label={item.topic}
            valueLabel={`${item.accuracy}% · ${item.correct}/${item.total}`}
            showValue
            size="sm"
            tone={tone}
          />
        ))}
      </div>
    </Surface>
  )
}

function AnswerLine({
  label,
  letter,
  text,
  correct,
}: {
  label: React.ReactNode
  letter: string
  text: string
  correct: boolean
}) {
  return (
    <p className="grid grid-cols-[auto_1fr] gap-x-2">
      <span className="text-(--mc-color-text-muted)">{label}:</span>
      <span className={correct ? 'text-(--mc-color-success)' : 'text-(--mc-color-danger)'}>
        <strong>{letter}</strong>{text ? ` · ${text}` : ''}
      </span>
    </p>
  )
}
