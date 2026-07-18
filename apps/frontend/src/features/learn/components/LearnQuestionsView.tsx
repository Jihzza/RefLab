import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/components/useAuth'
import { completeQuestionSession, createQuestionSession } from '../api/testsApi'
import type { QuestionSession, QuestionSessionMode, SessionResult } from '../types'
import QuestionsLanding from './questions/QuestionsLanding'
import QuestionsReview from './questions/QuestionsReview'
import QuestionsSession from './questions/QuestionsSession'
import QuestionsSetup from './questions/QuestionsSetup'

type QuestionsViewState = 'landing' | 'setup_by_law' | 'setup_by_area' | 'session' | 'review'

interface ActiveSession {
  sessionId: string
  mode: QuestionSessionMode
  filterLaws: number[] | null
  filterAreas: string[] | null
}

export interface LearnQuestionsViewProps {
  onImmersiveChange: (immersive: boolean) => void
}

export default function LearnQuestionsView({
  onImmersiveChange,
}: LearnQuestionsViewProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [view, setView] = useState<QuestionsViewState>('landing')
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [lastResult, setLastResult] = useState<SessionResult | null>(null)
  const [creating, setCreating] = useState(false)
  const [creationError, setCreationError] = useState(false)
  const creationRequestRef = useRef(0)
  const creatingRef = useRef(false)
  const pendingCreationRef = useRef<{ signature: string; sessionId: string } | null>(null)

  useEffect(() => () => {
    creationRequestRef.current += 1
    creatingRef.current = false
    pendingCreationRef.current = null
  }, [])

  const applyView = useCallback((nextView: QuestionsViewState) => {
    setView(nextView)
    onImmersiveChange(nextView === 'session' || nextView === 'review')
  }, [onImmersiveChange])

  const changeView = (nextView: QuestionsViewState) => {
    creationRequestRef.current += 1
    creatingRef.current = false
    pendingCreationRef.current = null
    setCreating(false)
    setCreationError(false)
    applyView(nextView)
  }

  const startSession = useCallback(async (
    mode: QuestionSessionMode,
    filterLaws: number[] | null,
    filterAreas: string[] | null,
  ) => {
    const expectedUserId = user?.id
    if (creatingRef.current || !expectedUserId) return
    creatingRef.current = true
    const requestId = creationRequestRef.current + 1
    creationRequestRef.current = requestId
    setCreating(true)
    setCreationError(false)

    const normalizedLaws = filterLaws
      ? [...new Set(filterLaws)].sort((left, right) => left - right)
      : null
    const normalizedAreas = filterAreas
      ? [...new Set(filterAreas.map((area) => area.trim()))].sort()
      : null
    const signature = JSON.stringify([
      expectedUserId,
      mode,
      normalizedLaws,
      normalizedAreas,
    ])
    if (!pendingCreationRef.current || pendingCreationRef.current.signature !== signature) {
      pendingCreationRef.current = { signature, sessionId: crypto.randomUUID() }
    }
    const sessionId = pendingCreationRef.current.sessionId

    let result: { data: QuestionSession | null; error: unknown }
    try {
      result = await createQuestionSession(
        sessionId,
        expectedUserId,
        mode,
        normalizedLaws,
        normalizedAreas,
      )
    } catch (error) {
      console.error('Failed to create question session:', error)
      result = { data: null, error: error instanceof Error ? error : new Error('Unknown error') }
    }

    if (creationRequestRef.current !== requestId) {
      if (result.data) {
        void completeQuestionSession(result.data.id)
      }
      return
    }
    creatingRef.current = false
    setCreating(false)
    if (result.error || !result.data) {
      setCreationError(true)
      onImmersiveChange(false)
      return
    }
    pendingCreationRef.current = null

    setActiveSession({
      sessionId: result.data.id,
      mode: result.data.mode,
      filterLaws: result.data.filter_laws,
      filterAreas: result.data.filter_areas,
    })
    applyView('session')
  }, [applyView, onImmersiveChange, user?.id])

  const handleStartQuick = () => startSession('quick', null, null)
  const handleSetupConfirm = (laws: number[], areas: string[]) => {
    const mode: QuestionSessionMode = view === 'setup_by_law' ? 'by_law' : 'by_area'
    void startSession(
      mode,
      mode === 'by_law' ? laws : null,
      mode === 'by_area' ? areas : null,
    )
  }

  const handleRestart = () => {
    if (!activeSession) {
      changeView('landing')
      return
    }

    if (activeSession.mode === 'quick') {
      void handleStartQuick()
    } else if (activeSession.mode === 'by_law') {
      changeView('setup_by_law')
    } else {
      changeView('setup_by_area')
    }
  }

  const withCreationStatus = (content: ReactNode) => (
    <>
      {creationError && (
        <div
          className="mx-auto mb-4 flex w-full max-w-3xl items-start gap-2.5 rounded-(--mc-radius-button) border border-(--mc-color-danger)/40 bg-(--mc-color-danger)/8 px-4 py-3 text-sm text-(--mc-color-danger)"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{t('Failed to start session. Please try again.')}</span>
        </div>
      )}
      {content}
    </>
  )

  if (view === 'landing') {
    return withCreationStatus(
      <QuestionsLanding
        onStartQuick={() => void handleStartQuick()}
        onStartByLaw={() => changeView('setup_by_law')}
        onStartByArea={() => changeView('setup_by_area')}
        creating={creating}
      />
    )
  }

  if (view === 'setup_by_law' || view === 'setup_by_area') {
    return withCreationStatus(
      <QuestionsSetup
        mode={view === 'setup_by_law' ? 'by_law' : 'by_area'}
        onStart={handleSetupConfirm}
        onBack={() => changeView('landing')}
        creating={creating}
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
        onEndSession={(result) => {
          setLastResult(result)
          changeView('review')
        }}
        onExitSession={() => {
          const returnView = activeSession.mode === 'quick'
            ? 'landing'
            : activeSession.mode === 'by_law'
              ? 'setup_by_law'
              : 'setup_by_area'
          setActiveSession(null)
          changeView(returnView)
        }}
      />
    )
  }

  if (view === 'review' && lastResult) {
    return withCreationStatus(
      <QuestionsReview
        result={lastResult}
        onStartNew={() => changeView('landing')}
        onRestart={handleRestart}
        creating={creating}
      />
    )
  }

  return null
}
