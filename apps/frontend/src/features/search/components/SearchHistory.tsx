import { Clock3, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, Surface } from '@/components/ui'
import type { SearchHistoryEntry } from '../types'
import SearchResultItem from './SearchResultItem'

interface SearchHistoryProps {
  history: SearchHistoryEntry[]
  onSelect: (entry: SearchHistoryEntry) => void
  onRemove: (userId: string) => void
  onClearAll: () => void
}

export default function SearchHistory({
  history,
  onSelect,
  onRemove,
  onClearAll,
}: SearchHistoryProps) {
  const { t } = useTranslation()

  if (history.length === 0) {
    return (
      <Surface padding="none">
        <EmptyState
          icon={<Search className="size-6" />}
          title={t('Search the community')}
          description={t('Profiles you visit will appear here for quick access.')}
        />
      </Surface>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-(--mc-color-text-secondary)">
          <Clock3 className="size-4 text-(--mc-color-accent)" aria-hidden="true" />
          {t('Recent')}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClearAll}>{t('Clear all')}</Button>
      </div>
      <div className="space-y-3" role="list" aria-label={t('Recent searches')}>
        {history.map((entry) => (
          <SearchResultItem
            key={entry.id}
            user={entry}
            onClick={() => onSelect(entry)}
            onRemove={() => onRemove(entry.id)}
          />
        ))}
      </div>
    </div>
  )
}
