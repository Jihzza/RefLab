import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from './utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  loadingText?: ReactNode
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-(--mc-color-accent) text-(--mc-color-canvas) hover:bg-(--mc-color-accent-soft) active:brightness-95',
  secondary:
    'border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) text-(--mc-color-text) hover:border-(--mc-color-accent)/50 hover:bg-(--mc-color-surface-hover)',
  ghost:
    'bg-transparent text-(--mc-color-text-secondary) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)',
  danger: 'bg-(--mc-color-danger) text-white hover:brightness-110 active:brightness-95',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-xs',
  md: 'min-h-11 px-4 py-2.5 text-sm',
  lg: 'min-h-12 px-6 py-3 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    disabled,
    fullWidth = false,
    leadingIcon,
    loading = false,
    loadingText,
    size = 'md',
    trailingIcon,
    type = 'button',
    variant = 'primary',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-(--mc-radius-button) font-semibold transition-[background-color,border-color,color,box-shadow,filter,transform] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) focus-visible:ring-offset-2 focus-visible:ring-offset-(--mc-color-canvas)',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      data-size={size}
      data-variant={variant}
      {...props}
    >
      {loading ? (
        <span
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : (
        leadingIcon && <span className="shrink-0" aria-hidden="true">{leadingIcon}</span>
      )}
      <span>{loading ? (loadingText ?? children) : children}</span>
      {!loading && trailingIcon && (
        <span className="shrink-0" aria-hidden="true">{trailingIcon}</span>
      )}
    </button>
  )
})

Button.displayName = 'Button'

export default Button
