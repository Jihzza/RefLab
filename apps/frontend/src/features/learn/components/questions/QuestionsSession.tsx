import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Check, Timer, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Dialog, Surface } from '@/components/ui'
import {
  completeQuestionSession,
  getQuestionsByFilters,
  savePracticeAnswerWithSession,
} from '../../api/testsApi'
import type { AnsweredQuestion, OptionLetter, QuestionSessionMode, SessionResult, TestQuestion } from '../../types'
import { LearningChoice, LearningError, LearningLoading, LearningMessage, LearningSectionHeading } from '../LearningUI'

const LETTERS: OptionLetter[] = ['A', 'B', 'C', 'D']
const getOptions = (question: TestQuestion) => [question.option_a, question.option_b, question.option_c, question.option_d]
const indexToLetter = (index: number): OptionLetter => LETTERS[index]
const letterToIndex = (letter: OptionLetter): number => LETTERS.indexOf(letter)

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let index = copy.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]]
  }
  return copy
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

interface QuestionsSessionProps {
  sessionId: string
  mode: QuestionSessionMode
  filterLaws: number[] | null
  filterAreas: string[] | null
  startedAt: string
  onEndSession: (result: SessionResult) => void
}

export default function QuestionsSession({
  sessionId,
  mode,
  filterLaws,
  filterAreas,
  startedAt,
  onEndSession,
}: QuestionsSessionProps) {
  const { t } = useTranslation()
  const [pool, setPool] = useState<TestQuestion[]>([])
  const [, setQueue] = useState<TestQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [currentQ, setCurrentQ] = useState<TestQuestion | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [answeredQuestions, setAnsweredQuestions] = useState<AnsweredQuestion[]>([])
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [ending, setEnding] = useState(false)
  const lastQuestionIdRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await getQuestionsByFilters({
        laws: filterLaws ?? undefined,
        areas: filterAreas ?? undefined,
      })

      if (!cancelled && data?.length) {
        const shuffled = shuffle(data)
        setPool(data)
        setQueue(shuffled)
        setCurrentQ(shuffled[0])
        lastQuestionIdRef.current = shuffled[0].id
      }
      if (!cancelled) {
        setLoadError(Boolean(error))
        setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [filterLaws, filterAreas])

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsedSeconds((current) => current + 1), 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const advanceQuestion = () => {
    setSelectedOption(null)
    setShowAnswer(false)

    setQueue((currentQueue) => {
      let remaining = currentQueue.slice(1)
      if (remaining.length === 0) {
        const reshuffled = shuffle(pool)
        if (reshuffled[0]?.id === lastQuestionIdRef.current && reshuffled.length > 1) {
          ;[reshuffled[0], reshuffled[1]] = [reshuffled[1], reshuffled[0]]
        }
        remaining = reshuffled
      }

      const next = remaining[0]
      setCurrentQ(next ?? null)
      lastQuestionIdRef.current = next?.id ?? null
      return remaining
    })
  }

  const handleCheck = async () => {
    if (selectedOption === null || !currentQ || showAnswer) return
    const isCorrect = selectedOption === letterToIndex(currentQ.correct_option)
    setShowAnswer(true)

    const answered: AnsweredQuestion = {
      question: currentQ,
      selectedOption: indexToLetter(selectedOption),
      selectedIndex: selectedOption,
      isCorrect,
    }

    setAnsweredQuestions((current) => [...current, answered])
    if (isCorrect) setTotalCorrect((current) => current + 1)
    await savePracticeAnswerWithSession(currentQ.id, indexToLetter(selectedOption), isCorrect, sessionId)
  }

  const handleEndSession = async () => {
    if (ending) return
    setEnding(true)
    if (timerRef.current) clearInterval(timerRef.current)

    const endedAt = new Date().toISOString()
    const durationSeconds = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)

    await completeQuestionSession(sessionId, startedAt, answeredQuestions.length, totalCorrect)
    onEndSession({
      sessionId,
      startedAt,
      endedAt,
      durationSeconds,
      totalAnswered: answeredQuestions.length,
      totalCorrect,
      answers: answeredQuestions,
    })
  }

  if (loading) return <LearningLoading label={t('Loading questions…')} />

  if (loadError) {
    return <LearningError title={t('Failed to load questions')} description={t('Please try again')} />
  }

  if (!currentQ) {
    return (
      <LearningMessage
        icon={<BookOpen size={22} />}
        title={t('No questions found for the selected filters.')}
        action={(
          <Button variant="secondary" onClick={() => void handleEndSession()} loading={ending}>
            {t('Go Back')}
          </Button>
        )}
      />
    )
  }

  const options = getOptions(currentQ)
  const correctIndex = letterToIndex(currentQ.correct_option)
  const totalAnswered = answeredQuestions.length
  const modeLabel = mode === 'quick' ? t('Quick Questions') : mode === 'by_law' ? t('By Law') : t('By Area')

  return (
    <>
      <Dialog
        open={showEndConfirm}
        onOpenChange={setShowEndConfirm}
        title={t('End Session?')}
        description={t("You've answered {{total}} {{label}} so far. Your results will be shown on the next screen.", {
          total: totalAnswered,
          label: t(totalAnswered === 1 ? 'question' : 'questions'),
        })}
        dialogRole="alertdialog"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setShowEndConfirm(false)}>{t('Cancel')}</Button>
            <Button variant="danger" loading={ending} onClick={() => void handleEndSession()}>{t('End Session')}</Button>
          </>
        )}
      />

      <div className="space-y-4 md:space-y-5">
        <LearningSectionHeading
          eyebrow={modeLabel}
          title={t('Practice Questions')}
          description={t('Answer at your own pace · No time limit')}
        />

        <Surface className="sticky top-2 z-10 backdrop-blur-xl" padding="sm" variant="raised">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-(--mc-color-accent)">
              <Timer size={17} aria-hidden="true" />
              <span className="mc-tabular font-mono text-sm font-bold">{formatElapsed(elapsedSeconds)}</span>
            </div>
            <Badge variant={totalAnswered > 0 ? 'accent' : 'neutral'}>
              {t('{{correct}}/{{total}} correct', { correct: totalCorrect, total: totalAnswered })}
            </Badge>
            <Button variant="ghost" size="sm" className="text-(--mc-color-danger)" onClick={() => setShowEndConfirm(true)}>
              {t('End Session')}
            </Button>
          </div>
        </Surface>

        <Surface padding="none" variant="raised">
          <div className="border-b border-(--mc-color-border) px-4 py-4 sm:px-6">
            <div className="mb-3 flex flex-wrap gap-2">
              {currentQ.law !== null && <Badge variant="accent">L{currentQ.law}</Badge>}
              {currentQ.topic && <Badge>{currentQ.topic}</Badge>}
            </div>
            <h3 className="text-base font-semibold leading-7 text-(--mc-color-text) sm:text-lg">
              {currentQ.question_text}
            </h3>
          </div>

          <div className="space-y-2.5 p-4 sm:p-6">
            {options.map((option, index) => {
              let state: 'default' | 'selected' | 'correct' | 'incorrect' | 'muted' = 'default'
              if (showAnswer) {
                if (index === correctIndex) state = 'correct'
                else if (index === selectedOption) state = 'incorrect'
                else state = 'muted'
              } else if (index === selectedOption) {
                state = 'selected'
              }

              return (
                <LearningChoice
                  key={LETTERS[index]}
                  marker={showAnswer && index === correctIndex
                    ? <Check size={15} />
                    : showAnswer && index === selectedOption
                      ? <X size={15} />
                      : LETTERS[index]}
                  state={state}
                  disabled={showAnswer}
                  aria-pressed={index === selectedOption}
                  onClick={() => setSelectedOption(index)}
                >
                  {option}
                </LearningChoice>
              )
            })}
          </div>
        </Surface>

        {!showAnswer ? (
          <Button fullWidth size="lg" disabled={selectedOption === null} onClick={() => void handleCheck()}>
            {t('Check Answer')}
          </Button>
        ) : (
          <Button fullWidth size="lg" trailingIcon={<ArrowRight size={17} />} onClick={advanceQuestion}>
            {t('Next Question')}
          </Button>
        )}
      </div>
    </>
  )
}
