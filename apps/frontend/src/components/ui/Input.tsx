import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { cx } from './utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  startAdornment?: ReactNode
  endAdornment?: ReactNode
  containerClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    className,
    containerClassName,
    disabled,
    endAdornment,
    error,
    hint,
    id,
    label,
    required,
    startAdornment,
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? `input-${generatedId}`
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const invalid = Boolean(error) || (
    ariaInvalid !== undefined && ariaInvalid !== false && ariaInvalid !== 'false'
  )
  const describedBy = [ariaDescribedBy, hintId, invalid ? errorId : undefined]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div className={cx('w-full', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-(--mc-color-text-secondary)"
        >
          {label}
          {required && <span className="ml-1 text-(--mc-color-danger)" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative">
        {startAdornment && (
          <span
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-(--mc-color-text-muted)"
            aria-hidden="true"
          >
            {startAdornment}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={invalid || ariaInvalid || undefined}
          aria-describedby={describedBy}
          className={cx(
            'min-h-11 w-full rounded-(--mc-radius-input) border bg-(--mc-color-surface-raised) px-3 py-2.5 text-sm text-(--mc-color-text) shadow-sm transition-[background-color,border-color,box-shadow] duration-150',
            'placeholder:text-(--mc-color-text-muted) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) focus-visible:ring-offset-1 focus-visible:ring-offset-(--mc-color-canvas)',
            'disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
            invalid ? 'border-(--mc-color-danger)' : 'border-(--mc-color-border) hover:border-(--mc-color-border-strong)',
            Boolean(startAdornment) && 'pl-10',
            Boolean(endAdornment) && 'pr-10',
            className,
          )}
          {...props}
        />

        {endAdornment && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-(--mc-color-text-muted)">
            {endAdornment}
          </span>
        )}
      </div>

      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-(--mc-color-text-muted)">
          {hint}
        </p>
      )}

      {invalid && error && (
        <p id={errorId} className="mt-1.5 text-xs text-(--mc-color-danger)" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
