import {
  forwardRef,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cx } from './utils'

export type SegmentedControlSize = 'sm' | 'md'

export interface SegmentedControlOption {
  value: string
  label: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

export interface SegmentedControlProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: readonly SegmentedControlOption[]
  value: string
  onValueChange: (value: string) => void
  ariaLabel: string
  size?: SegmentedControlSize
  disabled?: boolean
  fullWidth?: boolean
  optionClassName?: string
}

const sizeClasses: Record<SegmentedControlSize, string> = {
  sm: 'min-h-9 px-2.5 py-1.5 text-xs',
  md: 'min-h-11 px-3.5 py-2 text-sm',
}

export const SegmentedControl = forwardRef<HTMLDivElement, SegmentedControlProps>(
  function SegmentedControl(
    {
      ariaLabel,
      className,
      disabled = false,
      fullWidth = false,
      onValueChange,
      optionClassName,
      options,
      size = 'md',
      value,
      ...props
    },
    ref,
  ) {
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
    const enabledIndexes = options
      .map((option, index) => (option.disabled || disabled ? -1 : index))
      .filter((index) => index >= 0)
    const selectedIndex = options.findIndex(
      (option) => option.value === value && !option.disabled && !disabled,
    )
    const tabStopIndex = selectedIndex >= 0 ? selectedIndex : enabledIndexes[0]

    function selectIndex(index: number) {
      const option = options[index]
      if (!option || option.disabled || disabled) return
      optionRefs.current[index]?.focus()
      if (option.value !== value) onValueChange(option.value)
    }

    function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
      let targetIndex: number | undefined

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        const currentPosition = enabledIndexes.indexOf(index)
        const startPosition = currentPosition >= 0 ? currentPosition : 0
        targetIndex = enabledIndexes[
          (startPosition - 1 + enabledIndexes.length) % enabledIndexes.length
        ]
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        const currentPosition = enabledIndexes.indexOf(index)
        const startPosition = currentPosition >= 0 ? currentPosition : 0
        targetIndex = enabledIndexes[(startPosition + 1) % enabledIndexes.length]
      } else if (event.key === 'Home') {
        targetIndex = enabledIndexes[0]
      } else if (event.key === 'End') {
        targetIndex = enabledIndexes.at(-1)
      }

      if (targetIndex !== undefined) {
        event.preventDefault()
        selectIndex(targetIndex)
      }
    }

    return (
      <div
        ref={ref}
        role="radiogroup"
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        className={cx(
          'inline-flex gap-1 rounded-(--mc-radius-button) border border-(--mc-color-border) bg-(--mc-color-canvas) p-1',
          fullWidth && 'flex w-full',
          className,
        )}
        data-disabled={disabled || undefined}
        {...props}
      >
        {options.map((option, index) => {
          const selected = option.value === value
          const optionDisabled = disabled || option.disabled

          return (
            <button
              key={option.value}
              ref={(node) => {
                optionRefs.current[index] = node
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={optionDisabled}
              tabIndex={index === tabStopIndex ? 0 : -1}
              className={cx(
                'inline-flex items-center justify-center gap-2 rounded-[calc(var(--mc-radius-button)-0.25rem)] font-semibold transition-[background-color,color,box-shadow] duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none',
                selected
                  ? 'bg-(--mc-color-surface-raised) text-(--mc-color-accent) shadow-sm'
                  : 'text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)',
                fullWidth && 'flex-1',
                sizeClasses[size],
                optionClassName,
              )}
              onClick={() => selectIndex(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {option.icon && <span className="shrink-0" aria-hidden="true">{option.icon}</span>}
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>
    )
  },
)

SegmentedControl.displayName = 'SegmentedControl'

export default SegmentedControl
