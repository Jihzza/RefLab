import {
  forwardRef,
  useId,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { cx } from './utils'

export type TextAreaResize = 'none' | 'vertical' | 'horizontal' | 'both'

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  resize?: TextAreaResize
  containerClassName?: string
}

const resizeClasses: Record<TextAreaResize, string> = {
  none: 'resize-none',
  vertical: 'resize-y',
  horizontal: 'resize-x',
  both: 'resize',
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  {
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    className,
    containerClassName,
    disabled,
    error,
    hint,
    id,
    label,
    required,
    resize = 'vertical',
    rows = 4,
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const textAreaId = id ?? `textarea-${generatedId}`
  const hintId = hint ? `${textAreaId}-hint` : undefined
  const errorId = error ? `${textAreaId}-error` : undefined
  const hasError = Boolean(error)
  const invalid = hasError || (
    ariaInvalid !== undefined && ariaInvalid !== false && ariaInvalid !== 'false'
  )
  const describedBy = [ariaDescribedBy, hintId, hasError ? errorId : undefined]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div className={cx('w-full', containerClassName)}>
      {label && (
        <label
          htmlFor={textAreaId}
          className="mb-1.5 block text-sm font-medium text-(--mc-color-text-secondary)"
        >
          {label}
          {required && (
            <span className="ml-1 text-(--mc-color-danger)" aria-hidden="true">*</span>
          )}
        </label>
      )}

      <textarea
        ref={ref}
        id={textAreaId}
        rows={rows}
        disabled={disabled}
        required={required}
        aria-invalid={invalid || ariaInvalid || undefined}
        aria-describedby={describedBy}
        className={cx(
          'min-h-24 w-full rounded-(--mc-radius-input) border bg-(--mc-color-surface-raised) px-3 py-2.5 text-sm leading-6 text-(--mc-color-text) shadow-sm transition-[background-color,border-color,box-shadow] duration-150',
          'placeholder:text-(--mc-color-text-muted) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) focus-visible:ring-offset-1 focus-visible:ring-offset-(--mc-color-canvas)',
          'disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
          invalid
            ? 'border-(--mc-color-danger)'
            : 'border-(--mc-color-border) hover:border-(--mc-color-border-strong)',
          resizeClasses[resize],
          className,
        )}
        {...props}
      />

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

TextArea.displayName = 'TextArea'

export default TextArea
