import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from './utils'

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  compact?: boolean
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { action, className, compact = false, description, icon, title, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx(
        'flex w-full flex-col items-center justify-center text-center',
        compact ? 'px-4 py-6' : 'px-6 py-12',
        className,
      )}
      {...props}
    >
      {icon && (
        <div
          className="mb-4 flex size-12 items-center justify-center rounded-(--mc-radius-button) border border-(--mc-color-border) bg-(--mc-color-surface-raised) text-(--mc-color-accent)"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h2 className="text-base font-semibold text-(--mc-color-text)">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-(--mc-color-text-muted)">{description}</p>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  )
})

EmptyState.displayName = 'EmptyState'

export default EmptyState
