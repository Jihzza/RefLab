import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from './utils'

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  children?: ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) text-(--mc-color-text-secondary)',
  accent: 'border-(--mc-color-accent)/35 bg-(--mc-color-accent)/15 text-(--mc-color-accent)',
  success: 'border-(--mc-color-success)/35 bg-(--mc-color-success)/15 text-(--mc-color-success)',
  warning: 'border-(--mc-color-warning)/35 bg-(--mc-color-warning)/15 text-(--mc-color-warning)',
  danger: 'border-(--mc-color-danger)/35 bg-(--mc-color-danger)/15 text-(--mc-color-danger)',
  info: 'border-(--mc-color-info)/35 bg-(--mc-color-info)/15 text-(--mc-color-info)',
}

const dotClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-(--mc-color-text-muted)',
  accent: 'bg-(--mc-color-accent)',
  success: 'bg-(--mc-color-success)',
  warning: 'bg-(--mc-color-warning)',
  danger: 'bg-(--mc-color-danger)',
  info: 'bg-(--mc-color-info)',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'min-h-5 gap-1 px-1.5 py-0.5 text-[10px]',
  md: 'min-h-6 gap-1.5 px-2 py-1 text-xs',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { children, className, dot = false, size = 'md', variant = 'neutral', ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cx(
        'inline-flex w-fit items-center justify-center rounded-(--mc-radius-pill) border font-semibold leading-none',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      data-size={size}
      data-variant={variant}
      {...props}
    >
      {dot && <span className={cx('size-1.5 shrink-0 rounded-full', dotClasses[variant])} aria-hidden="true" />}
      {children}
    </span>
  )
})

Badge.displayName = 'Badge'

export default Badge
