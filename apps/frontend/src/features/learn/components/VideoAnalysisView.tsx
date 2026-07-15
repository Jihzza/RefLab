import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Video,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, IconButton, Surface } from '@/components/ui'
import {
  getVideoPublicUrl,
  getVideoScenarios,
  saveVideoAttempt,
} from '../api/testsApi'
import type { VideoScenario } from '../types'

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
type ResultTone = 'success' | 'warning' | 'danger'

const resultToneClasses: Record<ResultTone, string> = {
  success: 'border-(--mc-color-success)/45 bg-(--mc-color-success)/8 text-(--mc-color-success)',
  warning: 'border-(--mc-color-warning)/45 bg-(--mc-color-warning)/8 text-(--mc-color-warning)',
  danger: 'border-(--mc-color-danger)/45 bg-(--mc-color-danger)/8 text-(--mc-color-danger)',
}

const resultTextClasses: Record<ResultTone, string> = {
  success: 'text-(--mc-color-success)',
  warning: 'text-(--mc-color-warning)',
  danger: 'text-(--mc-color-danger)',
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

export default function VideoAnalysisView() {
  const { t, i18n } = useTranslation()
  const [scenarios, setScenarios] = useState<VideoScenario[]>([])
  const [actionOptionsPerScenario, setActionOptionsPerScenario] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [loadVersion, setLoadVersion] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [step, setStep] = useState<VideoStep>('action')

  const [selectedAction, setSelectedAction] = useState<number | null>(null)
  const [selectedSanction, setSelectedSanction] = useState<number | null>(null)
  const [actionCorrect, setActionCorrect] = useState(false)
  const [sanctionCorrect, setSanctionCorrect] = useState(false)
  const [savingAttempt, setSavingAttempt] = useState(false)
  const [attemptError, setAttemptError] = useState(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const headingId = useId()
  const actionGroupName = `${headingId}-action`
  const sanctionGroupName = `${headingId}-sanction`
  const controlLabels = getVideoControlLabels(i18n.resolvedLanguage)

  useEffect(() => {
    let cancelled = false

    async function fetchScenarios() {
      setLoadError(false)
      const { data, error } = await getVideoScenarios()
      if (cancelled) return

      if (error) {
        console.error('Failed to load video scenarios:', error)
        setLoadError(true)
        setLoading(false)
        return
      }

      const loaded = data || []
      setScenarios(loaded)

      if (loaded.length > 0) {
        setActionOptionsPerScenario(
          loaded.map((scenario) => {
            const fromScenarios = [...new Set(
              loaded
                .filter(
                  (candidate) =>
                    candidate.id !== scenario.id &&
                    candidate.correct_action !== scenario.correct_action,
                )
                .map((candidate) => candidate.correct_action),
            )]
            const fromPredefined = ACTION_OPTIONS.filter(
              (action) =>
                action !== scenario.correct_action &&
                !fromScenarios.includes(action),
            )
            const pool = [...fromScenarios, ...fromPredefined]
            const distractors = shuffle(pool).slice(0, 3)
            return shuffle([scenario.correct_action, ...distractors])
          }),
        )
      }

      setLoading(false)
    }

    void fetchScenarios()
    return () => {
      cancelled = true
    }
  }, [loadVersion])

  if (loading) {
    return (
      <Surface
        padding="lg"
        className="flex min-h-56 items-center justify-center border-(--mc-color-border-strong) shadow-none"
        role="status"
        aria-label={t('Loading...')}
      >
        <div className="flex flex-col items-center gap-3 text-(--mc-color-text-muted)">
          <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <span className="text-sm">{t('Loading...')}</span>
        </div>
      </Surface>
    )
  }

  if (scenarios.length === 0) {
    if (loadError) {
      return (
        <Surface
          padding="lg"
          className="flex min-h-56 flex-col items-center justify-center border-(--mc-color-danger)/35 text-center shadow-none"
          role="alert"
        >
          <AlertTriangle className="size-7 text-(--mc-color-danger)" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-(--mc-color-text)">
            {t('Failed to load video scenarios.')}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              setLoading(true)
              setLoadVersion((version) => version + 1)
            }}
          >
            {t('Try Again')}
          </Button>
        </Surface>
      )
    }

    return (
      <Surface
        padding="lg"
        className="flex min-h-56 flex-col items-center justify-center border-(--mc-color-border-strong) text-center shadow-none"
      >
        <Video className="size-7 text-(--mc-color-accent)" aria-hidden="true" />
        <p className="mt-3 text-sm text-(--mc-color-text-muted)">
          {t('No video scenarios available yet.')}
        </p>
      </Surface>
    )
  }

  const current = scenarios[currentIndex]
  const currentActionOptions = actionOptionsPerScenario[currentIndex] || []
  const isLastVideo = currentIndex >= scenarios.length - 1

  function handleConfirmAction() {
    if (selectedAction === null) return
    setStep('sanction')
  }

  async function handleConfirmSanction() {
    if (selectedAction === null || selectedSanction === null || savingAttempt) return

    const chosenAction = currentActionOptions[selectedAction]
    const chosenSanction = SANCTION_OPTIONS[selectedSanction]
    const isActionCorrect = chosenAction === current.correct_action
    const isSanctionCorrect = chosenSanction === current.correct_sanction

    setSavingAttempt(true)
    setAttemptError(false)

    try {
      const { data, error } = await saveVideoAttempt(
        current.id,
        chosenAction,
        chosenSanction,
        isActionCorrect,
        isSanctionCorrect,
      )
      if (error || !data) throw error || new Error('Missing saved video attempt')

      setActionCorrect(isActionCorrect)
      setSanctionCorrect(isSanctionCorrect)
      setStep('result')
    } catch (error) {
      console.error('Failed to save video attempt:', error)
      setAttemptError(true)
    } finally {
      setSavingAttempt(false)
    }
  }

  function resetState() {
    setStep('action')
    setSelectedAction(null)
    setSelectedSanction(null)
    setActionCorrect(false)
    setSanctionCorrect(false)
    setSavingAttempt(false)
    setAttemptError(false)
    setIsPlaying(false)
    setVideoError(null)
    setCurrentTime(0)
    setDuration(0)

    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  function goToNext() {
    if (isLastVideo) return
    setCurrentIndex(currentIndex + 1)
    resetState()
  }

  function handleRestart() {
    setCurrentIndex(0)
    resetState()
  }

  function togglePlay() {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      void video.play().catch(() => {
        setVideoError(current.video_url)
      })
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  function toggleMute() {
    const video = videoRef.current
    if (!video) return

    const nextMuted = !video.muted
    video.muted = nextMuted
    setIsMuted(nextMuted)
  }

  function handleSeek(value: number) {
    if (!videoRef.current || !Number.isFinite(value)) return
    videoRef.current.currentTime = value
    setCurrentTime(value)
  }

  if (step === 'result') {
    const chosenAction = selectedAction !== null ? currentActionOptions[selectedAction] : ''
    const chosenSanction = selectedSanction !== null ? SANCTION_OPTIONS[selectedSanction] : ''

    return (
      <ResultView
        headingId={headingId}
        current={current}
        currentIndex={currentIndex}
        scenarioCount={scenarios.length}
        actionCorrect={actionCorrect}
        sanctionCorrect={sanctionCorrect}
        chosenAction={chosenAction}
        chosenSanction={chosenSanction}
        isLastVideo={isLastVideo}
        onContinue={isLastVideo ? handleRestart : goToNext}
      />
    )
  }

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-start">
      <Surface
        padding="none"
        className="min-w-0 overflow-hidden border-(--mc-color-border-strong) shadow-none"
        role="region"
        aria-labelledby={headingId}
      >
        <div className="flex min-h-14 items-center justify-between gap-4 border-b border-(--mc-color-border) px-4 py-3 sm:px-5">
          <h2 id={headingId} className="text-lg font-bold tracking-[-0.02em] text-(--mc-color-text) sm:text-xl">
            {t('Video Analysis')}
          </h2>
          <span className="shrink-0 text-lg font-semibold tabular-nums text-(--mc-color-text-secondary)">
            {currentIndex + 1} / {scenarios.length}
          </span>
        </div>

        <div className="relative aspect-video overflow-hidden bg-black">
          <video
            key={current.id}
            ref={videoRef}
            className="size-full object-contain"
            aria-label={current.title}
            playsInline
            preload="metadata"
            muted={isMuted}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onError={() => setVideoError(current.video_url)}
            onLoadedMetadata={(event) => {
              setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)
              setCurrentTime(event.currentTarget.currentTime)
            }}
            onDurationChange={(event) => {
              setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)
            }}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          >
            <source src={getVideoPublicUrl(current.video_url)} type="video/mp4" />
          </video>

          {videoError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-5 text-center">
              <AlertTriangle className="size-7 text-(--mc-color-danger)" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-(--mc-color-danger)">
                {t('Video failed to load')}
              </p>
              <p className="mt-2 max-w-md break-all text-xs text-white/65">
                {t('File')}: {videoError}
              </p>
              <p className="mt-1 max-w-md text-xs leading-5 text-white/45">
                {t('Verify that this file exists and is publicly available from the configured video service.')}
              </p>
            </div>
          )}

          {!isPlaying && !videoError && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute left-1/2 top-1/2 z-10 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-accent) motion-reduce:transition-none"
              aria-label={controlLabels.play}
            >
              <Play className="ml-1 size-7 fill-current" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex min-h-12 items-center gap-2 border-t border-(--mc-color-border) bg-(--mc-color-canvas) px-3 py-2 sm:px-4">
          <IconButton
            label={isPlaying ? controlLabels.pause : controlLabels.play}
            size="sm"
            variant="ghost"
            onClick={togglePlay}
            disabled={Boolean(videoError)}
            className="text-(--mc-color-text)"
          >
            {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
          </IconButton>

          <input
            type="range"
            min={0}
            max={Math.max(duration, 0.01)}
            step={0.1}
            value={Math.min(currentTime, Math.max(duration, 0.01))}
            onChange={(event) => handleSeek(Number(event.currentTarget.value))}
            disabled={!duration || Boolean(videoError)}
            className="h-1.5 min-w-0 flex-1 cursor-pointer accent-(--mc-color-accent) disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={controlLabels.progress}
            aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
          />

          <span className="shrink-0 text-[11px] tabular-nums text-(--mc-color-text-secondary) sm:text-xs">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <IconButton
            label={isMuted ? controlLabels.unmute : controlLabels.mute}
            size="sm"
            variant="ghost"
            onClick={toggleMute}
            disabled={Boolean(videoError)}
            className="text-(--mc-color-text)"
          >
            {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </IconButton>
        </div>

        <div className="relative overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
          <PitchDecoration />
          <div className="relative z-10 sm:max-w-[76%]">
            <h3 className="text-lg font-semibold leading-tight text-(--mc-color-text) sm:text-xl">
              {current.title}
            </h3>
            {current.description && (
              <p className="mt-2 text-sm leading-6 text-(--mc-color-text-secondary)">
                {current.description}
              </p>
            )}
          </div>
        </div>
      </Surface>

      <div className="min-w-0 space-y-4">
        <StepIndicator step={step} />

        <Surface
          padding="md"
          className="border-(--mc-color-border-strong) shadow-none sm:p-5"
        >
          {step === 'action' ? (
            <fieldset>
              <legend className="mb-4 text-base font-semibold leading-6 text-(--mc-color-text)">
                {t('What action should the referee take?')}
              </legend>

              <div className="space-y-2.5">
                {currentActionOptions.map((option, index) => (
                  <DecisionOption
                    key={option}
                    name={actionGroupName}
                    checked={selectedAction === index}
                    label={t(option)}
                    onChange={() => setSelectedAction(index)}
                  />
                ))}
              </div>

              <div className="mt-5">
                <PrimaryButtonFrame>
                  <Button
                    fullWidth
                    size="lg"
                    disabled={selectedAction === null}
                    onClick={handleConfirmAction}
                    trailingIcon={<ChevronRight className="size-4" />}
                    className="rounded-none pr-12"
                  >
                    {t('Next — Sanction')}
                  </Button>
                </PrimaryButtonFrame>
              </div>
            </fieldset>
          ) : (
            <fieldset>
              <legend className="mb-4 text-base font-semibold leading-6 text-(--mc-color-text)">
                {t('What sanction should be applied?')}
              </legend>

              <div className="space-y-2.5">
                {SANCTION_OPTIONS.map((option, index) => (
                  <DecisionOption
                    key={option}
                    name={sanctionGroupName}
                    checked={selectedSanction === index}
                    label={t(option)}
                    indicator={<SanctionCard index={index} />}
                    onChange={() => {
                      setSelectedSanction(index)
                      setAttemptError(false)
                    }}
                    disabled={savingAttempt}
                  />
                ))}
              </div>

              {attemptError && (
                <div
                  className="mt-4 flex items-start gap-2.5 rounded-(--mc-radius-button) border border-(--mc-color-danger)/40 bg-(--mc-color-danger)/8 px-4 py-3 text-sm text-(--mc-color-danger)"
                  role="alert"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{t('Failed to save video result. Please try again.')}</span>
                </div>
              )}

              <div className="mt-5 grid grid-cols-[minmax(7rem,0.8fr)_minmax(0,1.2fr)] gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    setAttemptError(false)
                    setStep('action')
                  }}
                  disabled={savingAttempt}
                  leadingIcon={<ArrowLeft className="size-4" />}
                  className="border-(--mc-color-accent) bg-transparent px-3 text-(--mc-color-accent)"
                >
                  {t('Back')}
                </Button>

                <PrimaryButtonFrame>
                  <Button
                    fullWidth
                    size="lg"
                    disabled={selectedSanction === null || savingAttempt}
                    onClick={() => void handleConfirmSanction()}
                    loading={savingAttempt}
                    loadingText={t('Saving...')}
                    className="rounded-none pr-10"
                  >
                    {t('Confirm')}
                  </Button>
                </PrimaryButtonFrame>
              </div>
            </fieldset>
          )}
        </Surface>
      </div>
    </div>
  )
}

interface ResultViewProps {
  headingId: string
  current: VideoScenario
  currentIndex: number
  scenarioCount: number
  actionCorrect: boolean
  sanctionCorrect: boolean
  chosenAction: string
  chosenSanction: string
  isLastVideo: boolean
  onContinue: () => void
}

function ResultView({
  headingId,
  current,
  currentIndex,
  scenarioCount,
  actionCorrect,
  sanctionCorrect,
  chosenAction,
  chosenSanction,
  isLastVideo,
  onContinue,
}: ResultViewProps) {
  const { t } = useTranslation()
  const bothCorrect = actionCorrect && sanctionCorrect
  const partiallyCorrect = actionCorrect || sanctionCorrect
  const tone: ResultTone = bothCorrect ? 'success' : partiallyCorrect ? 'warning' : 'danger'
  const statusText = bothCorrect
    ? t('Both Correct')
    : partiallyCorrect
      ? t('Partially Correct')
      : t('Incorrect')
  const StatusIcon = bothCorrect ? CheckCircle2 : partiallyCorrect ? AlertTriangle : XCircle

  return (
    <Surface
      padding="none"
      className="mx-auto max-w-3xl overflow-hidden border-(--mc-color-border-strong) shadow-none"
      role="region"
      aria-labelledby={headingId}
    >
      <div className="flex min-h-14 items-center justify-between gap-4 border-b border-(--mc-color-border) px-4 py-3 sm:px-5">
        <h2 id={headingId} className="text-lg font-bold tracking-[-0.02em] text-(--mc-color-text) sm:text-xl">
          {t('Video Analysis')}
        </h2>
        <span className="shrink-0 text-lg font-semibold tabular-nums text-(--mc-color-text-secondary)">
          {currentIndex + 1} / {scenarioCount}
        </span>
      </div>

      <div className="p-4 sm:p-6">
        <div className="text-center" role="status" aria-live="polite">
          <span className={`mx-auto flex size-14 items-center justify-center rounded-full border ${resultToneClasses[tone]}`}>
            <StatusIcon className="size-7" aria-hidden="true" />
          </span>
          <h3 className="mt-3 text-lg font-semibold text-(--mc-color-text) sm:text-xl">
            {current.title}
          </h3>
          <p className={`mt-1 text-2xl font-extrabold tracking-[-0.03em] ${resultTextClasses[tone]}`}>
            {statusText}
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <ResultDecision
            label={t('Action')}
            chosen={t(chosenAction)}
            correctAnswer={t(current.correct_action)}
            isCorrect={actionCorrect}
          />
          <ResultDecision
            label={t('Sanction')}
            chosen={t(chosenSanction)}
            correctAnswer={t(current.correct_sanction)}
            isCorrect={sanctionCorrect}
          />
        </div>

        <div className="mt-6">
          <PrimaryButtonFrame>
            <Button
              fullWidth
              size="lg"
              onClick={onContinue}
              leadingIcon={isLastVideo ? <RotateCcw className="size-4" /> : undefined}
              trailingIcon={!isLastVideo ? <ChevronRight className="size-4" /> : undefined}
              className="rounded-none pr-12"
            >
              {isLastVideo ? t('Start Over') : t('Next Video')}
            </Button>
          </PrimaryButtonFrame>
        </div>
      </div>
    </Surface>
  )
}

interface ResultDecisionProps {
  label: string
  chosen: string
  correctAnswer: string
  isCorrect: boolean
}

function ResultDecision({ label, chosen, correctAnswer, isCorrect }: ResultDecisionProps) {
  const { t } = useTranslation()
  const tone: ResultTone = isCorrect ? 'success' : 'danger'

  return (
    <div className={`rounded-(--mc-radius-card) border p-4 ${resultToneClasses[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-(--mc-color-text-muted)">
          {label}
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold">
          {isCorrect ? <Check className="size-3.5" aria-hidden="true" /> : <XCircle className="size-3.5" aria-hidden="true" />}
          {isCorrect ? t('Correct') : t('Incorrect')}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-5 text-(--mc-color-text)">{chosen}</p>
      {!isCorrect && (
        <p className="mt-2 border-t border-current/20 pt-2 text-sm leading-5 text-(--mc-color-success)">
          {t('Correct')}: {correctAnswer}
        </p>
      )}
    </div>
  )
}

function StepIndicator({ step }: { step: Exclude<VideoStep, 'result'> }) {
  const { t } = useTranslation()
  const actionComplete = step === 'sanction'

  return (
    <Surface
      padding="sm"
      className="border-(--mc-color-border-strong) shadow-none"
      role="group"
      aria-label={t('Video Analysis')}
    >
      <ol className="flex items-center gap-3 px-1 sm:px-2">
        <li
          className={`flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] ${actionComplete ? 'text-(--mc-color-text-secondary)' : 'text-(--mc-color-accent)'}`}
          aria-current={!actionComplete ? 'step' : undefined}
        >
          <span className={`flex size-8 items-center justify-center rounded-full border-2 ${actionComplete ? 'border-(--mc-color-success) text-(--mc-color-success)' : 'border-(--mc-color-accent) bg-(--mc-color-accent) text-(--mc-color-canvas)'}`}>
            {actionComplete ? <Check className="size-4" aria-hidden="true" /> : '1'}
          </span>
          {t('Action')}
        </li>

        <li className="h-px min-w-4 flex-1 bg-linear-to-r from-(--mc-color-border-strong) to-(--mc-color-accent)" aria-hidden="true" />

        <li
          className={`flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] ${step === 'sanction' ? 'text-(--mc-color-accent)' : 'text-(--mc-color-text-muted)'}`}
          aria-current={step === 'sanction' ? 'step' : undefined}
        >
          <span className={`flex size-8 items-center justify-center rounded-full border-2 ${step === 'sanction' ? 'border-(--mc-color-accent) bg-(--mc-color-accent) text-(--mc-color-canvas)' : 'border-(--mc-color-border-strong)'}`}>
            2
          </span>
          {t('Sanction')}
        </li>
      </ol>
    </Surface>
  )
}

interface DecisionOptionProps {
  name: string
  checked: boolean
  label: string
  indicator?: ReactNode
  onChange: () => void
  disabled?: boolean
}

function DecisionOption({
  name,
  checked,
  label,
  indicator,
  onChange,
  disabled = false,
}: DecisionOptionProps) {
  return (
    <label className={`block ${disabled ? 'cursor-not-allowed opacity-65' : 'cursor-pointer'}`}>
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="peer sr-only"
      />
      <span
        className={`flex min-h-14 items-center gap-3 rounded-(--mc-radius-input) border px-4 py-3 text-sm transition-[background-color,border-color,box-shadow,color] duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-(--mc-color-focus) peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-(--mc-color-canvas) motion-reduce:transition-none ${checked ? 'border-(--mc-color-accent) bg-(--mc-color-accent)/8 text-(--mc-color-text)' : 'border-(--mc-color-border-strong) text-(--mc-color-text-secondary) hover:bg-(--mc-color-surface-hover)'}`}
      >
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 ${checked ? 'border-(--mc-color-accent)' : 'border-(--mc-color-text-muted)'}`}
          aria-hidden="true"
        >
          {checked && <span className="size-3.5 rounded-full bg-(--mc-color-accent)" />}
        </span>
        <span className="min-w-0 flex-1 leading-5">{label}</span>
        {indicator}
      </span>
    </label>
  )
}

function SanctionCard({ index }: { index: number }) {
  if (index === 1) {
    return (
      <span
        className="h-8 w-5 shrink-0 rounded-sm border border-(--mc-color-accent-soft)/35 bg-(--mc-color-accent) shadow-sm"
        aria-hidden="true"
      />
    )
  }

  if (index === 2) {
    return (
      <span
        className="h-8 w-5 shrink-0 rounded-sm border border-red-300/35 bg-(--mc-color-danger) shadow-sm"
        aria-hidden="true"
      />
    )
  }

  return null
}

function PrimaryButtonFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-(--mc-radius-button)">
      {children}
      <span
        className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-8 -skew-x-[24deg] bg-(--mc-color-danger)"
        aria-hidden="true"
      />
    </div>
  )
}

function PitchDecoration() {
  return (
    <svg
      viewBox="0 0 220 140"
      className="pointer-events-none absolute -bottom-8 -right-8 h-40 w-56 text-(--mc-color-border-strong) opacity-45"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M38 8h174v124H8z" transform="skewX(-18)" />
      <path d="M109 8v124" transform="skewX(-18)" />
      <circle cx="109" cy="70" r="22" transform="skewX(-18)" />
      <path d="M38 43H8v54h30M180 43h32v54h-32" transform="skewX(-18)" />
    </svg>
  )
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const roundedSeconds = Math.floor(seconds)
  const minutes = Math.floor(roundedSeconds / 60)
  const remainder = roundedSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`
}

function getVideoControlLabels(language?: string) {
  const portuguese = language?.toLowerCase().startsWith('pt')
  return portuguese
    ? {
        play: 'Reproduzir vídeo',
        pause: 'Pausar vídeo',
        mute: 'Silenciar vídeo',
        unmute: 'Ativar som do vídeo',
        progress: 'Progresso do vídeo',
      }
    : {
        play: 'Play video',
        pause: 'Pause video',
        mute: 'Mute video',
        unmute: 'Unmute video',
        progress: 'Video progress',
      }
}
