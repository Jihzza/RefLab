import { useState } from 'react'
import { AlertTriangle, ArrowLeft, CalendarClock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, Skeleton, Surface } from '@/components/ui'
import { getUserCompletedAttempts } from '../api/testsApi'
import type { TestAttempt } from '../types'
import RandomTestLanding from './test/RandomTestLanding'
import RandomTestResults from './test/RandomTestResults'
import RandomTestRunner from './test/RandomTestRunner'

type TestViewState = 'landing' | 'test' | 'results' | 'history'

export interface LearnTestViewProps {
  autoStart: boolean
  onAutoStartConsumed: () => void
  onImmersiveChange: (immersive: boolean) => void
}

export default function LearnTestView({
  autoStart,
  onAutoStartConsumed,
  onImmersiveChange,
}: LearnTestViewProps) {
  const { t, i18n } = useTranslation()
  const [view, setView] = useState<TestViewState>(() => (autoStart ? 'test' : 'landing'))
  const [attemptId, setAttemptId] = useState('')
  const [history, setHistory] = useState<TestAttempt[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(false)

  const changeView = (nextView: TestViewState) => {
    onAutoStartConsumed()
    setView(nextView)
    onImmersiveChange(nextView === 'test' || nextView === 'results')
  }

  const handleViewHistory = async () => {
    setHistoryLoading(true)
    setHistoryError(false)
    changeView('history')
    const { data, error } = await getUserCompletedAttempts()
    if (error) setHistoryError(true)
    setHistory(data || [])
    setHistoryLoading(false)
  }

  if (view === 'landing') {
    return (
      <RandomTestLanding
        onStartTest={() => changeView('test')}
        onViewHistory={handleViewHistory}
      />
    )
  }

  if (view === 'test') {
    return (
      <RandomTestRunner
        onBackToTests={() => changeView('landing')}
        onComplete={(id) => {
          setAttemptId(id)
          changeView('results')
        }}
      />
    )
  }

  if (view === 'results' && attemptId) {
    return (
      <RandomTestResults
        attemptId={attemptId}
        onRestart={() => changeView('test')}
        onBackToTests={() => changeView('landing')}
      />
    )
  }

  if (view === 'history') {
    return (
      <section aria-labelledby="test-history-title" className="space-y-4">
        <header className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<ArrowLeft className="size-4" />}
            onClick={() => changeView('landing')}
            className="-ml-2"
          >
            {t('Back')}
          </Button>
          <h2 id="test-history-title" className="text-xl font-bold text-(--mc-color-text)">
            {t('Test History')}
          </h2>
        </header>

        {historyLoading ? (
          <div className="space-y-3" role="status" aria-live="polite">
            <span className="sr-only">{t('Loading...')}</span>
            {Array.from({ length: 4 }, (_, index) => (
              <Surface
                key={index}
                padding="md"
                className="flex items-center justify-between gap-4 shadow-none"
                aria-hidden="true"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton variant="text" width="42%" />
                  <Skeleton variant="text" width="64%" height="0.7rem" />
                </div>
                <Skeleton variant="text" width="3rem" height="1.2rem" />
              </Surface>
            ))}
          </div>
        ) : historyError ? (
          <Surface
            padding="none"
            className="overflow-hidden border-(--mc-color-danger)/35 shadow-none"
            role="alert"
          >
            <EmptyState
              icon={<AlertTriangle className="size-5 text-(--mc-color-danger)" />}
              title={t('Failed to load test history.')}
              action={
                <Button variant="secondary" onClick={() => void handleViewHistory()}>
                  {t('Try Again')}
                </Button>
              }
            />
          </Surface>
        ) : history.length === 0 ? (
          <Surface padding="none" className="overflow-hidden border-(--mc-color-border-strong) shadow-none">
            <EmptyState
              icon={<CalendarClock className="size-5" />}
              title={t('Test History')}
              description={t('No completed tests yet.')}
            />
          </Surface>
        ) : (
          <ul className="space-y-3">
            {history.map((entry) => {
              const percentage = entry.score_percent ?? 0
              const passing = percentage >= 80
              const date = entry.submitted_at
                ? new Date(entry.submitted_at).toLocaleDateString(
                    i18n.language || 'pt-PT',
                    { day: 'numeric', month: 'short', year: 'numeric' },
                  )
                : '—'
              const duration = entry.time_elapsed_seconds !== null
                ? `${Math.floor(entry.time_elapsed_seconds / 60)}:${String(entry.time_elapsed_seconds % 60).padStart(2, '0')}`
                : null

              return (
                <li key={entry.id} className="list-none">
                  <Surface
                    padding="md"
                    className="relative flex min-h-[76px] items-center justify-between gap-4 overflow-hidden border-(--mc-color-border-strong) shadow-none"
                  >
                    <span
                      className={`absolute inset-y-0 left-0 w-1 ${passing ? 'bg-(--mc-color-success)' : 'bg-(--mc-color-danger)'}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 pl-1">
                      <p className="text-sm font-semibold text-(--mc-color-text)">{date}</p>
                      <p className="mt-1 text-xs text-(--mc-color-text-muted)">
                        {t('{{correct}}/{{total}} correct', {
                          correct: entry.score_correct,
                          total: entry.score_total,
                        })}
                        {duration && ` · ${duration}`}
                      </p>
                    </div>
                    <span className={`shrink-0 text-lg font-extrabold tabular-nums ${passing ? 'text-(--mc-color-success)' : 'text-(--mc-color-danger)'}`}>
                      {percentage}%
                    </span>
                  </Surface>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    )
  }

  return null
}
