import { useState, useEffect, useRef } from 'react'
import { Loader2, Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, RotateCw } from 'lucide-react'
import {
  getUserCompletedAttempts,
  getVideoScenarios,
  saveVideoAttempt,
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

/* ─── Helpers ─── */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const R2_BASE_URL = "https://pub-a1f801f17afb4e44b8c270828fefc392.r2.dev"

/* ─── Navigation Tabs ─── */
type TabKey = 'test' | 'questions' | 'videos' | 'courses' | 'resources'
const tabLabels: { key: TabKey; label: string }[] = [
  { key: 'test', label: 'Test' },
  { key: 'questions', label: 'Questions' },
  { key: 'videos', label: 'Videos' },
  { key: 'courses', label: 'Courses' },
  { key: 'resources', label: 'Resources' },
]

function LearnNav({ activeTab, setActiveTab }: { activeTab: TabKey; setActiveTab: (tab: TabKey) => void }) {
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
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

/* ─── Vistas de Test y Preguntas (Sin cambios) ─── */
function TestView() {
  const [view, setView] = useState<'landing' | 'test' | 'results' | 'history'>('landing')
  const [attemptId, setAttemptId] = useState<string>('')
  const [history, setHistory] = useState<TestAttempt[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const handleViewHistory = async () => {
    setHistoryLoading(true)
    setView('history')
    const { data } = await getUserCompletedAttempts()
    setHistory(data || [])
    setHistoryLoading(false)
  }

  if (view === 'landing') return <RandomTestLanding onStartTest={() => setView('test')} onViewHistory={handleViewHistory} />
  if (view === 'test') return <RandomTestRunner onComplete={(id) => { setAttemptId(id); setView('results') }} />
  if (view === 'results') return <RandomTestResults attemptId={attemptId} onRestart={() => setView('test')} onBackToTests={() => setView('landing')} />
  
  return (
    <div className="space-y-4">
      <button onClick={() => setView('landing')} className="text-sm text-(--text-muted) hover:text-(--text-primary)">&larr; Volver</button>
      {historyLoading ? <Loader2 className="animate-spin mx-auto text-(--info)" /> : (
        <div className="space-y-2">
          {history.map(h => (
            <div key={h.id} className="p-4 bg-(--bg-surface) rounded-xl border border-(--border-subtle) flex justify-between items-center">
              <span className="text-sm">{new Date(h.submitted_at!).toLocaleDateString()}</span>
              <span className={`font-bold ${h.score_percent! >= 80 ? 'text-(--success)' : 'text-(--error)'}`}>{h.score_percent}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionsView() {
  const [view, setView] = useState<'landing' | 'setup_by_law' | 'setup_by_area' | 'session' | 'review'>('landing')
  const [activeSession, setActiveSession] = useState<any>(null)
  const [lastResult, setLastResult] = useState<SessionResult | null>(null)

  const startSession = async (mode: QuestionSessionMode, laws: number[] | null, areas: string[] | null) => {
    const { data } = await createQuestionSession(mode, laws, areas)
    if (data) {
      setActiveSession({ sessionId: data.id, mode, filterLaws: laws, filterAreas: areas, startedAt: data.started_at })
      setView('session')
    }
  }

  if (view === 'landing') return <QuestionsLanding onStartQuick={() => startSession('quick', null, null)} onStartByLaw={() => setView('setup_by_law')} onStartByArea={() => setView('setup_by_area')} />
  if (view === 'setup_by_law' || view === 'setup_by_area') return <QuestionsSetup mode={view === 'setup_by_law' ? 'by_law' : 'by_area'} onStart={(l, a) => startSession(view === 'setup_by_law' ? 'by_law' : 'by_area', l, a)} onBack={() => setView('landing')} />
  if (view === 'session' && activeSession) return <QuestionsSession {...activeSession} onEndSession={(r: any) => { setLastResult(r); setView('review') }} />
  if (view === 'review' && lastResult) return <QuestionsReview result={lastResult} onStartNew={() => setView('landing')} onRestart={() => setView('session')} />
  return null
}

/* ─── Videos View (R2 + Pro Player) ─── */
const ACTION_OPTIONS = ['Play on — no offence', 'Indirect free kick', 'Direct free kick', 'Penalty kick', 'Goal kick', 'Corner kick', 'Drop ball', 'Goal disallowed', 'Retake']
const SANCTION_OPTIONS = ['No card', 'Yellow card (caution)', 'Red card (sending off)']
const SPEEDS = [0.5, 1, 1.5, 2]

function VideosView() {
  const [scenarios, setScenarios] = useState<VideoScenario[]>([])
  const [actionOptions, setActionOptions] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [step, setStep] = useState<'action' | 'sanction' | 'result'>('action')
  const [selectedAction, setSelectedAction] = useState<number | null>(null)
  const [selectedSanction, setSelectedSanction] = useState<number | null>(null)
  const [results, setResults] = useState({ action: false, sanction: false })
  
  // Player states
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetch() {
      const { data } = await getVideoScenarios()
      if (data) {
        setScenarios(data)
        setActionOptions(data.map(s => shuffle([s.correct_action, ...shuffle(ACTION_OPTIONS.filter(a => a !== s.correct_action)).slice(0, 3)])))
      }
      setLoading(false)
    }
    fetch()
  }, [])

  // Sincronizar estado de pantalla completa
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-(--info)" /></div>
  const current = scenarios[currentIndex]

  // Video Actions
  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) videoRef.current.play(); else videoRef.current.pause()
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration)
  }

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const toggleFullScreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.error(err))
    } else {
      document.exitFullscreen()
    }
  }

  const handleFinish = () => {
    const aCorr = actionOptions[currentIndex][selectedAction!] === current.correct_action
    const sCorr = SANCTION_OPTIONS[selectedSanction!] === current.correct_sanction
    setResults({ action: aCorr, sanction: sCorr })
    setStep('result')
    saveVideoAttempt(current.id, actionOptions[currentIndex][selectedAction!], SANCTION_OPTIONS[selectedSanction!], aCorr, sCorr)
  }

  if (step === 'result') {
    return (
      <div className="space-y-4 animate-in fade-in zoom-in duration-300">
        <div className="text-center p-8 bg-(--bg-surface) rounded-2xl border border-(--border-subtle) shadow-sm">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-white text-2xl ${results.action && results.sanction ? 'bg-(--success)' : 'bg-(--error)'}`}>
            {results.action && results.sanction ? '✓' : '✕'}
          </div>
          <h3 className="text-xl font-bold mb-4">{results.action && results.sanction ? 'Excelente' : 'Revisa la jugada'}</h3>
          <div className="space-y-2 text-left bg-(--bg-primary) p-4 rounded-lg border border-(--border-subtle)">
            <p className="text-sm"><span className="text-(--text-muted)">Acción correcta:</span> <span className="font-medium text-(--text-primary)">{current.correct_action}</span></p>
            <p className="text-sm"><span className="text-(--text-muted)">Sanción correcta:</span> <span className="font-medium text-(--text-primary)">{current.correct_sanction}</span></p>
          </div>
        </div>
        <button onClick={() => { setCurrentIndex(prev => (prev + 1) % scenarios.length); setStep('action'); setSelectedAction(null); setSelectedSanction(null); setVideoError(null) }} className="w-full py-3.5 bg-(--info) hover:bg-(--info-hover) text-white rounded-xl font-semibold transition-colors">Siguiente Jugada</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div ref={containerRef} className="aspect-video bg-black rounded-2xl overflow-hidden relative group shadow-xl">
        <video 
          key={current.id} ref={videoRef} className="w-full h-full cursor-pointer" playsInline 
          onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onClick={togglePlay}
          onError={() => setVideoError(current.video_url)}
        >
          <source src={`${R2_BASE_URL}/${current.video_url}`} type="video/mp4" />
        </video>

        {videoError && <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-white p-6 text-center text-sm">Error al cargar video.</div>}

        {/* Controls Overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/95 via-black/50 to-transparent pt-8 pb-4 px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          
          {/* Progress Bar */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] text-white/80 tabular-nums w-8">{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</span>
            <input 
              type="range" min="0" max={duration || 0} step="0.1" value={currentTime}
              onChange={handleProgressChange}
              className="flex-1 accent-(--info) h-1.5 bg-white/20 rounded-lg cursor-pointer appearance-none"
            />
            <span className="text-[10px] text-white/80 tabular-nums w-8">{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
          </div>

          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="hover:text-(--info) transition-colors">
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
              
              <button onClick={() => { if(videoRef.current) videoRef.current.currentTime -= 5 }} className="hover:text-(--info) transition-colors"><RotateCcw size={18} /></button>
              <button onClick={() => { if(videoRef.current) videoRef.current.currentTime += 5 }} className="hover:text-(--info) transition-colors"><RotateCw size={18} /></button>

              <div className="flex items-center gap-2 group/volume relative">
                <button onClick={() => { if(videoRef.current) { videoRef.current.muted = !isMuted; setIsMuted(!isMuted) }}} className="hover:text-(--info) transition-colors">
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input 
                  type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} 
                  onChange={(e) => { setVolume(parseFloat(e.target.value)); if(videoRef.current) videoRef.current.volume = parseFloat(e.target.value) }}
                  className="w-0 group-hover/volume:w-16 transition-all duration-300 accent-white h-1 bg-white/20 rounded-lg cursor-pointer appearance-none"
                />
              </div>

              <button onClick={() => { const next = SPEEDS[(SPEEDS.indexOf(playbackSpeed) + 1) % SPEEDS.length]; setPlaybackSpeed(next); if(videoRef.current) videoRef.current.playbackRate = next }} className="text-[10px] font-bold border border-white/40 px-1.5 py-0.5 rounded hover:bg-white/20">
                {playbackSpeed}x
              </button>
            </div>
            
            <button onClick={toggleFullScreen} className="hover:text-(--info) transition-colors">
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-(--bg-surface) p-6 rounded-2xl border border-(--border-subtle)">
        <h3 className="text-lg font-semibold text-(--text-primary)">{step === 'action' ? '¿Qué decisión técnica debe tomar el árbitro?' : '¿Qué sanción disciplinaria corresponde?'}</h3>
        <div className="grid gap-2">
          {(step === 'action' ? actionOptions[currentIndex] : SANCTION_OPTIONS).map((opt, i) => (
            <button 
              key={i} onClick={() => step === 'action' ? setSelectedAction(i) : setSelectedSanction(i)}
              className={`p-4 text-left text-sm rounded-xl border-2 transition-all ${(step === 'action' ? selectedAction : selectedSanction) === i ? 'border-(--info) bg-(--info)/5 text-(--text-primary)' : 'border-(--border-subtle) text-(--text-secondary) hover:border-(--text-muted)'}`}
            >
              {opt}
            </button>
          ))}
        </div>
        <button 
          disabled={(step === 'action' ? selectedAction : selectedSanction) === null}
          onClick={() => step === 'action' ? setStep('sanction') : handleFinish()}
          className="w-full py-3.5 bg-(--info) hover:bg-(--info-hover) text-white rounded-xl font-semibold shadow-md disabled:opacity-40"
        >
          {step === 'action' ? 'Continuar a Sanción' : 'Finalizar Análisis'}
        </button>
      </div>
    </div>
  )
}

/* ─── Main Page ─── */
export default function LearnPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('test')

  return (
    <div className="min-h-screen bg-(--bg-primary) pb-24 text-(--text-primary)">
      <div className="px-4 max-w-3xl mx-auto">
        <header className="py-6">
          <h1 className="text-2xl font-bold">Aprendizaje</h1>
          <p className="text-sm text-(--text-muted)">Mejora tus conocimientos arbitrales</p>
        </header>
        <LearnNav activeTab={activeTab} setActiveTab={setActiveTab} />
        <main>
          {activeTab === 'test' && <TestView />}
          {activeTab === 'questions' && <QuestionsView />}
          {activeTab === 'videos' && <VideosView />}
          {activeTab === 'courses' && <div className="text-center py-20 bg-(--bg-surface) rounded-2xl border border-(--border-subtle)">Cursos en desarrollo</div>}
          {activeTab === 'resources' && <div className="text-center py-20 bg-(--bg-surface) rounded-2xl border border-(--border-subtle)">Recursos próximamente</div>}
        </main>
      </div>
    </div>
  )
}