import { useTranslation } from 'react-i18next'
import { SegmentedControl } from '@/components/ui'
import type { FeedFilter } from '../types'

interface NavigationBarProps {
  filter: FeedFilter
  onFilterChange: (filter: FeedFilter) => void
}

export default function NavigationBar({ filter, onFilterChange }: NavigationBarProps) {
  const { t } = useTranslation()
  const filters: { label: string; value: FeedFilter }[] = [
    { label: t('All'), value: 'all' },
    { label: t('Text'), value: 'text' },
    { label: t('Image'), value: 'image' },
    { label: t('Video'), value: 'video' },
    { label: t('Audio'), value: 'audio' },
  ]

  return (
    <div className="mx-auto max-w-[var(--mc-content-narrow)] overflow-x-auto px-3 sm:px-4">
      <SegmentedControl
        ariaLabel={t('Feed filter')}
        value={filter}
        onValueChange={(value) => onFilterChange(value as FeedFilter)}
        options={filters}
        size="sm"
        fullWidth
        className="min-w-[21rem] shadow-none"
        optionClassName="min-h-10"
      />
    </div>
  )
}
