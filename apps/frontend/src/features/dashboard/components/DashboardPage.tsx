import { LayoutDashboard, AlertCircle } from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import DashboardSkeleton from './DashboardSkeleton'
import PerformanceSection from './PerformanceSection'
import ProgressSection from './ProgressSection'
import HabitsSection from './HabitsSection'
import Button from '@/components/ui/Button'
import { PlayerProgressCard, AchievementsSection, deriveLifetimeXp } from '@/features/gamification'
import { useTranslation } from 'react-i18next'

/**
 * DashboardPage — Main dashboard view for authenticated users.
 * Single scrollable page with Performance, Progress, and Habits sections.
 * Data is fetched via a single RPC call through the useDashboard hook.
 */
export default function DashboardPage() {
  const { t } = useTranslation()
  const { stats, loading, error, refresh } = useDashboard()

  return (
    <div className="min-h-screen bg-(--bg-primary) pb-24">
      <div className="px-4 pt-5 space-y-6 max-w-3xl mx-auto">
        {/* Page header */}
        <header className="animate-fade-up">
          <p className="eyebrow mb-1.5">{t('Referee Console')}</p>
          <div className="flex items-center gap-2.5">
            <span
              className="grid place-items-center h-9 w-9 rounded-(--radius-button) bg-(--bg-surface-2) border border-(--border-subtle)"
              aria-hidden="true"
            >
              <LayoutDashboard size={18} className="text-(--brand-yellow)" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-(--text-primary)">
              {t('Dashboard')}
            </h1>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div
            className="flex items-center gap-2.5 p-3.5 bg-(--error)/10 border border-(--error)/30 rounded-(--radius-card) animate-fade-up"
            role="alert"
          >
            <AlertCircle size={18} className="text-(--error) shrink-0" aria-hidden="true" />
            <p className="text-sm text-(--error)">
              {t('Failed to load dashboard data. Please try again later.')}
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && <DashboardSkeleton />}

        {/* Dashboard sections */}
        {!loading && stats && (
          <div className="space-y-8 animate-fade-up">
            <PlayerProgressCard
              lifetimeXp={deriveLifetimeXp({
                questionsAnswered: stats.progress.total_questions_answered,
                overallAccuracy: stats.performance.overall_accuracy,
                testsCompleted: stats.progress.total_tests_completed,
                averageTestScore: stats.performance.pass_rate,
              })}
              streak={stats.habits.current_streak}
            />
            <PerformanceSection performance={stats.performance} />
            <ProgressSection progress={stats.progress} />
            <HabitsSection habits={stats.habits} />
            {(() => {
              // Best topic among those with a meaningful sample (10+ questions).
              const bestTopic = stats.performance.accuracy_by_topic
                .filter((tp) => tp.total_questions >= 10)
                .reduce<(typeof stats.performance.accuracy_by_topic)[number] | null>(
                  (best, tp) => (best === null || tp.accuracy > best.accuracy ? tp : best),
                  null,
                )
              return (
                <AchievementsSection
                  stats={{
                    questionsAnswered: stats.progress.total_questions_answered,
                    streakDays: stats.habits.longest_streak,
                    hadPerfectTest: false,
                    bestTopicAccuracy: bestTopic ? bestTopic.accuracy : 0,
                    bestTopicVolume: bestTopic ? bestTopic.total_questions : 0,
                    dailyGoalDaysInARow: 0,
                  }}
                />
              )
            })()}
          </div>
        )}

        {/* Empty / failed-load state */}
        {!loading && !stats && (
          <div className="card-console text-center px-6 py-16 animate-fade-up">
            <p className="text-(--text-muted) text-sm max-w-sm mx-auto">
              {error
                ? t('Unable to load your dashboard data.')
                : t('No dashboard data yet. Complete a test or analysis to get started.')}
            </p>
            <div className="mt-4 flex justify-center">
              <Button variant="primary" onClick={refresh} disabled={loading}>
                {t('Try Again')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
