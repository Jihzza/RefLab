import { AlertCircle, RefreshCw, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Surface from '@/components/ui/Surface'
import type { DashboardStats, TopicAccuracy } from '../types'
import HabitsSection from './HabitsSection'
import PerformanceSection from './PerformanceSection'
import ProgressSection from './ProgressSection'
import RecommendedTrainingCard from './RecommendedTrainingCard'
import TopicAccuracyCard from './TopicAccuracyCard'
import TrainingCalendar from './TrainingCalendar'

export interface DashboardViewProps {
  stats: DashboardStats | null
  displayName?: string | null
  error?: string | null
  retrying?: boolean
  onRetry: () => void | Promise<void>
  onStartTraining: () => void
  /** Allows visual fixtures to lock the greeting without changing production behaviour. */
  greetingHour?: number
}

export default function DashboardView({
  stats,
  displayName,
  error = null,
  retrying = false,
  onRetry,
  onStartTraining,
  greetingHour,
}: DashboardViewProps) {
  const { t } = useTranslation()
  const greeting = t(getGreetingKey(greetingHour))
  const firstName = getFirstName(displayName)
  const weakestTopic = stats ? findWeakestTopic(stats.performance.accuracy_by_topic) : null

  return (
    <div className="min-h-full bg-(--mc-color-canvas) pb-8 text-(--mc-color-text)">
      <div className="mx-auto w-full max-w-7xl px-4 pb-4 pt-5 sm:px-6 sm:pt-7 xl:px-8">
        <header className="mb-4 sm:mb-5">
          <h1 className="break-words text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-(--mc-color-text) [overflow-wrap:anywhere] sm:text-3xl">
            {firstName ? `${greeting}, ${firstName}` : t('Dashboard')}
          </h1>
        </header>

        {error && (
          <Surface
            variant="inset"
            padding="sm"
            className="mb-4 flex flex-col gap-3 border-(--mc-color-danger)/35 bg-(--mc-color-danger)/8 sm:flex-row sm:items-center"
            role="alert"
          >
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-(--mc-color-danger)" aria-hidden="true" />
              <p className="text-sm leading-5 text-(--mc-color-text-secondary)">
                {t('Failed to load dashboard data. Please try again later.')}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={retrying}
              leadingIcon={<RefreshCw className="size-3.5" />}
              onClick={() => void onRetry()}
              className="self-start sm:self-auto"
            >
              {t('Try Again')}
            </Button>
          </Surface>
        )}

        {retrying && stats && !error && (
          <div
            className="mb-4 flex items-center gap-2 text-xs font-medium text-(--mc-color-text-muted)"
            role="status"
            aria-live="polite"
          >
            <RefreshCw className="size-3.5 animate-spin text-(--mc-color-accent) motion-reduce:animate-none" aria-hidden="true" />
            {t('Updating dashboard')}
          </div>
        )}

        {stats ? (
          <div className="space-y-4 sm:space-y-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
              <PerformanceSection performance={stats.performance} progress={stats.progress} />
              <RecommendedTrainingCard
                topic={weakestTopic}
                onStart={onStartTraining}
              />
            </div>

            <HabitsSection habits={stats.habits} />

            <div className="grid items-start gap-4 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.1fr)] xl:gap-5">
              <TopicAccuracyCard topics={stats.performance.accuracy_by_topic} />

              <div className="space-y-4 sm:space-y-5">
                <ProgressSection
                  progress={stats.progress}
                  matchSimulationAccuracy={stats.performance.match_simulation_accuracy}
                  passRate={stats.performance.pass_rate}
                />
                <TrainingCalendar
                  calendar={stats.habits.calendar}
                  currentStreak={stats.habits.current_streak}
                />
              </div>
            </div>
          </div>
        ) : !error ? (
          <Surface padding="none">
            <EmptyState
              icon={<Target className="size-5" />}
              title={t('No data yet')}
              description={t('Complete your first test to see accuracy')}
              action={
                <Button onClick={onStartTraining}>
                  {t('Start New Test')}
                </Button>
              }
            />
          </Surface>
        ) : null}
      </div>
    </div>
  )
}

function getFirstName(displayName?: string | null): string | null {
  const normalized = displayName?.trim()
  if (!normalized) return null
  return normalized.split(/\s+/)[0]
}

function getGreetingKey(hour = new Date().getHours()): 'Good morning' | 'Good afternoon' | 'Good evening' {
  if (hour < 12) return 'Good morning'
  if (hour < 19) return 'Good afternoon'
  return 'Good evening'
}

function findWeakestTopic(topics: TopicAccuracy[]): TopicAccuracy | null {
  const candidates = topics.filter((topic) => Number.isFinite(topic.accuracy))
  if (candidates.length === 0) return null

  return [...candidates].sort((left, right) => {
    if (left.accuracy !== right.accuracy) return left.accuracy - right.accuracy
    return right.total_questions - left.total_questions
  })[0]
}
