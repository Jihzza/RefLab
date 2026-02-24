import React from 'react'
import type { FeedFilter } from '../types'
import { useTranslation } from 'react-i18next'

interface NavigationBarProps {
  filter: FeedFilter
  onFilterChange: (filter: FeedFilter) => void
}

/** Horizontal filter tabs for the social feed. */
const NavigationBar: React.FC<NavigationBarProps> = ({
  filter,
  onFilterChange,
}) => {
  const { t } = useTranslation()
  const filters: { label: string; value: FeedFilter }[] = [
    { label: t('All'), value: 'all' },
    { label: t('Text'), value: 'text' },
    { label: t('Image'), value: 'image' },
    { label: t('Video'), value: 'video' },
    { label: t('Audio'), value: 'audio' },
  ]

  return (
    <nav
      className="sticky top-0 z-10 bg-(--bg-surface) border-b border-(--border-subtle)"
      aria-label={t('Feed filter')}
    >
      <div className="flex justify-center overflow-x-auto no-scrollbar">
        {filters.map(({ label, value }) => {
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
