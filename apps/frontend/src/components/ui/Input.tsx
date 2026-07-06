import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  /** Optional node rendered on the right (e.g. a show/hide toggle). */
  rightSlot?: ReactNode
}

/**
 * Shared text input for the RefLab design system.
 * Label + error + hint wiring, icon slot, and a yellow focus glow. Falls back to
 * a generated id so the label is always associated.
 */
export default function Input({
  label,
  error,
  hint,
  leftIcon,
  rightSlot,
  id,
  className = '',
  disabled,
  ...rest
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-(--text-secondary)"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted)"
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={[
            'w-full h-11 rounded-(--radius-input) outline-none',
            'bg-(--bg-surface-2) text-(--text-primary) placeholder-(--text-faint)',
            'border transition-[border-color,box-shadow] duration-150',
            leftIcon ? 'pl-10 pr-3.5' : 'px-3.5',
            error
              ? 'border-(--error) focus:border-(--error) focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]'
              : 'border-(--border-subtle) focus:border-(--brand-yellow) focus:shadow-[0_0_0_3px_rgba(246,194,28,0.16)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className,
          ].join(' ')}
          {...rest}
        />
        {rightSlot && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</span>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-(--error)">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-(--text-muted)">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
