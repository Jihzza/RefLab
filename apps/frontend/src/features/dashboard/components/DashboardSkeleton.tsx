/**
 * DashboardSkeleton — Loading placeholder that mirrors the dashboard layout.
 * Shows animated pulse blocks for each section while data loads.
 */
export default function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      {/* Performance section */}
      <div className="space-y-4">
        <div className="h-5 w-32 bg-(--bg-surface-2) rounded animate-pulse" />
        {/* Overall Accuracy */}
        <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-2xl h-32 animate-pulse" />
        {/* Topic Accuracy */}
        <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-2xl h-44 animate-pulse" />
        {/* Match Sim + Pass Rate */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-2xl h-28 animate-pulse" />
          <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-2xl h-28 animate-pulse" />
        </div>
      </div>

      {/* Progress section */}
      <div className="space-y-4">
        <div className="h-5 w-24 bg-(--bg-surface-2) rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-2xl h-28 animate-pulse" />
          <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-2xl h-28 animate-pulse" />
        </div>
        <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-2xl h-28 animate-pulse" />
      </div>

      {/* Habits section */}
      <div className="space-y-4">
        <div className="h-5 w-20 bg-(--bg-surface-2) rounded animate-pulse" />
        <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-2xl h-40 animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-2xl h-24 animate-pulse" />
          <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-2xl h-24 animate-pulse" />
          <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-2xl h-24 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
