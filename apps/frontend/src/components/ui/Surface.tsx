import { forwardRef, type HTMLAttributes } from 'react'
import { cx } from './utils'

export type SurfaceVariant = 'default' | 'raised' | 'inset' | 'transparent'
export type SurfacePadding = 'none' | 'sm' | 'md' | 'lg'

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant
  padding?: SurfacePadding
  selected?: boolean
}

const variantClasses: Record<SurfaceVariant, string> = {
  default: 'border border-(--mc-color-border) bg-(--mc-color-surface) shadow-(--mc-shadow-soft)',
  raised: 'border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) shadow-(--mc-shadow-raised)',
  inset: 'border border-(--mc-color-border) bg-(--mc-color-canvas)',
  transparent: 'border border-transparent bg-transparent',
}

const paddingClasses: Record<SurfacePadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  {
    className,
    padding = 'md',
    selected = false,
    variant = 'default',
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx(
        'rounded-(--mc-radius-card)',
        variantClasses[variant],
        paddingClasses[padding],
        selected && 'border-(--mc-color-accent) ring-1 ring-(--mc-color-accent)/30',
        className,
      )}
      data-selected={selected || undefined}
      data-variant={variant}
      {...props}
    />
  )
})

Surface.displayName = 'Surface'

export default Surface
