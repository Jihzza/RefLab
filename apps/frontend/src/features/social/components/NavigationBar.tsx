import { useRef, type KeyboardEvent } from 'react'
import type { FeedFilter } from '../types'
import { useTranslation } from 'react-i18next'

interface NavigationBarProps {
  filter: FeedFilter
  onFilterChange: (filter: FeedFilter) => void
  disabled?: boolean
}

/** Horizontal filter tabs for the social feed. */
export default function NavigationBar({
  filter,
  onFilterChange,
  disabled = false,
}: NavigationBarProps) {
  const { t } = useTranslation()
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const filters: { label: string; value: FeedFilter }[] = [
    { label: t('All'), value: 'all' },
    { label: t('Text'), value: 'text' },
    { label: t('Image'), value: 'image' },
    { label: t('Video'), value: 'video' },
    { label: t('Audio'), value: 'audio' },
  ]

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % filters.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + filters.length) % filters.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = filters.length - 1
    if (nextIndex === null) return

    event.preventDefault()
    const nextFilter = filters[nextIndex]
    tabRefs.current[nextIndex]?.focus()
    if (!disabled && nextFilter) onFilterChange(nextFilter.value)
  }

  return (
    <nav
      className="border-b border-(--mc-color-border)"
      aria-label={t('Feed filter')}
    >
      <div
        role="tablist"
        className="no-scrollbar flex min-w-0 items-stretch gap-1 overflow-x-auto"
      >
        {filters.map(({ label, value }, index) => {
          const isActive = filter === value
          return (
            <button
              key={value}
              ref={(node) => {
                tabRefs.current[index] = node
              }}
              id={`community-filter-${value}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="community-feed"
              aria-disabled={disabled || undefined}
              tabIndex={isActive ? 0 : -1}
              onClick={() => {
                if (!disabled) onFilterChange(value)
              }}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`relative min-h-12 shrink-0 px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--mc-color-focus) motion-reduce:transition-none sm:flex-1 sm:px-4 ${
                isActive
                  ? 'text-(--mc-color-accent) after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-(--mc-color-accent)'
                  : 'text-(--mc-color-text-muted) hover:text-(--mc-color-text-secondary)'
              } ${disabled ? 'cursor-wait opacity-60' : ''}`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
