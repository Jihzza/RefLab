import { forwardRef, useId, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from './utils'

export type ProgressBarSize = 'sm' | 'md' | 'lg'
export type ProgressBarTone = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

export interface ProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  value: number
  max?: number
  label?: ReactNode
  valueLabel?: string
  showValue?: boolean
  size?: ProgressBarSize
  tone?: ProgressBarTone
  indeterminate?: boolean
}

const sizeClasses: Record<ProgressBarSize, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
}

const toneClasses: Record<ProgressBarTone, string> = {
  accent: 'bg-(--mc-color-accent)',
  success: 'bg-(--mc-color-success)',
  warning: 'bg-(--mc-color-warning)',
  danger: 'bg-(--mc-color-danger)',
  info: 'bg-(--mc-color-info)',
  muted: 'bg-(--mc-color-text-muted)',
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(function ProgressBar(
  {
    'aria-describedby': ariaDescribedBy,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-valuetext': ariaValueText,
    className,
    indeterminate = false,
    label,
    max = 100,
    showValue = false,
    size = 'md',
    tone = 'accent',
    value,
    valueLabel,
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const labelId = label ? `progress-${generatedId}-label` : undefined
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), safeMax) : 0
  const percentage = (safeValue / safeMax) * 100
  const displayValue = valueLabel ?? `${Math.round(percentage)}%`

  return (
    <div ref={ref} className={cx('w-full', className)} {...props}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
          {label && <span id={labelId} className="font-medium text-(--mc-color-text-secondary)">{label}</span>}
          {showValue && <span className="ml-auto tabular-nums text-(--mc-color-text-muted)">{displayValue}</span>}
        </div>
      )}

      <div
        className={cx(
          'w-full overflow-hidden rounded-(--mc-radius-pill) bg-(--mc-color-surface-raised)',
          sizeClasses[size],
        )}
        role="progressbar"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : (ariaLabelledBy ?? labelId)}
        aria-describedby={ariaDescribedBy}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={indeterminate ? undefined : safeValue}
        aria-valuetext={indeterminate ? undefined : (ariaValueText ?? displayValue)}
        data-indeterminate={indeterminate || undefined}
      >
        <div
          className={cx(
            'h-full rounded-(--mc-radius-pill) transition-[width] duration-300 motion-reduce:transition-none',
            toneClasses[tone],
            indeterminate && 'w-1/2 animate-pulse motion-reduce:animate-none',
          )}
          style={indeterminate ? undefined : { width: `${percentage}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
})

ProgressBar.displayName = 'ProgressBar'

export default ProgressBar
