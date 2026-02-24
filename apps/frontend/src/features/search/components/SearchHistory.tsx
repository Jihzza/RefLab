import type { SearchHistoryEntry } from '../types'
import SearchResultItem from './SearchResultItem'
import { useTranslation } from 'react-i18next'

interface SearchHistoryProps {
  history: SearchHistoryEntry[]
  onSelect: (entry: SearchHistoryEntry) => void
  onRemove: (userId: string) => void
  onClearAll: () => void
}

/**
 * Displays recently visited profiles with "Clear all" and per-item remove.
 * Returns null when history is empty.
 */
export default function SearchHistory({
  history,
  onSelect,
  onRemove,
  onClearAll,
}: SearchHistoryProps) {
  const { t } = useTranslation()
  if (history.length === 0) return null

  return (
    <div>
      {/* Header: "Recent" label + "Clear all" action */}
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-sm font-semibold text-(--text-secondary)">{t('Recent')}</h2>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-(--brand-yellow) hover:text-(--brand-yellow-soft) transition-colors cursor-pointer"
          aria-label={t('Clear all search history')}
        >
          {t('Clear all')}
        </button>
      </div>

      {/* History entries */}
      {history.map(entry => (
        <SearchResultItem
          key={entry.id}
          user={entry}
          onClick={() => onSelect(entry)}
          onRemove={() => onRemove(entry.id)}
        />
      ))}
    </div>
  )
}
