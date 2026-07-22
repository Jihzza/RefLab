import { useState, useEffect, useRef } from 'react'
import {
  BookOpen,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  FileText,
  GraduationCap,
  History,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  XCircle,
  Video,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, ProgressBar, Surface } from '@/components/ui'
import {
  getUserCompletedAttempts,
  getVideoScenarios,
  saveVideoAttempt,
  getVideoPublicUrl,
  createQuestionSession,
} from '../api/testsApi'
import type { TestAttempt, VideoScenario, QuestionSessionMode, SessionResult } from '../types'
import RandomTestLanding from './test/RandomTestLanding'
import RandomTestRunner from './test/RandomTestRunner'
import RandomTestResults from './test/RandomTestResults'
import QuestionsLanding from './questions/QuestionsLanding'
import QuestionsSetup from './questions/QuestionsSetup'
import QuestionsSession from './questions/QuestionsSession'
import QuestionsReview from './questions/QuestionsReview'
import {
  LearningChoice,
  LearningError,
  LearningLoading,
  LearningMessage,
  LearningSectionHeading,
  MatchAccent,
} from './LearningUI'

/* ─── Helpers ─── */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ─── Navigation Tabs ─── */

type TabKey = 'test' | 'questions' | 'videos' | 'courses' | 'resources'

const tabLabels: { key: TabKey; label: string; icon: typeof FileText }[] = [
  { key: 'test', label: 'Test', icon: ClipboardCheck },
  { key: 'questions', label: 'Questions', icon: CircleHelp },
  { key: 'videos', label: 'Videos', icon: Video },
  { key: 'courses', label: 'Courses', icon: GraduationCap },
  { key: 'resources', label: 'Resources', icon: FileText },
]

function LearnNav({
  activeTab,
  setActiveTab,
}: {
  activeTab: TabKey
  setActiveTab: (tab: TabKey) => void
}) {
  const { t } = useTranslation()

  return (
    <nav className="mb-5 md:mb-7" aria-label={t('Learn navigation')}>
      <div
        className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-(--mc-color-border) bg-(--mc-color-surface) p-1 shadow-(--mc-shadow-soft)"
        role="tablist"
      >
        {tabLabels.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`mc-focus-ring mc-interactive flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap sm:flex-1 ${
              active
                ? 'bg-(--mc-color-accent) text-(--mc-color-canvas)'
                : 'text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)'
            }`}
            role="tab"
            aria-selected={active}
          >
            <Icon size={16} aria-hidden="true" />
            {t(tab.label)}
          </button>
          )
        })}
      </div>
    </nav>
  )
}

/* ─── Test View (Random Test Mode) ─── */

type TestViewState = 'landing' | 'test' | 'results' | 'history'

function TestView() {
  const { t, i18n } = useTranslation()
  const [view, setView] = useState<TestViewState>(() => {
    const searchParams = new URLSearchParams(window.location.search)
    return searchParams.get('action') === 'start-test' ? 'test' : 'landing'
  })
  const [attemptId, setAttemptId] = useState<string>('')
  const [history, setHistory] = useState<TestAttempt[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(false)

  const handleViewHistory = async () => {
    setHistoryLoading(true)
    setHistoryError(false)
    setView('history')
    const { data, error } = await getUserCompletedAttempts()
    setHistory(data || [])
    setHistoryError(Boolean(error))
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
      <div className="space-y-5">
        <LearningSectionHeading
          eyebrow={t('Test')}
          title={t('Test History')}
          action={(
            <Button variant="ghost" size="sm" onClick={() => setView('landing')}>
              &larr; {t('Back')}
            </Button>
          )}
        />

        {historyLoading ? (
          <LearningLoading label={t('Loading...')} />
        ) : historyError ? (
          <LearningError
            title={t('Failed to load results')}
            description={t('Please try again')}
            retryLabel={t('Try Again')}
            onRetry={() => void handleViewHistory()}
          />
        ) : history.length === 0 ? (
          <LearningMessage
            icon={<History size={22} />}
            title={t('No completed tests yet.')}
            action={<Button onClick={() => setView('test')}>{t('Start Test')}</Button>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {history.map((entry) => {
              const pct = entry.score_percent ?? 0
              const isPassing = pct >= 80
              const date = entry.submitted_at
                ? new Date(entry.submitted_at).toLocaleDateString(i18n.language || 'pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'
              const duration = entry.time_elapsed_seconds !== null
                ? `${Math.floor(entry.time_elapsed_seconds / 60)}:${String(entry.time_elapsed_seconds % 60).padStart(2, '0')}`
                : null

              return (
                <Surface
                  key={entry.id}
                  className="flex items-center justify-between gap-4"
                  padding="md"
                >
                  <div className="min-w-0">
                    <Badge variant={isPassing ? 'success' : 'warning'} size="sm">
                      {isPassing ? t('Pass') : t('Review Recommended')}
                    </Badge>
                    <p className="mt-2 text-sm font-semibold text-(--mc-color-text)">{date}</p>
                    <p className="mt-0.5 text-xs text-(--mc-color-text-muted)">
                      {t('{{correct}}/{{total}} correct', { correct: entry.score_correct, total: entry.score_total })}
                      {duration && ` · ${duration}`}
                    </p>
                  </div>
                  <span className={`mc-tabular text-2xl font-extrabold ${isPassing ? 'text-(--mc-color-success)' : 'text-(--mc-color-warning)'}`}>
                    {pct}%
                  </span>
                </Surface>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return null
}

/* ─── Questions View (session-based, with KPI dashboard and filtering) ─── */

type QuestionsViewState = 'landing' | 'setup_by_law' | 'setup_by_area' | 'session' | 'review'

interface ActiveSession {
  sessionId: string
  mode: QuestionSessionMode
  filterLaws: number[] | null
  filterAreas: string[] | null
  startedAt: string
}

function QuestionsView() {
  const { t } = useTranslation()
  const [view, setView] = useState<QuestionsViewState>('landing')
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [lastResult, setLastResult] = useState<SessionResult | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(false)

  const startSession = async (
    mode: QuestionSessionMode,
    filterLaws: number[] | null,
    filterAreas: string[] | null
  ) => {
    if (creating) return
    setCreating(true)
    setCreateError(false)
    const { data, error } = await createQuestionSession(mode, filterLaws, filterAreas)
    setCreating(false)
    if (error || !data) {
      setCreateError(true)
      return
    }
    setActiveSession({
      sessionId: data.id,
      mode,
      filterLaws,
      filterAreas,
      startedAt: data.started_at,
    })
    setView('session')
  }

  const handleStartQuick = () => startSession('quick', null, null)
  const handleStartByLaw = () => setView('setup_by_law')
  const handleStartByArea = () => setView('setup_by_area')

  const handleSetupConfirm = (laws: number[], areas: string[]) => {
    const mode: QuestionSessionMode = view === 'setup_by_law' ? 'by_law' : 'by_area'
    startSession(mode, mode === 'by_law' ? laws : null, mode === 'by_area' ? areas : null)
  }

  const handleSessionEnd = (result: SessionResult) => {
    setLastResult(result)
    setView('review')
  }

  const handleRestart = () => {
    if (!activeSession) { setView('landing'); return }
    if (activeSession.mode === 'quick') {
      handleStartQuick()
    } else if (activeSession.mode === 'by_law') {
      setView('setup_by_law')
    } else {
      setView('setup_by_area')
    }
  }

  if (view === 'landing') {
    return (
      <div className="space-y-4">
        <QuestionsLanding
          onStartQuick={handleStartQuick}
          onStartByLaw={handleStartByLaw}
          onStartByArea={handleStartByArea}
          creating={creating}
        />
        {createError && (
          <div className="rounded-xl border border-(--mc-color-danger)/35 bg-(--mc-color-danger)/10 p-4 text-sm text-(--mc-color-danger)" role="alert">
            {t('Failed to create attempt')} · {t('Please try again')}
          </div>
        )}
      </div>
    )
  }

  if (view === 'setup_by_law' || view === 'setup_by_area') {
    return (
      <QuestionsSetup
        mode={view === 'setup_by_law' ? 'by_law' : 'by_area'}
        onStart={handleSetupConfirm}
        onBack={() => setView('landing')}
        creating={creating}
        createError={createError}
      />
    )
  }

  if (view === 'session' && activeSession) {
    return (
      <QuestionsSession
        sessionId={activeSession.sessionId}
        mode={activeSession.mode}
        filterLaws={activeSession.filterLaws}
        filterAreas={activeSession.filterAreas}
        startedAt={activeSession.startedAt}
        onEndSession={handleSessionEnd}
      />
    )
  }

  if (view === 'review' && lastResult) {
    return (
      <QuestionsReview
        result={lastResult}
        onStartNew={() => setView('landing')}
        onRestart={handleRestart}
      />
    )
  }

  return null
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
  const { t } = useTranslation()
  const [scenarios, setScenarios] = useState<VideoScenario[]>([])
  const [actionOptionsPerScenario, setActionOptionsPerScenario] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
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
      const { data, error } = await getVideoScenarios()
      if (!cancelled) {
        setLoadError(Boolean(error))
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
    return <LearningLoading label={t('Loading...')} />
  }

  if (loadError) {
    return <LearningError title={t('Video failed to load')} description={t('Please try again')} />
  }

  if (scenarios.length === 0) {
    return (
      <LearningMessage
        icon={<Video size={22} />}
        title={t('No video scenarios available yet.')}
        description={t('Training videos coming soon.')}
      />
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
      <div className="space-y-5">
        <LearningSectionHeading
          eyebrow={`${currentIndex + 1} / ${scenarios.length}`}
          title={t('Video Analysis')}
          description={current.title}
        />

        <Surface className="relative overflow-hidden" padding="lg" variant="raised">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className={`mb-3 flex size-12 items-center justify-center rounded-xl border ${
              bothCorrect
                ? 'border-(--mc-color-success)/40 bg-(--mc-color-success)/10 text-(--mc-color-success)'
                : 'border-(--mc-color-warning)/40 bg-(--mc-color-warning)/10 text-(--mc-color-warning)'
            }`} aria-hidden="true">
              {bothCorrect ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
            </span>
            <h3 className="text-lg font-bold text-(--mc-color-text)">{current.title}</h3>
            <p className={`mt-1 text-2xl font-extrabold ${bothCorrect ? 'text-(--mc-color-success)' : 'text-(--mc-color-warning)'}`}>
              {bothCorrect ? t('Both Correct') : actionCorrect || sanctionCorrect ? t('Partially Correct') : t('Incorrect')}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <ResultDecision
              title={t('Action')}
              selected={t(chosenAction)}
              correct={t(current.correct_action)}
              isCorrect={actionCorrect}
            />
            <ResultDecision
              title={t('Sanction')}
              selected={t(chosenSanction)}
              correct={t(current.correct_sanction)}
              isCorrect={sanctionCorrect}
            />
          </div>
        </Surface>

        <Button fullWidth size="lg" trailingIcon={isLastVideo ? <RotateCcw size={17} /> : undefined} onClick={isLastVideo ? handleRestart : goToNext}>
          {isLastVideo ? t('Start Over') : t('Next Video')}
        </Button>
      </div>
    )
  }

  /* ── Video + Questions ── */
  return (
    <div className="space-y-5 md:space-y-6">
      <LearningSectionHeading
        eyebrow={`${currentIndex + 1} / ${scenarios.length}`}
        title={t('Video Analysis')}
        description={current.title}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.85fr)] lg:items-start">
        <Surface className="overflow-hidden" padding="none" variant="raised">
          <div className="group relative aspect-video overflow-hidden bg-black">
            <video
              key={current.id}
              ref={videoRef}
              className="h-full w-full object-contain"
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => setVideoError(current.video_url)}
            >
              <source src={getVideoPublicUrl(current.video_url)} type="video/mp4" />
            </video>

            {videoError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 text-center" role="alert">
                <XCircle size={28} className="mb-3 text-(--mc-color-danger)" aria-hidden="true" />
                <p className="text-sm font-semibold text-white">{t('Video failed to load')}</p>
                <p className="mt-1 text-xs text-white/55">{t('Please try again')}</p>
              </div>
            )}

            {!isPlaying && !videoError && (
              <button
                type="button"
                onClick={togglePlay}
                className="mc-focus-ring absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-(--mc-color-accent) hover:text-(--mc-color-canvas)"
                aria-label="Play video"
              >
                <Play size={25} fill="currentColor" aria-hidden="true" />
              </button>
            )}

            {!videoError && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-linear-to-t from-black/90 to-transparent p-3 pt-10 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="mc-focus-ring flex size-11 items-center justify-center rounded-lg text-white hover:bg-white/15"
                  aria-label={isPlaying ? 'Pause video' : 'Play video'}
                >
                  {isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="mc-focus-ring flex size-11 items-center justify-center rounded-lg text-white hover:bg-white/15"
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                >
                  {isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}
                </button>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">{t('Video Analysis')}</Badge>
              {current.topic && <Badge>{current.topic}</Badge>}
            </div>
            <h3 className="mt-3 font-bold text-(--mc-color-text)">{current.title}</h3>
            {current.description && (
              <p className="mt-1.5 text-sm leading-6 text-(--mc-color-text-secondary)">{current.description}</p>
            )}
          </div>
        </Surface>

        <Surface className="space-y-4" padding="md" variant="raised">
          <ProgressBar
            value={step === 'action' ? 1 : 2}
            max={2}
            size="sm"
            tone="accent"
            label={step === 'action' ? t('Action') : t('Sanction')}
            valueLabel={`${step === 'action' ? 1 : 2} / 2`}
            showValue
          />

          {step === 'action' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold leading-6 text-(--mc-color-text)">
                {t('What action should the referee take?')}
              </h3>
              <div className="space-y-2">
                {currentActionOptions.map((option, index) => (
                  <LearningChoice
                    key={option}
                    marker={String.fromCharCode(65 + index)}
                    state={selectedAction === index ? 'selected' : 'default'}
                    aria-pressed={selectedAction === index}
                    onClick={() => setSelectedAction(index)}
                  >
                    {t(option)}
                  </LearningChoice>
                ))}
              </div>
              <Button fullWidth trailingIcon={<span aria-hidden="true">→</span>} onClick={handleConfirmAction} disabled={selectedAction === null}>
                {t('Next — Sanction')}
              </Button>
            </div>
          )}

          {step === 'sanction' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold leading-6 text-(--mc-color-text)">
                {t('What sanction should be applied?')}
              </h3>
              <div className="space-y-2">
                {SANCTION_OPTIONS.map((option, index) => (
                  <LearningChoice
                    key={option}
                    marker={String.fromCharCode(65 + index)}
                    state={selectedSanction === index ? 'selected' : 'default'}
                    aria-pressed={selectedSanction === index}
                    onClick={() => setSelectedSanction(index)}
                  >
                    {t(option)}
                  </LearningChoice>
                ))}
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-3">
                <Button variant="secondary" onClick={() => setStep('action')}>&larr; {t('Back')}</Button>
                <Button fullWidth onClick={handleConfirmSanction} disabled={selectedSanction === null}>
                  {t('Confirm')}
                </Button>
              </div>
            </div>
          )}
        </Surface>
      </div>
    </div>
  )
}

function ResultDecision({
  title,
  selected,
  correct,
  isCorrect,
}: {
  title: React.ReactNode
  selected: React.ReactNode
  correct: React.ReactNode
  isCorrect: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className={`rounded-xl border p-4 ${
      isCorrect
        ? 'border-(--mc-color-success)/40 bg-(--mc-color-success)/5'
        : 'border-(--mc-color-danger)/40 bg-(--mc-color-danger)/5'
    }`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-(--mc-color-text-muted)">{title}</span>
        <Badge size="sm" variant={isCorrect ? 'success' : 'danger'}>
          {isCorrect ? t('Correct') : t('Incorrect')}
        </Badge>
      </div>
      <p className="text-sm font-semibold leading-5 text-(--mc-color-text)">{selected}</p>
      {!isCorrect && (
        <p className="mt-2 text-xs leading-5 text-(--mc-color-success)">
          {t('Correct')}: {correct}
        </p>
      )}
    </div>
  )
}

/* ─── Other Tabs ─── */

function PlaceholderTab({ icon: Icon, title }: { icon: typeof FileText; title: string }) {
  const { t } = useTranslation()

  return (
    <LearningMessage
      icon={<Icon size={22} />}
      title={t(title)}
      description={t('Coming soon.')}
    />
  )
}

function ResourcesView() {
  const { t } = useTranslation()

  return (
    <LearningMessage
      icon={<BookOpen size={22} />}
      title={t('Study Resources')}
      description={t('Study resources coming soon.')}
    />
  )
}

/* ─── Main Page ─── */

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('test')
  const { t } = useTranslation()

  return (
    <section className="min-h-full bg-(--mc-color-canvas) pb-24 pt-4 md:pt-6" aria-label={t('Learn')}>
      <div className="mc-page mc-page--wide">
        <header className="mb-5 flex items-center gap-3 md:mb-6">
          <MatchAccent />
          <div>
            <p className="mc-eyebrow">RefLab</p>
            <h1 className="mc-page-title">{t('Learn')}</h1>
          </div>
        </header>
        <LearnNav activeTab={activeTab} setActiveTab={setActiveTab} />
        <main role="tabpanel" className="mx-auto max-w-5xl">
          {activeTab === 'test' && <TestView />}
          {activeTab === 'questions' && <QuestionsView />}
          {activeTab === 'videos' && <VideosView />}
          {activeTab === 'courses' && <PlaceholderTab icon={GraduationCap} title="Courses" />}
          {activeTab === 'resources' && <ResourcesView />}
        </main>
      </div>
    </section>
  )
}
