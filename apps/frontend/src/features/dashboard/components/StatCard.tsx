import type { ReactNode } from 'react'

interface StatCardProps {
  /** Card title displayed as uppercase label */
  label: string
  /** The main metric value (null triggers empty state) */
  value: number | string | null
  /** Text appended after value (e.g. "%", "days") */
  suffix?: string
  /** Small description text below the value */
  subtext?: string
  /** Whether to render a progress bar below the value */
  showBar?: boolean
  /** 0-100 percent for the progress bar fill */
  barPercent?: number
  /** Message shown when value is null */
  emptyText?: string
  /** Optional icon for the empty state */
  emptyIcon?: ReactNode
  /** Optional color class for the value (defaults to brand-yellow) */
  valueColor?: string
  /** Additional CSS classes for the container */
  className?: string
}

/**
 * StatCard — Reusable metric card with big number, optional progress bar,
 * and empty state handling. Used across all dashboard sections.
 */
export default function StatCard({
  label,
  value,
  suffix = '',
  subtext,
  showBar = false,
  barPercent = 0,
  emptyText = 'No data yet',
  emptyIcon,
  valueColor = 'text-(--brand-yellow)',
  className = '',
}: StatCardProps) {
  const hasValue = value !== null

  return (
    <div
      className={`bg-(--bg-surface) rounded-2xl p-4 shadow-sm border border-(--border-subtle) flex flex-col ${className}`}
      role="region"
      aria-label={label}
    >
      {/* Label */}
      <h3 className="text-[11px] font-bold text-(--text-secondary) uppercase tracking-wider mb-2">
        {label}
      </h3>

      {hasValue ? (
        <>
          {/* Value */}
          <div className="flex-1 flex items-center justify-center py-1">
            <span className={`text-3xl font-extrabold tracking-tight ${valueColor}`}>
              {value}
            </span>
            {suffix && (
              <span className="text-lg font-medium text-(--text-muted) ml-0.5">
                {suffix}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {showBar && (
            <div
              className="w-full bg-(--bg-surface-2) h-1.5 rounded-full mt-2 overflow-hidden"
              role="progressbar"
              aria-valuenow={barPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${label}: ${barPercent}%`}
            >
              <div
                className="bg-(--brand-yellow) h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(barPercent, 100)}%` }}
              />
            </div>
          )}

          {/* Subtext */}
          {subtext && (
            <p className="text-[10px] text-(--text-muted) mt-2 text-center">
              {subtext}
            </p>
          )}
        </>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center py-3 text-center">
          {emptyIcon && (
            <span className="text-(--text-muted) mb-1.5" aria-hidden="true">
              {emptyIcon}
            </span>
          )}
          <p className="text-xs text-(--text-muted)">{emptyText}</p>
        </div>
      )}
    </div>
  )
}
