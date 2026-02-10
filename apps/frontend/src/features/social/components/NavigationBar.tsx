import React from 'react'
import type { FeedFilter } from '../types'

interface NavigationBarProps {
  filter: FeedFilter
  onFilterChange: (filter: FeedFilter) => void
}

const FILTERS: { label: string; value: FeedFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Text', value: 'text' },
  { label: 'Image', value: 'image' },
  { label: 'Video', value: 'video' },
  { label: 'Audio', value: 'audio' },
]

/** Horizontal filter tabs for the social feed. */
const NavigationBar: React.FC<NavigationBarProps> = ({
  filter,
  onFilterChange,
}) => {
  return (
    <nav
      className="sticky top-0 z-10 bg-(--bg-surface) border-b border-(--border-subtle)"
      aria-label="Feed filter"
    >
      <div className="flex justify-center overflow-x-auto no-scrollbar">
        {FILTERS.map(({ label, value }) => {
          const isActive = filter === value
          return (
            <button
              key={value}
              onClick={() => onFilterChange(value)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                isActive
                  ? 'text-(--brand-yellow) border-(--brand-yellow)'
                  : 'text-(--text-muted) border-transparent hover:text-(--text-secondary)'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default NavigationBar
