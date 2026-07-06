import { useState, useEffect, useRef } from 'react'
import { Loader2, Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  getQuestionsByFilters,
  gradePracticeAnswer,
  completeQuestionSession,
} from '../../api/testsApi'
import type { TestQuestion, OptionLetter, QuestionSessionMode, AnsweredQuestion, SessionResult } from '../../types'

/* ─── Helpers ─── */

const LETTERS: OptionLetter[] = ['A', 'B', 'C', 'D']
const getOptions = (q: TestQuestion) => [q.option_a, q.option_b, q.option_c, q.option_d]
const indexToLetter = (idx: number): OptionLetter => LETTERS[idx]
const letterToIndex = (letter: OptionLetter): number => LETTERS.indexOf(letter)

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/* ─── Warning Modal ─── */

function WarningModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-session-title"
        className="card-console animate-scale-in p-6 rounded-(--radius-card) max-w-sm w-full shadow-[var(--shadow-pop)]"
      >
        <h3 id="end-session-title" className="text-base font-bold text-(--text-primary) mb-2">{title}</h3>
        <p className="text-sm text-(--text-secondary) mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-(--radius-button) bg-(--bg-surface-2) border border-(--border-subtle) text-(--text-secondary) font-semibold text-sm transition-colors hover:text-(--text-primary)"
          >
            {t('Cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-(--radius-button) bg-(--error) text-white font-semibold text-sm transition-[filter] hover:brightness-110"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── QuestionsSession ─── */

interface QuestionsSessionProps {
  sessionId: string
  mode: QuestionSessionMode
  filterLaws: number[] | null
  filterAreas: string[] | null
  startedAt: string
  onEndSession: (result: SessionResult) => void
}

/**
 * QuestionsSession - Active question practice session
 *
 * Features:
 * - Loads questions filtered by the chosen mode/laws/areas
 * - Infinite question pool: re-shuffles and loops when pool is exhausted
 * - Count-up timer (no limit)
 * - Immediate feedback after each answer
 * - "End Session" button with confirmation modal
 * - Saves each answer to DB (linked to session)
 */
export default function QuestionsSession({
  sessionId,
  filterLaws,
  filterAreas,
  startedAt,
  onEndSession,
}: QuestionsSessionProps) {
  const { t } = useTranslation()
  const [pool, setPool] = useState<TestQuestion[]>([])
  const [, setQueue] = useState<TestQuestion[]>([])
  const [loading, setLoading] = useState(true)

  const [currentQ, setCurrentQ] = useState<TestQuestion | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  // The correct option index for the current question, revealed by the server
  // grading response once the user checks their answer.
  const [correctIdx, setCorrectIdx] = useState<number | null>(null)
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState(false)

  const [answeredQuestions, setAnsweredQuestions] = useState<AnsweredQuestion[]>([])
  const [totalCorrect, setTotalCorrect] = useState(0)

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [ending, setEnding] = useState(false)

  // Track the last question shown to avoid immediate repeats on reshuffle
  const lastQuestionIdRef = useRef<string | null>(null)

  // Load question pool on mount
  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data } = await getQuestionsByFilters({
        laws: filterLaws ?? undefined,
        areas: filterAreas ?? undefined,
      })
      if (!cancelled && data && data.length > 0) {
        const shuffled = shuffle(data)
        setPool(data)
        setQueue(shuffled)
        setCurrentQ(shuffled[0])
        lastQuestionIdRef.current = shuffled[0].id
      }
      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [filterLaws, filterAreas])

  // Start count-up timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1)
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const advanceQuestion = () => {
    setSelectedOption(null)
    setShowAnswer(false)
    setCorrectIdx(null)
    setCheckError(false)

    setQueue(prevQueue => {
      let remaining = prevQueue.slice(1)

      // Re-shuffle and refill when queue is nearly empty, avoiding repeat of last question
      if (remaining.length === 0) {
        const reshuffled = shuffle(pool)
        if (reshuffled[0].id === lastQuestionIdRef.current && reshuffled.length > 1) {
          // Swap first and second to avoid immediate repeat
          ;[reshuffled[0], reshuffled[1]] = [reshuffled[1], reshuffled[0]]
        }
        remaining = reshuffled
      }

      const next = remaining[0]
      setCurrentQ(next)
      lastQuestionIdRef.current = next.id
      return remaining
    })
  }

  const handleCheck = async () => {
    if (selectedOption === null || !currentQ || showAnswer || checking) return

    setChecking(true)
    setCheckError(false)

    // Grade server-side: the answer key is never shipped to the client before
    // the answer is recorded. The response tells us both correctness and the
    // correct option so we can render the same immediate feedback as before.
    const selectedLetter = indexToLetter(selectedOption)
    const { data, error } = await gradePracticeAnswer(sessionId, currentQ.id, selectedLetter)

    if (error || !data) {
      setChecking(false)
      setCheckError(true)
      return
    }

    const correctLetter = data.correct_option
    const isCorrect = data.is_correct

    setCorrectIdx(letterToIndex(correctLetter))
    setShowAnswer(true)
    setChecking(false)

    const answered: AnsweredQuestion = {
      question: currentQ,
      selectedOption: selectedLetter,
      selectedIndex: selectedOption,
      correctOption: correctLetter,
      isCorrect,
    }

    setAnsweredQuestions(prev => [...prev, answered])
    if (isCorrect) setTotalCorrect(prev => prev + 1)
  }

  const handleEndSession = async () => {
    if (ending) return
    setEnding(true)

    if (timerRef.current) clearInterval(timerRef.current)

    const endedAt = new Date().toISOString()
    const durationSeconds = Math.round(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
    )

    await completeQuestionSession(
      sessionId,
      startedAt,
      answeredQuestions.length,
      totalCorrect
    )

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-6 h-6 text-(--text-muted) animate-spin" />
        <p className="text-sm text-(--text-muted)">{t('Loading questions…')}</p>
      </div>
    )
  }

  if (!currentQ) {
    return (
      <div className="text-center py-16">
        <p className="text-(--text-muted) text-sm">{t('No questions found for the selected filters.')}</p>
        <button
          onClick={handleEndSession}
          className="mt-4 px-4 py-2 text-sm rounded-(--radius-button) bg-(--bg-surface-2) text-(--text-secondary)"
        >
          {t('Go Back')}
        </button>
      </div>
    )
  }

  const options = getOptions(currentQ)
  const totalAnswered = answeredQuestions.length

  return (
    <>
      {showEndConfirm && (
        <WarningModal
          title={t('End Session?')}
          message={t("You've answered {{total}} {{label}} so far. Your results will be shown on the next screen.", {
            total: totalAnswered,
            label: t(totalAnswered === 1 ? 'question' : 'questions'),
          })}
          confirmLabel={t('End Session')}
          onConfirm={handleEndSession}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}

      <div className="flex flex-col gap-4 animate-fade-up">
        {/* Session header */}
        <div className="glass flex items-center justify-between gap-3 rounded-(--radius-card) border border-(--border-subtle) px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-(--text-secondary)">
            <Timer size={15} />
            <span className="numeral text-sm font-mono font-semibold">{formatElapsed(elapsedSeconds)}</span>
          </div>

          <span className="numeral text-xs font-semibold text-(--text-muted)">
            {t('{{correct}}/{{total}} correct', { correct: totalCorrect, total: totalAnswered })}
          </span>

          <button
            onClick={() => setShowEndConfirm(true)}
            disabled={ending}
            className="text-xs font-bold uppercase tracking-wider text-(--error) hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {t('End Session')}
          </button>
        </div>

        {/* Question */}
        <div className="card-console p-5">
          <h3 className="text-base font-semibold text-(--text-primary) leading-snug mb-4">
            {currentQ.question_text}
          </h3>

          {/* Options */}
          <div className="space-y-2">
            {options.map((opt, idx) => {
              let styles =
                'w-full text-left px-4 py-3 rounded-(--radius-button) border-2 text-sm transition-colors flex items-start gap-3 '
              if (showAnswer) {
                if (idx === correctIdx)
                  styles += 'border-(--success) bg-(--success)/10 text-(--text-primary)'
                else if (idx === selectedOption)
                  styles += 'border-(--error) bg-(--error)/10 text-(--text-primary)'
                else styles += 'border-(--border-subtle) text-(--text-muted)'
              } else if (idx === selectedOption) {
                styles += 'border-(--info) bg-(--info)/10 text-(--text-primary) ring-1 ring-(--info)/40'
              } else {
                styles += 'border-(--border-subtle) text-(--text-secondary) hover:border-(--border-strong) hover:bg-(--bg-surface-2)'
              }

              return (
                <button
                  key={idx}
                  onClick={() => !showAnswer && setSelectedOption(idx)}
                  disabled={showAnswer}
                  className={`${styles} ${showAnswer ? 'cursor-default' : ''}`}
                >
                  <span className="font-bold shrink-0">{LETTERS[idx]}.</span>
                  <span className="pt-px">{opt}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div>
          {checkError && (
            <p className="mb-2 text-xs text-(--error) text-center" role="alert">
              {t("Couldn't check your answer. Please try again.")}
            </p>
          )}
          {!showAnswer ? (
            <button
              onClick={handleCheck}
              disabled={selectedOption === null || checking}
              className="w-full py-3 rounded-(--radius-button) text-sm font-bold text-(--bg-primary) disabled:opacity-40 disabled:cursor-not-allowed transition-[filter] hover:brightness-105 active:scale-[0.99] disabled:active:scale-100 inline-flex items-center justify-center gap-2"
              style={{ backgroundImage: 'var(--grad-brand)' }}
            >
              {checking && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {checking ? t('Checking…') : t('Check Answer')}
            </button>
          ) : (
            <button
              onClick={advanceQuestion}
              className="w-full py-3 rounded-(--radius-button) text-sm font-semibold bg-(--info) text-white transition-[filter] hover:brightness-110 active:scale-[0.99]"
            >
              {t('Next Question')} &rarr;
            </button>
          )}
        </div>
      </div>
    </>
  )
}
