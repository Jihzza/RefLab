import { useState, useEffect, useRef } from 'react'
import { FileText, GraduationCap, Loader2 } from 'lucide-react'
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
import RandomTestLanding from './test/RandomTestLanding'
import RandomTestRunner from './test/RandomTestRunner'
import RandomTestResults from './test/RandomTestResults'

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

/* ─── Test View (Random Test Mode) ─── */

type TestViewState = 'landing' | 'test' | 'results' | 'history'

function TestView() {
  const [view, setView] = useState<TestViewState>('landing')
  const [attemptId, setAttemptId] = useState<string>('')
  const [history, setHistory] = useState<TestAttempt[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Auto-start test if ?action=start-test in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get('action') === 'start-test') {
      setView('test')
    }
  }, [])

  const handleViewHistory = async () => {
    setHistoryLoading(true)
    setView('history')
    const { data } = await getUserCompletedAttempts()
    setHistory(data || [])
    setHistoryLoading(false)
  }

  if (view === 'landing') {
    return (
      <RandomTestLanding
        onStartTest={() => setView('test')}
        onViewHistory={handleViewHistory}
      />
    )
  }

  if (view === 'test') {
    return (
      <RandomTestRunner
        onComplete={(id) => { setAttemptId(id); setView('results') }}
      />
    )
  }

  if (view === 'results' && attemptId) {
    return (
      <RandomTestResults
        attemptId={attemptId}
        onRestart={() => setView('test')}
        onBackToTests={() => setView('landing')}
      />
    )
  }

  if (view === 'history') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('landing')}
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
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-(--text-muted) text-sm">No completed tests yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => {
              const pct = entry.score_percent ?? 0
              const isPassing = pct >= 80
              const date = entry.submitted_at
                ? new Date(entry.submitted_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'
              const duration = entry.time_elapsed_seconds !== null
                ? `${Math.floor(entry.time_elapsed_seconds / 60)}:${String(entry.time_elapsed_seconds % 60).padStart(2, '0')}`
                : null

              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-(--bg-surface) rounded-xl border border-(--border-subtle)"
                >
                  <div>
                    <p className="text-sm text-(--text-primary) font-medium">{date}</p>
                    <p className="text-xs text-(--text-muted) mt-0.5">
                      {entry.score_correct}/{entry.score_total} correct
                      {duration && ` · ${duration}`}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${isPassing ? 'text-(--success)' : 'text-(--error)'}`}>
                    {pct}%
                  </span>
                </div>
              )
            })}
          </div>
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
