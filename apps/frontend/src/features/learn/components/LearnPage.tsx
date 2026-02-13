import { useState, useEffect, useRef } from 'react'
import { FileText, Video, GraduationCap, Loader2 } from 'lucide-react'
import {
  getTests,
  getQuestions,
  getOrCreateAttempt,
  getAttemptAnswers,
  saveAnswer,
  submitAttempt,
  getUserCompletedAttempts,
  getAllQuestions,
  savePracticeAnswer,
  getVideoScenarios,
  saveVideoAttempt,
  getVideoPublicUrl,
} from '../api/testsApi'
import type { Test, TestQuestion, TestAttempt, OptionLetter, VideoScenario } from '../types'

/* ─── Helpers ─── */

const LETTERS: OptionLetter[] = ['A', 'B', 'C', 'D']
const getOptions = (q: TestQuestion): string[] => [q.option_a, q.option_b, q.option_c, q.option_d]
const indexToLetter = (idx: number): OptionLetter => LETTERS[idx]
const letterToIndex = (letter: OptionLetter): number => LETTERS.indexOf(letter)

/* ─── Navigation Tabs ─── */

type TabKey = 'test' | 'questions' | 'videos' | 'courses' | 'resources'

const tabLabels: { key: TabKey; label: string }[] = [
  { key: 'test', label: 'Test' },
  { key: 'questions', label: 'Questions' },
  { key: 'videos', label: 'Videos' },
  { key: 'courses', label: 'Courses' },
  { key: 'resources', label: 'Resources' },
]

function LearnNav({
  activeTab,
  setActiveTab,
}: {
  activeTab: TabKey
  setActiveTab: (tab: TabKey) => void
}) {
  return (
    <nav className="border-b border-(--border-subtle) mb-6 -mx-4 px-4">
      <div className="flex overflow-x-auto no-scrollbar py-3 gap-4 md:justify-center">
        {tabLabels.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 px-3 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-(--text-primary) text-(--text-primary)'
                : 'border-transparent text-(--text-muted) hover:text-(--text-secondary)'
            }`}
            aria-current={activeTab === tab.key ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
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

/* ─── Test View (DB-backed, inline flow) ─── */

type TestViewState = 'list' | 'test' | 'review' | 'history' | 'history-review'

function TestView() {
  // Tests list
  const [tests, setTests] = useState<Test[]>([])
  const [testsLoading, setTestsLoading] = useState(true)

  // View state
  const [view, setView] = useState<TestViewState>('list')
  const [testLoading, setTestLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Active test state
  const [activeTest, setActiveTest] = useState<Test | null>(null)
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [attempt, setAttempt] = useState<TestAttempt | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)

  // Review state (after submit or from history)
  const [reviewAttempt, setReviewAttempt] = useState<TestAttempt | null>(null)
  const [reviewAnswers, setReviewAnswers] = useState<Record<string, { selected: number; isCorrect: boolean }>>({})

  // History
  const [completedAttempts, setCompletedAttempts] = useState<TestAttempt[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Modals
  const [showLeaveWarning, setShowLeaveWarning] = useState(false)
  const [showRedoWarning, setShowRedoWarning] = useState(false)

  // Derived
  const currentQuestion = questions[questionIndex]
  const answeredCount = Object.keys(answers).length

  // Fetch tests on mount
  useEffect(() => {
    let cancelled = false
    async function fetch() {
      const { data } = await getTests()
      if (!cancelled) {
        setTests(data || [])
        setTestsLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [])

  /* ── Actions ── */

  const startTest = async (test: Test) => {
    setActiveTest(test)
    setTestLoading(true)
    setView('test')
    setQuestionIndex(0)
    setSelectedOption(null)
    setAnswers({})

    const { data: qs } = await getQuestions(test.id)
    if (!qs || qs.length === 0) {
      setTestLoading(false)
      return
    }
    setQuestions(qs)

    const { data: att } = await getOrCreateAttempt(test.id)
    if (!att) {
      setTestLoading(false)
      return
    }
    setAttempt(att)

    // Load existing answers (for resume)
    const { data: existingAnswers } = await getAttemptAnswers(att.id)
    if (existingAnswers) {
      const restored: Record<string, number> = {}
      existingAnswers.forEach((a) => {
        restored[a.question_id] = letterToIndex(a.selected_option)
      })
      setAnswers(restored)
    }

    setTestLoading(false)
  }

  const navigateTo = (idx: number) => {
    setQuestionIndex(idx)
    setSelectedOption(answers[questions[idx]?.id] ?? null)
  }

  const finishTest = async (finalAnswers?: Record<string, number>) => {
    if (!attempt) return
    setSubmitting(true)

    const usedAnswers = finalAnswers || answers
    const { data: submittedAttempt } = await submitAttempt(attempt.id)
    if (!submittedAttempt) {
      setSubmitting(false)
      return
    }

    // Build review data from questions + answers
    const review: Record<string, { selected: number; isCorrect: boolean }> = {}
    for (const q of questions) {
      const selectedIdx = usedAnswers[q.id]
      if (selectedIdx !== undefined) {
        review[q.id] = {
          selected: selectedIdx,
          isCorrect: indexToLetter(selectedIdx) === q.correct_option,
        }
      }
    }

    setReviewAttempt(submittedAttempt)
    setReviewAnswers(review)
    setSubmitting(false)
    setView('review')
  }

  const handleNext = async () => {
    if (!currentQuestion || !attempt) return

    const isLocked = answers[currentQuestion.id] !== undefined
    const isLast = questionIndex >= questions.length - 1

    if (isLocked) {
      if (isLast) {
        await finishTest()
      } else {
        navigateTo(questionIndex + 1)
      }
      return
    }

    if (selectedOption === null) return

    // Lock the answer optimistically
    const updated = { ...answers, [currentQuestion.id]: selectedOption }
    setAnswers(updated)

    if (isLast) {
      await saveAnswer(attempt.id, currentQuestion.id, indexToLetter(selectedOption))
      await finishTest(updated)
    } else {
      setQuestionIndex(questionIndex + 1)
      setSelectedOption(null)
      // Save in background (non-blocking for responsiveness)
      saveAnswer(attempt.id, currentQuestion.id, indexToLetter(selectedOption))
    }
  }

  const goToList = () => {
    setView('list')
    setShowLeaveWarning(false)
  }

  const confirmRedo = () => {
    setShowRedoWarning(false)
    if (activeTest) startTest(activeTest)
  }

  const openHistory = async () => {
    setHistoryLoading(true)
    setView('history')
    const { data } = await getUserCompletedAttempts()
    setCompletedAttempts(data || [])
    setHistoryLoading(false)
  }

  const startHistoryReview = async (att: TestAttempt) => {
    const test = tests.find((t) => t.id === att.test_id)
    if (!test) return

    setTestLoading(true)
    setActiveTest(test)
    setReviewAttempt(att)
    setView('history-review')

    const { data: qs } = await getQuestions(test.id)
    if (!qs) {
      setTestLoading(false)
      return
    }
    setQuestions(qs)

    const { data: attAnswers } = await getAttemptAnswers(att.id)
    if (attAnswers) {
      const review: Record<string, { selected: number; isCorrect: boolean }> = {}
      attAnswers.forEach((a) => {
        review[a.question_id] = {
          selected: letterToIndex(a.selected_option),
          isCorrect: a.is_correct ?? false,
        }
      })
      setReviewAnswers(review)
    }

    setQuestionIndex(0)
    setTestLoading(false)
  }

  /* ── Tests List ── */

  if (view === 'list') {
    if (testsLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-(--text-muted) animate-spin" />
        </div>
      )
    }

    if (tests.length === 0) {
      return (
        <div className="text-center py-16">
          <p className="text-(--text-muted) text-sm">No tests available yet.</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-(--text-primary)">Tests</h2>
          <button
            onClick={openHistory}
            className="text-xs text-(--info) font-medium hover:underline"
          >
            Test History
          </button>
        </div>
        <div className="space-y-2">
          {tests.map((test) => (
            <button
              key={test.id}
              onClick={() => startTest(test)}
              disabled={testLoading}
              className="w-full flex items-center justify-between p-4 bg-(--bg-surface) rounded-lg border border-(--border-subtle) text-left hover:bg-(--bg-surface-2) transition-colors disabled:opacity-50"
            >
              <div>
                <h3 className="font-medium text-(--text-primary)">{test.title}</h3>
                {test.topic && (
                  <p className="text-xs text-(--text-muted) mt-0.5">{test.topic}</p>
                )}
              </div>
              <span className="text-(--text-muted) text-sm">&rarr;</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  /* ── Test History List ── */

  if (view === 'history') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={goToList}
            className="text-sm text-(--text-muted) hover:text-(--text-primary)"
          >
            &larr; Back
          </button>
          <h2 className="text-lg font-semibold text-(--text-primary)">Test History</h2>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-(--text-muted) animate-spin" />
          </div>
        ) : completedAttempts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-(--text-muted) text-sm">No completed tests yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {completedAttempts.map((entry) => {
              const test = tests.find((t) => t.id === entry.test_id)
              const pct = entry.score_percent ?? 0
              return (
                <button
                  key={entry.id}
                  onClick={() => startHistoryReview(entry)}
                  disabled={testLoading}
                  className="w-full flex items-center justify-between p-4 bg-(--bg-surface) rounded-lg border border-(--border-subtle) text-left hover:bg-(--bg-surface-2) transition-colors disabled:opacity-50"
                >
                  <div>
                    <h3 className="font-medium text-(--text-primary)">
                      {test?.title || 'Unknown Test'}
                    </h3>
                    <p className="text-xs text-(--text-muted) mt-0.5">
                      {entry.score_correct}/{entry.score_total} correct &middot; {pct}%
                    </p>
                  </div>
                  <span className="text-(--text-muted) text-sm">&rarr;</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  /* ── Test Runner ── */

  if (view === 'test') {
    if (testLoading || !currentQuestion) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-(--text-muted) animate-spin" />
        </div>
      )
    }

    const isLocked = answers[currentQuestion.id] !== undefined
    const isLast = questionIndex >= questions.length - 1
    const displayedSelection = isLocked ? answers[currentQuestion.id] : selectedOption
    const options = getOptions(currentQuestion)

    return (
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowLeaveWarning(true)}
            className="text-sm text-(--text-muted) hover:text-(--text-primary)"
          >
            &larr; Leave
          </button>
          <span className="text-sm font-medium text-(--text-primary)">
            {activeTest?.title}
          </span>
          <span className="text-xs text-(--text-muted)">
            {questionIndex + 1} / {questions.length}
          </span>
        </div>

        {/* Progress */}
        <div className="w-full bg-(--bg-surface-2) h-1 rounded-full mb-6">
          <div
            className="bg-(--info) h-full rounded-full transition-all"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <h3 className="text-base font-medium text-(--text-primary) mb-4">
          {currentQuestion.question_text}
        </h3>
        <div className="space-y-2">
          {options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => !isLocked && setSelectedOption(idx)}
              disabled={isLocked}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-colors ${
                displayedSelection === idx
                  ? 'border-(--info) bg-(--info)/10 text-(--text-primary)'
                  : isLocked
                    ? 'border-(--border-subtle) text-(--text-muted)'
                    : 'border-(--border-subtle) text-(--text-secondary) hover:bg-(--bg-surface-2)'
              } ${isLocked ? 'cursor-default' : ''}`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-(--border-subtle)">
          <div className="flex gap-3">
            <button
              onClick={() => navigateTo(questionIndex - 1)}
              disabled={questionIndex === 0}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-(--bg-surface-2) text-(--text-secondary) disabled:opacity-40"
            >
              &larr; Back
            </button>
            <button
              onClick={handleNext}
              disabled={(!isLocked && selectedOption === null) || submitting}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-40 transition-colors ${
                isLast ? 'bg-(--success)' : 'bg-(--info)'
              }`}
            >
              {submitting ? 'Submitting...' : isLast ? 'End Test' : 'Next \u2192'}
            </button>
          </div>
        </div>

        {showLeaveWarning && (
          <WarningModal
            title="Leave test?"
            message="Your progress will be lost. Are you sure you want to leave?"
            confirmLabel="Leave"
            onConfirm={goToList}
            onCancel={() => setShowLeaveWarning(false)}
          />
        )}
      </div>
    )
  }

  /* ── Review Page (after completing test) ── */

  if (view === 'review' && reviewAttempt) {
    const pct = reviewAttempt.score_percent ?? 0

    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-(--text-primary) text-center">
          {activeTest?.title}
        </h2>

        {/* Score */}
        <div className="text-center py-4">
          <div className="text-4xl font-bold text-(--text-primary)">
            {reviewAttempt.score_correct}/{reviewAttempt.score_total}
          </div>
          <p className="text-sm text-(--text-muted) mt-1">{pct}% correct</p>
        </div>

        {/* Question summary */}
        <div className="space-y-2">
          {questions.map((q) => {
            const answer = reviewAnswers[q.id]
            if (!answer) return null
            const options = getOptions(q)
            const correctIdx = letterToIndex(q.correct_option)
            return (
              <div
                key={q.id}
                className={`p-3 rounded-lg border text-sm ${
                  answer.isCorrect
                    ? 'border-(--success)/30 bg-(--success)/5'
                    : 'border-(--error)/30 bg-(--error)/5'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`shrink-0 text-xs font-bold mt-0.5 ${
                      answer.isCorrect ? 'text-(--success)' : 'text-(--error)'
                    }`}
                  >
                    {answer.isCorrect ? '\u2713' : '\u2717'}
                  </span>
                  <div>
                    <p className="text-(--text-primary)">{q.question_text}</p>
                    <p className="text-xs text-(--text-muted) mt-1">
                      Your answer: {options[answer.selected]}
                      {!answer.isCorrect && ` \u00B7 Correct: ${options[correctIdx]}`}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={goToList}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-(--bg-surface-2) text-(--text-secondary) hover:bg-(--bg-hover) transition-colors"
          >
            Back to Tests
          </button>
          <button
            onClick={() => setShowRedoWarning(true)}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-(--info) text-white transition-colors"
          >
            Redo Test
          </button>
        </div>

        {showRedoWarning && (
          <WarningModal
            title="Redo test?"
            message="This will start the test from the beginning. Continue?"
            confirmLabel="Redo"
            onConfirm={confirmRedo}
            onCancel={() => setShowRedoWarning(false)}
          />
        )}
      </div>
    )
  }

  /* ── History Review (read-only, question by question) ── */

  if (view === 'history-review' && reviewAttempt) {
    if (testLoading || !questions.length) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-(--text-muted) animate-spin" />
        </div>
      )
    }

    const q = questions[questionIndex]
    const answer = reviewAnswers[q?.id]
    const options = q ? getOptions(q) : []
    const correctIdx = q ? letterToIndex(q.correct_option) : -1
    const isLast = questionIndex >= questions.length - 1

    return (
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowLeaveWarning(true)}
            className="text-sm text-(--text-muted) hover:text-(--text-primary)"
          >
            &larr; Leave
          </button>
          <span className="text-sm font-medium text-(--text-primary)">
            {activeTest?.title} (Review)
          </span>
          <span className="text-xs text-(--text-muted)">
            {questionIndex + 1} / {questions.length}
          </span>
        </div>

        {/* Question */}
        {q && (
          <>
            <h3 className="text-base font-medium text-(--text-primary) mb-4">
              {q.question_text}
            </h3>
            <div className="space-y-2">
              {options.map((opt, idx) => {
                const isCorrectOpt = idx === correctIdx
                const isUserOpt = idx === answer?.selected
                let styles = 'w-full text-left px-4 py-3 rounded-lg border-2 text-sm '

                if (isCorrectOpt) {
                  styles += 'border-(--success) bg-(--success)/10 text-(--text-primary)'
                } else if (isUserOpt) {
                  styles += 'border-(--error) bg-(--error)/10 text-(--text-primary)'
                } else {
                  styles += 'border-(--border-subtle) text-(--text-muted)'
                }

                return (
                  <div key={idx} className={styles}>
                    {opt}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-(--border-subtle)">
          <div className="flex gap-3">
            <button
              onClick={() => setQuestionIndex((i) => i - 1)}
              disabled={questionIndex === 0}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-(--bg-surface-2) text-(--text-secondary) disabled:opacity-40"
            >
              &larr; Back
            </button>
            {isLast ? (
              <button
                onClick={goToList}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-(--info) text-white transition-colors"
              >
                End Review
              </button>
            ) : (
              <button
                onClick={() => setQuestionIndex((i) => i + 1)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-(--info) text-white transition-colors"
              >
                Next &rarr;
              </button>
            )}
          </div>
        </div>

        {showLeaveWarning && (
          <WarningModal
            title="Leave review?"
            message="Are you sure you want to leave the test review?"
            confirmLabel="Leave"
            onConfirm={goToList}
            onCancel={() => setShowLeaveWarning(false)}
          />
        )}
      </div>
    )
  }

  return null
}

/* ─── Questions View (DB-backed, one at a time) ─── */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function QuestionsView() {
  const [allQuestions, setAllQuestions] = useState<TestQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetch() {
      const { data } = await getAllQuestions()
      if (!cancelled && data) {
        setAllQuestions(shuffle(data).slice(0, 10))
      }
      if (!cancelled) setLoading(false)
    }
    fetch()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-(--text-muted) animate-spin" />
      </div>
    )
  }

  if (allQuestions.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-(--text-muted) text-sm">No practice questions available yet.</p>
      </div>
    )
  }

  const q = allQuestions[currentIndex]
  const options = getOptions(q)
  const correctIdx = letterToIndex(q.correct_option)

  const handleCheck = () => {
    if (selectedOption === null) return
    setShowAnswer(true)

    // Save to DB in background (feeds dashboard metrics)
    const isCorrect = selectedOption === correctIdx
    savePracticeAnswer(q.id, indexToLetter(selectedOption), isCorrect)
  }

  const goTo = (idx: number) => {
    setCurrentIndex(idx)
    setSelectedOption(null)
    setShowAnswer(false)
  }

  const restart = () => {
    setAllQuestions(shuffle(allQuestions))
    goTo(0)
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-(--text-primary)">Practice Questions</h2>
        <span className="text-xs text-(--text-muted)">
          {currentIndex + 1} / {allQuestions.length}
        </span>
      </div>

      {/* Question */}
      <h3 className="text-base font-medium text-(--text-primary) mb-4">{q.question_text}</h3>
      <div className="space-y-2">
        {options.map((opt, idx) => {
          let styles = 'w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-colors '
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
              {opt}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-(--border-subtle)">
        <div className="flex gap-3">
          <button
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-(--bg-surface-2) text-(--text-secondary) disabled:opacity-40"
          >
            &larr; Back
          </button>

          {!showAnswer ? (
            <button
              onClick={handleCheck}
              disabled={selectedOption === null}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-(--info) text-white disabled:opacity-40 transition-colors"
            >
              Check
            </button>
          ) : currentIndex < allQuestions.length - 1 ? (
            <button
              onClick={() => goTo(currentIndex + 1)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-(--info) text-white transition-colors"
            >
              Next &rarr;
            </button>
          ) : (
            <button
              onClick={restart}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-(--success) text-white transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Videos View (DB-backed, two-step: action → sanction → result) ─── */

const ACTION_OPTIONS = [
  'Play on — no offence',
  'Indirect free kick',
  'Direct free kick',
  'Penalty kick',
  'Goal kick',
  'Corner kick',
  'Drop ball',
  'Goal disallowed',
  'Retake',
]

const SANCTION_OPTIONS = [
  'No card',
  'Yellow card (caution)',
  'Red card (sending off)',
]

type VideoStep = 'action' | 'sanction' | 'result'

function VideosView() {
  const [scenarios, setScenarios] = useState<VideoScenario[]>([])
  const [actionOptionsPerScenario, setActionOptionsPerScenario] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [step, setStep] = useState<VideoStep>('action')

  // Selections
  const [selectedAction, setSelectedAction] = useState<number | null>(null)
  const [selectedSanction, setSelectedSanction] = useState<number | null>(null)

  // Result data (set after sanction is confirmed)
  const [actionCorrect, setActionCorrect] = useState(false)
  const [sanctionCorrect, setSanctionCorrect] = useState(false)

  // Video player
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let cancelled = false
    async function fetch() {
      const { data } = await getVideoScenarios()
      if (!cancelled) {
        const loaded = data || []
        setScenarios(loaded)
        // Build shuffled action options for each scenario
        if (loaded.length > 0) {
          setActionOptionsPerScenario(loaded.map((scenario) => {
            // Use other scenarios' correct_action as distractors, then fall back to predefined list
            const fromScenarios = loaded
              .filter((s) => s.id !== scenario.id && s.correct_action !== scenario.correct_action)
              .map((s) => s.correct_action)
            const fromPredefined = ACTION_OPTIONS
              .filter((a) => a !== scenario.correct_action && !fromScenarios.includes(a))
            const pool = [...fromScenarios, ...fromPredefined]
            const distractors = shuffle(pool).slice(0, 3)
            return shuffle([scenario.correct_action, ...distractors])
          }))
        }
        setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-(--text-muted) animate-spin" />
      </div>
    )
  }

  if (scenarios.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-(--text-muted) text-sm">No video scenarios available yet.</p>
      </div>
    )
  }

  const current = scenarios[currentIndex]
  const isLastVideo = currentIndex >= scenarios.length - 1
  const currentActionOptions = actionOptionsPerScenario[currentIndex] || []

  const handleConfirmAction = () => {
    if (selectedAction === null) return
    setStep('sanction')
  }

  const handleConfirmSanction = () => {
    if (selectedAction === null || selectedSanction === null) return

    const chosenAction = currentActionOptions[selectedAction]
    const chosenSanction = SANCTION_OPTIONS[selectedSanction]
    const isActionCorrect = chosenAction === current.correct_action
    const isSanctionCorrect = chosenSanction === current.correct_sanction

    setActionCorrect(isActionCorrect)
    setSanctionCorrect(isSanctionCorrect)
    setStep('result')

    // Save to DB in background
    saveVideoAttempt(current.id, chosenAction, chosenSanction, isActionCorrect, isSanctionCorrect)
  }

  const goToNext = () => {
    if (isLastVideo) return
    setCurrentIndex(currentIndex + 1)
    resetState()
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    resetState()
  }

  const resetState = () => {
    setStep('action')
    setSelectedAction(null)
    setSelectedSanction(null)
    setActionCorrect(false)
    setSanctionCorrect(false)
    setIsPlaying(false)
    setVideoError(null)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {
        setVideoError(current.video_url)
      })
      setIsPlaying(true)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setIsMuted(!isMuted)
  }

  /* ── Result screen ── */
  if (step === 'result') {
    const bothCorrect = actionCorrect && sanctionCorrect
    const chosenAction = selectedAction !== null ? currentActionOptions[selectedAction] : ''
    const chosenSanction = selectedSanction !== null ? SANCTION_OPTIONS[selectedSanction] : ''

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-(--text-primary)">Video Analysis</h2>
          <span className="text-xs text-(--text-muted)">
            {currentIndex + 1} / {scenarios.length}
          </span>
        </div>

        <div className="bg-(--bg-surface) rounded-lg border border-(--border-subtle) p-5 space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-(--text-primary)">{current.title}</h3>
            <p className={`text-2xl font-bold mt-1 ${bothCorrect ? 'text-(--success)' : 'text-(--error)'}`}>
              {bothCorrect ? 'Both Correct' : actionCorrect || sanctionCorrect ? 'Partially Correct' : 'Incorrect'}
            </p>
          </div>

          {/* Action result */}
          <div className={`p-4 rounded-lg border-2 ${actionCorrect ? 'border-(--success) bg-(--success)/5' : 'border-(--error) bg-(--error)/5'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-(--text-muted)">Action</span>
              <span className={`text-xs font-medium ${actionCorrect ? 'text-(--success)' : 'text-(--error)'}`}>
                {actionCorrect ? 'Correct' : 'Incorrect'}
              </span>
            </div>
            <p className="text-sm text-(--text-primary) font-medium">{chosenAction}</p>
            {!actionCorrect && (
              <p className="text-sm text-(--success) mt-1">Correct: {current.correct_action}</p>
            )}
          </div>

          {/* Sanction result */}
          <div className={`p-4 rounded-lg border-2 ${sanctionCorrect ? 'border-(--success) bg-(--success)/5' : 'border-(--error) bg-(--error)/5'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-(--text-muted)">Sanction</span>
              <span className={`text-xs font-medium ${sanctionCorrect ? 'text-(--success)' : 'text-(--error)'}`}>
                {sanctionCorrect ? 'Correct' : 'Incorrect'}
              </span>
            </div>
            <p className="text-sm text-(--text-primary) font-medium">{chosenSanction}</p>
            {!sanctionCorrect && (
              <p className="text-sm text-(--success) mt-1">Correct: {current.correct_sanction}</p>
            )}
          </div>
        </div>

        <button
          onClick={isLastVideo ? handleRestart : goToNext}
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-(--info) text-white transition-colors"
        >
          {isLastVideo ? 'Start Over' : 'Next Video'}
        </button>
      </div>
    )
  }

  /* ── Video + Questions ── */
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-(--text-primary)">Video Analysis</h2>
        <span className="text-xs text-(--text-muted)">
          {currentIndex + 1} / {scenarios.length}
        </span>
      </div>

      {/* Video Player */}
      <div className="bg-black rounded-lg aspect-video relative overflow-hidden group">
        <video
          key={current.id}
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => setVideoError(current.video_url)}
        >
          <source src={getVideoPublicUrl(current.video_url)} type="video/mp4" />
        </video>

        {/* Error overlay */}
        {videoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center">
            <p className="text-sm text-(--error) font-medium mb-2">Video failed to load</p>
            <p className="text-xs text-white/60 break-all mb-1">File: {videoError}</p>
            <p className="text-xs text-white/40">
              Upload this file to the &quot;learn-videos&quot; bucket in Supabase Storage and make the bucket public.
            </p>
          </div>
        )}

        {/* Play overlay */}
        {!isPlaying && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={togglePlay}
              className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <span className="text-3xl ml-0.5 text-white">{'\u25B6'}</span>
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={togglePlay} className="text-white text-sm hover:text-(--info)">
            {isPlaying ? '\u23F8' : '\u25B6'}
          </button>
          <button onClick={toggleMute} className="text-white text-sm hover:text-(--info)">
            {isMuted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
          </button>
        </div>
      </div>

      {/* Scenario info */}
      {current.description && (
        <p className="text-sm text-(--text-secondary)">{current.description}</p>
      )}

      {/* Step indicator */}
      <div className="flex gap-2">
        <div className={`flex-1 h-1 rounded-full ${step === 'action' ? 'bg-(--info)' : 'bg-(--success)'}`} />
        <div className={`flex-1 h-1 rounded-full ${step === 'sanction' ? 'bg-(--info)' : 'bg-(--bg-surface-2)'}`} />
      </div>

      {/* Action question */}
      {step === 'action' && (
        <div className="space-y-3">
          <h3 className="text-base font-medium text-(--text-primary)">
            What action should the referee take?
          </h3>

          <div className="space-y-2">
            {currentActionOptions.map((option, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedAction(idx)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-colors ${
                  selectedAction === idx
                    ? 'border-(--info) bg-(--info)/10 text-(--text-primary)'
                    : 'border-(--border-subtle) text-(--text-secondary) hover:bg-(--bg-surface-2)'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <button
            onClick={handleConfirmAction}
            disabled={selectedAction === null}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-(--info) text-white disabled:opacity-40 transition-colors"
          >
            Next — Sanction
          </button>
        </div>
      )}

      {/* Sanction question */}
      {step === 'sanction' && (
        <div className="space-y-3">
          <h3 className="text-base font-medium text-(--text-primary)">
            What sanction should be applied?
          </h3>

          <div className="space-y-2">
            {SANCTION_OPTIONS.map((option, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedSanction(idx)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-colors ${
                  selectedSanction === idx
                    ? 'border-(--info) bg-(--info)/10 text-(--text-primary)'
                    : 'border-(--border-subtle) text-(--text-secondary) hover:bg-(--bg-surface-2)'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('action')}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-(--bg-surface-2) text-(--text-secondary)"
            >
              &larr; Back
            </button>
            <button
              onClick={handleConfirmSanction}
              disabled={selectedSanction === null}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-(--info) text-white disabled:opacity-40 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Other Tabs ─── */

function PlaceholderTab({ icon: Icon, title }: { icon: typeof FileText; title: string }) {
  return (
    <div className="text-center py-16">
      <Icon className="w-10 h-10 text-(--text-muted) mx-auto mb-3" />
      <h2 className="text-lg font-semibold text-(--text-primary) mb-1">{title}</h2>
      <p className="text-sm text-(--text-muted)">Coming soon.</p>
    </div>
  )
}

function ResourcesView() {
  const resources = [
    { id: 1, title: 'Laws of the Game 2024/25', type: 'PDF', size: '2.4 MB' },
    { id: 2, title: 'Referee Positioning Guide', type: 'PDF', size: '1.1 MB' },
    { id: 3, title: 'Match Report Template', type: 'DOCX', size: '0.5 MB' },
    { id: 4, title: 'Fitness Test Standards', type: 'PDF', size: '0.8 MB' },
    { id: 5, title: 'VAR Protocol Handbook', type: 'PDF', size: '3.2 MB' },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-(--text-primary)">Study Resources</h2>
      <div className="space-y-2">
        {resources.map((res) => (
          <div
            key={res.id}
            className="flex items-center justify-between p-3 bg-(--bg-surface) rounded-lg border border-(--border-subtle)"
          >
            <div>
              <h3 className="text-sm font-medium text-(--text-primary)">{res.title}</h3>
              <p className="text-xs text-(--text-muted)">
                {res.type} &middot; {res.size}
              </p>
            </div>
            <button className="text-xs text-(--info) hover:underline">Download</button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Main Page ─── */

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('test')

  return (
    <div className="min-h-screen bg-(--bg-primary) pb-24">
      <div className="px-4 max-w-3xl mx-auto">
        <LearnNav activeTab={activeTab} setActiveTab={setActiveTab} />
        <main>
          {activeTab === 'test' && <TestView />}
          {activeTab === 'questions' && <QuestionsView />}
          {activeTab === 'videos' && <VideosView />}
          {activeTab === 'courses' && <PlaceholderTab icon={GraduationCap} title="Courses" />}
          {activeTab === 'resources' && <ResourcesView />}
        </main>
      </div>
    </div>
  )
}
