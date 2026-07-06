import type { ReactNode } from 'react'
import { accuracyColor } from './accuracyColor'

interface StatCardProps {
  /** Card title displayed as an uppercase eyebrow label */
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
  /** Color the value + bar by referee accuracy semantics (green/yellow/red) */
  accent?: boolean
  /** Optional leading icon shown beside the label */
  icon?: ReactNode
  /** Message shown when value is null */
  emptyText?: string
  /** Optional icon for the empty state */
  emptyIcon?: ReactNode
  /** Optional color class for the value (defaults to primary text) */
  valueColor?: string
  /** Additional CSS classes for the container */
  className?: string
}

/**
 * StatCard — Reusable metric card with a big tabular numeral, optional
 * progress bar, and empty-state handling. Used across all dashboard sections.
 * When `accent` is set, the value and bar adopt referee color semantics.
 */
export default function StatCard({
  label,
  value,
  suffix = '',
  subtext,
  showBar = false,
  barPercent = 0,
  accent = false,
  icon,
  emptyText = 'No data yet',
  emptyIcon,
  valueColor = 'text-(--text-primary)',
  className = '',
}: StatCardProps) {
  const hasValue = value !== null
  const semanticColor = accent ? accuracyColor(barPercent) : undefined

  return (
    <div
      className={`card-console p-4 flex flex-col ${className}`}
      role="region"
      aria-label={label}
    >
      {/* Label */}
      <div className="flex items-center gap-1.5 mb-2">
        {icon && (
          <span className="text-(--text-faint)" aria-hidden="true">
            {icon}
          </span>
        )}
        <h3 className="eyebrow">{label}</h3>
      </div>

      {hasValue ? (
        <>
          {/* Value */}
          <div className="flex-1 flex items-end gap-0.5 py-1">
            <span
              className={`numeral text-4xl font-black leading-none tracking-tight ${semanticColor ? '' : valueColor}`}
              style={semanticColor ? { color: semanticColor } : undefined}
            >
              {value}
            </span>
            {suffix && (
              <span className="numeral text-base font-bold text-(--text-faint) mb-0.5">
                {suffix}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {showBar && (
            <div
              className="w-full bg-(--bg-surface-2) h-2 rounded-full mt-2.5 overflow-hidden"
              role="progressbar"
              aria-valuenow={barPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${label}: ${barPercent}%`}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(barPercent, 100)}%`,
                  backgroundColor: semanticColor ?? 'var(--brand-yellow)',
                }}
              />
            </div>
          )}

          {/* Subtext */}
          {subtext && (
            <p className="text-[11px] text-(--text-muted) mt-2">{subtext}</p>
          )}
        </>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center py-4 text-center">
          {emptyIcon && (
            <span className="text-(--text-faint) mb-1.5" aria-hidden="true">
              {emptyIcon}
            </span>
          )}
          <p className="text-xs text-(--text-muted)">{emptyText}</p>
        </div>
      )}
    </div>
  )
}
