import { LayoutDashboard, AlertCircle } from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import DashboardSkeleton from './DashboardSkeleton'
import PerformanceSection from './PerformanceSection'
import ProgressSection from './ProgressSection'
import HabitsSection from './HabitsSection'
import { useTranslation } from 'react-i18next'

/**
 * DashboardPage — Main dashboard view for authenticated users.
 * Single scrollable page with Performance, Progress, and Habits sections.
 * Data is fetched via a single RPC call through the useDashboard hook.
 */
export default function DashboardPage() {
  const { t } = useTranslation()
  const { stats, loading, error } = useDashboard()

  return (
    <div className="min-h-screen bg-(--bg-primary) pb-24">
      {/* Visual separation from header */}
      <div className="w-full h-px bg-(--border-subtle) mb-4" role="presentation" />

      <div className="px-4 space-y-6 max-w-3xl mx-auto">
        {/* Page header */}
        <div className="flex items-center gap-2">
          <LayoutDashboard size={22} className="text-(--brand-yellow)" aria-hidden="true" />
          <h1 className="text-xl font-bold text-(--text-primary)">{t('Dashboard')}</h1>
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="flex items-center gap-2 p-3 bg-(--error)/10 border border-(--error)/30 rounded-xl"
            role="alert"
          >
            <AlertCircle size={16} className="text-(--error) shrink-0" aria-hidden="true" />
            <p className="text-sm text-(--error)">
              {t('Failed to load dashboard data. Please try again later.')}
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && <DashboardSkeleton />}

        {/* Dashboard sections */}
        {!loading && stats && (
          <>
            <PerformanceSection performance={stats.performance} />
            <ProgressSection progress={stats.progress} />
            <HabitsSection habits={stats.habits} />
          </>
        )}
      </div>
    </div>
  )
}
