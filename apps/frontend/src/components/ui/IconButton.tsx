import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from './utils'

export type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type IconButtonSize = 'sm' | 'md' | 'lg'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  loading?: boolean
  children: ReactNode
}

const variantClasses: Record<IconButtonVariant, string> = {
  primary:
    'bg-(--mc-color-accent) text-(--mc-color-canvas) hover:bg-(--mc-color-accent-soft) active:brightness-95',
  secondary:
    'border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) text-(--mc-color-text-secondary) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)',
  ghost:
    'bg-transparent text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)',
  danger: 'bg-(--mc-color-danger) text-white hover:brightness-110 active:brightness-95',
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'size-9',
  md: 'size-11',
  lg: 'size-12',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    'aria-label': ariaLabel,
    children,
    className,
    disabled,
    label,
    loading = false,
    size = 'md',
    type = 'button',
    variant = 'ghost',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-(--mc-radius-button) transition-[background-color,border-color,color,box-shadow,filter,transform] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) focus-visible:ring-offset-2 focus-visible:ring-offset-(--mc-color-canvas)',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || loading}
      aria-label={ariaLabel ?? label}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      data-size={size}
      data-variant={variant}
      {...props}
    >
      {loading ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : (
        <span className="flex items-center justify-center" aria-hidden="true">{children}</span>
      )}
    </button>
  )
})

IconButton.displayName = 'IconButton'

export default IconButton
