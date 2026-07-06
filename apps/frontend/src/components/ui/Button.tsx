import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'text-(--bg-primary) font-bold shadow-[0_8px_24px_-8px_rgba(246,194,28,0.5)] hover:brightness-105 hover:shadow-[0_10px_30px_-6px_rgba(246,194,28,0.6)]',
  secondary:
    'bg-(--bg-surface-2) text-(--text-primary) font-semibold border border-(--border-subtle) hover:bg-(--bg-elevated) hover:border-(--border-strong)',
  ghost:
    'bg-transparent text-(--text-secondary) font-medium hover:bg-(--bg-hover) hover:text-(--text-primary)',
  outline:
    'bg-transparent text-(--text-primary) font-semibold border border-(--border-strong) hover:bg-(--bg-surface-2)',
  danger:
    'bg-(--error) text-white font-bold hover:brightness-110',
}

/**
 * Shared button primitive for the RefLab design system.
 * Primary uses the brand gradient + glow; all variants share consistent sizing,
 * focus (global :focus-visible), disabled, and loading states.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <button
      type={type}
      disabled={isDisabled}
      style={variant === 'primary' ? { backgroundImage: 'var(--grad-brand)' } : undefined}
      className={[
        'inline-flex items-center justify-center rounded-(--radius-button)',
        'transition-[transform,filter,background-color,box-shadow,border-color] duration-150',
        'active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        SIZES[size],
        VARIANTS[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  )
}
