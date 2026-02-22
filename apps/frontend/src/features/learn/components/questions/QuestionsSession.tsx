import { useState, useEffect, useRef } from 'react'
import { Loader2, Timer } from 'lucide-react'
import {
  getQuestionsByFilters,
  savePracticeAnswerWithSession,
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
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-(--bg-surface) p-6 rounded-lg max-w-sm w-full border border-(--border-subtle)">
        <h3 className="font-semibold text-(--text-primary) mb-2">{title}</h3>
        <p className="text-sm text-(--text-secondary) mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg bg-(--bg-surface-2) text-(--text-secondary) font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg bg-(--error) text-white font-medium text-sm"
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
  const [pool, setPool] = useState<TestQuestion[]>([])
  const [, setQueue] = useState<TestQuestion[]>([])
  const [loading, setLoading] = useState(true)

  const [currentQ, setCurrentQ] = useState<TestQuestion | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)

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

    setQueue(prevQueue => {
      let remaining = prevQueue.slice(1)

      // Re-shuffle and refill when queue is nearly empty, avoiding repeat of last question
      if (remaining.length === 0) {
        let reshuffled = shuffle(pool)
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
    if (selectedOption === null || !currentQ || showAnswer) return

    const isCorrect = selectedOption === letterToIndex(currentQ.correct_option)
    setShowAnswer(true)

    const answered: AnsweredQuestion = {
      question: currentQ,
      selectedOption: indexToLetter(selectedOption),
      selectedIndex: selectedOption,
      isCorrect,
    }

    setAnsweredQuestions(prev => [...prev, answered])
    if (isCorrect) setTotalCorrect(prev => prev + 1)

    // Save to DB in background
    savePracticeAnswerWithSession(currentQ.id, indexToLetter(selectedOption), isCorrect, sessionId)
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
        <p className="text-sm text-(--text-muted)">Loading questions…</p>
      </div>
    )
  }

  if (!currentQ) {
    return (
      <div className="text-center py-16">
        <p className="text-(--text-muted) text-sm">No questions found for the selected filters.</p>
        <button
          onClick={handleEndSession}
          className="mt-4 px-4 py-2 text-sm rounded-lg bg-(--bg-surface-2) text-(--text-secondary)"
        >
          Go Back
        </button>
      </div>
    )
  }

  const options = getOptions(currentQ)
  const correctIdx = letterToIndex(currentQ.correct_option)
  const totalAnswered = answeredQuestions.length

  return (
    <>
      {showEndConfirm && (
        <WarningModal
          title="End Session?"
          message={`You've answered ${totalAnswered} question${totalAnswered !== 1 ? 's' : ''} so far. Your results will be shown on the next screen.`}
          confirmLabel="End Session"
          onConfirm={handleEndSession}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}

      <div className="flex flex-col gap-4">
        {/* Session header */}
        <div className="flex items-center justify-between py-2 border-b border-(--border-subtle)">
          <div className="flex items-center gap-1.5 text-(--text-muted)">
            <Timer size={15} />
            <span className="text-sm font-mono">{formatElapsed(elapsedSeconds)}</span>
          </div>

          <span className="text-xs text-(--text-muted)">
            {totalCorrect}/{totalAnswered} correct
          </span>

          <button
            onClick={() => setShowEndConfirm(true)}
            className="text-xs font-medium text-(--error) hover:opacity-80 transition-opacity"
          >
            End Session
          </button>
        </div>

        {/* Question */}
        <h3 className="text-base font-medium text-(--text-primary) leading-snug">
          {currentQ.question_text}
        </h3>

        {/* Options */}
        <div className="space-y-2">
          {options.map((opt, idx) => {
            let styles =
              'w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-colors '
            if (showAnswer) {
              if (idx === correctIdx)
                styles += 'border-(--success) bg-(--success)/10 text-(--text-primary)'
              else if (idx === selectedOption)
                styles += 'border-(--error) bg-(--error)/10 text-(--text-primary)'
              else styles += 'border-(--border-subtle) text-(--text-muted)'
            } else if (idx === selectedOption) {
              styles += 'border-(--info) bg-(--info)/10 text-(--text-primary)'
            } else {
              styles += 'border-(--border-subtle) text-(--text-secondary) hover:bg-(--bg-surface-2)'
            }

            return (
              <button
                key={idx}
                onClick={() => !showAnswer && setSelectedOption(idx)}
                disabled={showAnswer}
                className={`${styles} ${showAnswer ? 'cursor-default' : ''}`}
              >
                <span className="font-semibold mr-2">{LETTERS[idx]}.</span>
                {opt}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-(--border-subtle)">
          {!showAnswer ? (
            <button
              onClick={handleCheck}
              disabled={selectedOption === null}
              className="w-full py-3 rounded-lg text-sm font-medium bg-(--info) text-white disabled:opacity-40 transition-colors"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={advanceQuestion}
              className="w-full py-3 rounded-lg text-sm font-medium bg-(--info) text-white transition-colors"
            >
              Next Question &rarr;
            </button>
          )}
        </div>
      </div>
    </>
  )
}
