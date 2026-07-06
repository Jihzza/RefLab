import { useTranslation } from 'react-i18next'

/**
 * DashboardSkeleton — Loading placeholder that mirrors the dashboard layout.
 * Uses the shimmer `skeleton` utility on console-shaped panels while data loads.
 */
export default function DashboardSkeleton() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6" aria-busy="true" aria-label={t('Loading dashboard')}>
      {/* Performance section */}
      <div className="space-y-4">
        <div className="skeleton h-3 w-28 rounded" />
        {/* Hero accuracy */}
        <div className="skeleton rounded-(--radius-card) h-40" />
        {/* Topic accuracy */}
        <div className="skeleton rounded-(--radius-card) h-44" />
        {/* Match Sim + Pass Rate */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="skeleton rounded-(--radius-card) h-32" />
          <div className="skeleton rounded-(--radius-card) h-32" />
        </div>
      </div>

      {/* Progress section */}
      <div className="space-y-4">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="skeleton rounded-(--radius-card) h-28" />
          <div className="skeleton rounded-(--radius-card) h-28" />
          <div className="skeleton rounded-(--radius-card) h-28" />
          <div className="skeleton rounded-(--radius-card) h-28" />
          <div className="skeleton rounded-(--radius-card) h-28" />
          <div className="skeleton rounded-(--radius-card) h-28" />
        </div>
        <div className="skeleton rounded-(--radius-button) h-12" />
      </div>

      {/* Habits section */}
      <div className="space-y-4">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton rounded-(--radius-card) h-48" />
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="skeleton rounded-(--radius-card) h-24" />
          <div className="skeleton rounded-(--radius-card) h-24" />
          <div className="skeleton rounded-(--radius-card) h-24" />
        </div>
      </div>
    </div>
  )
}
