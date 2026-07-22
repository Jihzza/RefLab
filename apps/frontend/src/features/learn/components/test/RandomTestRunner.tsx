import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, ProgressBar, Surface } from '@/components/ui'
import { generateRandomTest, saveAnswer, submitRandomTest } from '../../api/testsApi'
import { useTestTimer, getTimerColorClass } from '../../hooks/useTestTimer'
import type { TestQuestion, OptionLetter } from '../../types'
import { LearningChoice, LearningLoading, LearningMessage, LearningSectionHeading } from '../LearningUI'

interface RandomTestRunnerProps {
  onComplete: (attemptId: string) => void
}

export default function RandomTestRunner({ onComplete }: RandomTestRunnerProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [attemptId, setAttemptId] = useState<string>('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [selectedOption, setSelectedOption] = useState<number | null>(null)

  const currentQuestion = questions[currentIndex]
  const answeredCount = Object.keys(answers).length
  const isAnswered = Boolean(currentQuestion && currentQuestion.id in answers)
  const isLastQuestion = currentIndex === questions.length - 1

  const handleTimerExpire = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    await submitRandomTest(attemptId, 2400, true)
    onComplete(attemptId)
  }, [attemptId, submitting, onComplete])

  const timerData = useTestTimer(2400, handleTimerExpire)

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

    void init()
    return () => { cancelled = true }
  }, [])

  const handleSelectOption = async (index: number) => {
    if (!currentQuestion || isAnswered) return
    setSelectedOption(index)
    const optionLetter = String.fromCharCode(65 + index) as OptionLetter
    await saveAnswer(attemptId, currentQuestion.id, optionLetter)
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: index }))
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      setSelectedOption(answers[questions[nextIndex].id] ?? null)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const previousIndex = currentIndex - 1
      setCurrentIndex(previousIndex)
      setSelectedOption(answers[questions[previousIndex].id] ?? null)
    }
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    const { elapsed } = timerData
    await submitRandomTest(attemptId, elapsed, false)
    onComplete(attemptId)
  }

  if (loading) return <LearningLoading label={t('Generating your test...')} />

  if (questions.length === 0) {
    return (
      <LearningMessage
        icon={<AlertTriangle size={22} />}
        title={t('Failed to load test')}
        description={t('Please try again')}
      />
    )
  }

  const options = [
    { letter: 'A', text: currentQuestion.option_a },
    { letter: 'B', text: currentQuestion.option_b },
    { letter: 'C', text: currentQuestion.option_c },
    { letter: 'D', text: currentQuestion.option_d },
  ]

  return (
    <div className="space-y-4 md:space-y-5">
      <LearningSectionHeading
        eyebrow={t('Test')}
        title={t('Referee Knowledge Test')}
        description={t('{{answered}} of {{total}} answered', { answered: answeredCount, total: questions.length })}
      />

      <Surface className="sticky top-2 z-10 backdrop-blur-xl" padding="sm" variant="raised">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className={`flex items-center gap-2 ${getTimerColorClass(timerData.timeRemaining)}`}>
            <Clock size={17} aria-hidden="true" />
            <span className="mc-tabular font-mono text-sm font-bold">{timerData.formatted}</span>
          </div>
          <span className="mc-tabular text-xs font-semibold text-(--mc-color-text-secondary)">
            {t('Question {{current}} of {{total}}', { current: currentIndex + 1, total: questions.length })}
          </span>
        </div>
        <ProgressBar
          value={answeredCount}
          max={questions.length}
          size="sm"
          tone="accent"
          aria-label={t('{{answered}} of {{total}} answered', { answered: answeredCount, total: questions.length })}
        />
      </Surface>

      <Surface className="overflow-hidden" padding="none" variant="raised">
        <div className="border-b border-(--mc-color-border) px-4 py-4 sm:px-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="accent">
              {t('Question {{number}}', { number: currentIndex + 1 })}
            </Badge>
            {currentQuestion.law !== null && (
              <Badge>L{currentQuestion.law}</Badge>
            )}
            {currentQuestion.topic && <Badge>{currentQuestion.topic}</Badge>}
          </div>
          <h3 className="text-base font-semibold leading-7 text-(--mc-color-text) sm:text-lg">
            {currentQuestion.question_text}
          </h3>
        </div>

        <div className="space-y-2.5 p-4 sm:p-6">
          {options.map((option, index) => (
            <LearningChoice
              key={option.letter}
              marker={selectedOption === index && isAnswered ? <Check size={15} /> : option.letter}
              state={selectedOption === index ? 'selected' : 'default'}
              onClick={() => void handleSelectOption(index)}
              disabled={isAnswered}
              aria-pressed={selectedOption === index}
            >
              {option.text}
            </LearningChoice>
          ))}

          {isAnswered && (
            <p className="pt-1 text-center text-xs leading-5 text-(--mc-color-text-muted)">
              {t('Answer locked. Use navigation buttons to continue.')}
            </p>
          )}
        </div>
      </Surface>

      <div className="grid grid-cols-[auto_1fr] gap-3">
        <Button
          variant="secondary"
          leadingIcon={<ChevronLeft size={17} />}
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          {t('Back')}
        </Button>

        {isLastQuestion ? (
          <Button
            fullWidth
            loading={submitting}
            loadingText={t('Submitting...')}
            disabled={answeredCount < questions.length}
            onClick={() => void handleSubmit()}
          >
            {t('Submit Test')}
          </Button>
        ) : (
          <Button
            fullWidth
            trailingIcon={<ChevronRight size={17} />}
            onClick={handleNext}
            disabled={!isAnswered}
          >
            {t('Next')}
          </Button>
        )}
      </div>
    </div>
  )
}
