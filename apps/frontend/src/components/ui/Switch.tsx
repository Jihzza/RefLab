import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { cx } from './utils'

export type SwitchSize = 'sm' | 'md'
export type SwitchLabelPosition = 'start' | 'end'

export interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value'> {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: ReactNode
  description?: ReactNode
  size?: SwitchSize
  labelPosition?: SwitchLabelPosition
  containerClassName?: string
}

const trackSizeClasses: Record<SwitchSize, string> = {
  sm: 'h-5 w-9',
  md: 'h-6 w-11',
}

const thumbSizeClasses: Record<SwitchSize, string> = {
  sm: 'size-4',
  md: 'size-5',
}

const checkedTranslateClasses: Record<SwitchSize, string> = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    'aria-describedby': ariaDescribedBy,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    checked,
    className,
    containerClassName,
    description,
    disabled,
    id,
    label,
    labelPosition = 'end',
    onCheckedChange,
    onClick,
    size = 'md',
    type = 'button',
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const switchId = id ?? `switch-${generatedId}`
  const labelId = label ? `${switchId}-label` : undefined
  const descriptionId = description ? `${switchId}-description` : undefined
  const resolvedDescriptionIds = [ariaDescribedBy, descriptionId].filter(Boolean).join(' ') || undefined

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event)
    if (!event.defaultPrevented && !disabled) onCheckedChange(!checked)
  }

  const control = (
    <button
      ref={ref}
      id={switchId}
      type={type}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : (ariaLabelledBy ?? labelId)}
      aria-describedby={resolvedDescriptionIds}
      disabled={disabled}
      className={cx(
        'relative inline-flex shrink-0 items-center rounded-(--mc-radius-pill) border transition-[background-color,border-color,box-shadow] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) focus-visible:ring-offset-2 focus-visible:ring-offset-(--mc-color-canvas)',
        'disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
        checked
          ? 'border-(--mc-color-accent) bg-(--mc-color-accent)'
          : 'border-(--mc-color-border-strong) bg-(--mc-color-surface-raised)',
        trackSizeClasses[size],
        className,
      )}
      onClick={handleClick}
      data-state={checked ? 'checked' : 'unchecked'}
      {...props}
    >
      <span
        className={cx(
          'pointer-events-none translate-x-0.5 rounded-full bg-(--mc-color-canvas) shadow-sm transition-transform duration-150 motion-reduce:transition-none',
          thumbSizeClasses[size],
          checked && checkedTranslateClasses[size],
        )}
        aria-hidden="true"
      />
    </button>
  )

  if (!label && !description) return control

  return (
    <div
      className={cx(
        'flex items-start gap-3',
        labelPosition === 'start' && 'justify-between',
        containerClassName,
      )}
    >
      {labelPosition === 'end' && control}
      <div className="min-w-0 flex-1">
        {label && (
          <label
            id={labelId}
            htmlFor={switchId}
            className="block cursor-pointer text-sm font-medium text-(--mc-color-text)"
          >
            {label}
          </label>
        )}
        {description && (
          <p id={descriptionId} className="mt-0.5 text-xs leading-5 text-(--mc-color-text-muted)">
            {description}
          </p>
        )}
      </div>
      {labelPosition === 'start' && control}
    </div>
  )
})

Switch.displayName = 'Switch'

export default Switch
