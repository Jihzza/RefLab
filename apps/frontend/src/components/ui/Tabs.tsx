import {
  forwardRef,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cx } from './utils'

export type TabsOrientation = 'horizontal' | 'vertical'
export type TabsActivationMode = 'automatic' | 'manual'

export interface TabItem {
  value: string
  label: ReactNode
  content: ReactNode
  disabled?: boolean
  icon?: ReactNode
}

export interface TabsProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  items: readonly TabItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  ariaLabel: string
  orientation?: TabsOrientation
  activationMode?: TabsActivationMode
  keepMounted?: boolean
  listClassName?: string
  tabClassName?: string
  panelClassName?: string
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    activationMode = 'automatic',
    ariaLabel,
    className,
    defaultValue,
    items,
    keepMounted = true,
    listClassName,
    onValueChange,
    orientation = 'horizontal',
    panelClassName,
    tabClassName,
    value,
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const firstEnabledValue = items.find((item) => !item.disabled)?.value
  const [internalValue, setInternalValue] = useState(defaultValue ?? firstEnabledValue)
  const candidateValue = value ?? internalValue
  const activeValue = items.some(
    (item) => item.value === candidateValue && !item.disabled,
  )
    ? candidateValue
    : firstEnabledValue
  const [focusedValue, setFocusedValue] = useState(activeValue)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const enabledIndexes = items
    .map((item, index) => (item.disabled ? -1 : index))
    .filter((index) => index >= 0)
  const rovingValue = items.some(
    (item) => item.value === focusedValue && !item.disabled,
  )
    ? focusedValue
    : activeValue

  function selectValue(nextValue: string) {
    const nextItem = items.find((item) => item.value === nextValue)
    if (!nextItem || nextItem.disabled || nextValue === activeValue) return
    if (value === undefined) setInternalValue(nextValue)
    onValueChange?.(nextValue)
  }

  function moveFocus(currentIndex: number, direction: 1 | -1) {
    if (enabledIndexes.length === 0) return
    const currentPosition = enabledIndexes.indexOf(currentIndex)
    const startPosition = currentPosition >= 0 ? currentPosition : 0
    const nextPosition = (startPosition + direction + enabledIndexes.length) % enabledIndexes.length
    const nextIndex = enabledIndexes[nextPosition]
    const nextItem = nextIndex === undefined ? undefined : items[nextIndex]
    if (nextIndex === undefined || !nextItem) return

    tabRefs.current[nextIndex]?.focus()
    setFocusedValue(nextItem.value)
    if (activationMode === 'automatic') selectValue(nextItem.value)
  }

  function focusBoundary(boundary: 'first' | 'last') {
    const targetIndex = boundary === 'first' ? enabledIndexes[0] : enabledIndexes.at(-1)
    const targetItem = targetIndex === undefined ? undefined : items[targetIndex]
    if (targetIndex === undefined || !targetItem) return

    tabRefs.current[targetIndex]?.focus()
    setFocusedValue(targetItem.value)
    if (activationMode === 'automatic') selectValue(targetItem.value)
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const previousKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
    const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown'

    if (event.key === previousKey || event.key === nextKey) {
      event.preventDefault()
      moveFocus(index, event.key === nextKey ? 1 : -1)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      focusBoundary(event.key === 'Home' ? 'first' : 'last')
    } else if (
      activationMode === 'manual' &&
      (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault()
      const item = items[index]
      if (item) selectValue(item.value)
    }
  }

  return (
    <div
      ref={ref}
      className={cx(
        orientation === 'vertical' ? 'flex min-w-0 gap-4' : 'min-w-0',
        className,
      )}
      data-orientation={orientation}
      {...props}
    >
      <div
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation={orientation}
        className={cx(
          'flex gap-1 rounded-(--mc-radius-button) border border-(--mc-color-border) bg-(--mc-color-canvas) p-1',
          orientation === 'vertical'
            ? 'w-fit shrink-0 flex-col self-start'
            : 'w-full overflow-x-auto',
          listClassName,
        )}
      >
        {items.map((item, index) => {
          const selected = item.value === activeValue
          const tabId = `tabs-${generatedId}-tab-${index}`
          const panelId = `tabs-${generatedId}-panel-${index}`

          return (
            <button
              key={item.value}
              ref={(node) => {
                tabRefs.current[index] = node
              }}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              disabled={item.disabled}
              tabIndex={item.value === rovingValue ? 0 : -1}
              className={cx(
                'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[calc(var(--mc-radius-button)-0.25rem)] px-3 py-2 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none',
                selected
                  ? 'bg-(--mc-color-accent) text-(--mc-color-canvas) shadow-sm'
                  : 'text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)',
                tabClassName,
              )}
              onClick={() => selectValue(item.value)}
              onFocus={() => setFocusedValue(item.value)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {item.icon && <span className="shrink-0" aria-hidden="true">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      <div className={cx(orientation === 'vertical' && 'min-w-0 flex-1')}>
        {items.map((item, index) => {
          const selected = item.value === activeValue
          if (!keepMounted && !selected) return null

          return (
            <div
              key={item.value}
              id={`tabs-${generatedId}-panel-${index}`}
              role="tabpanel"
              aria-labelledby={`tabs-${generatedId}-tab-${index}`}
              tabIndex={0}
              hidden={!selected}
              className={cx(
                orientation === 'horizontal' && 'mt-4',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus)',
                panelClassName,
              )}
            >
              {item.content}
            </div>
          )
        })}
      </div>
    </div>
  )
})

Tabs.displayName = 'Tabs'

export default Tabs
