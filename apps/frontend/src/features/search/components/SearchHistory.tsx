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
      <Surface padding="none" className="overflow-hidden border-(--mc-color-border-strong) shadow-none">
        <EmptyState
          compact
          icon={<Search className="size-5" />}
          title={t('Recent')}
          description={t('Type to search')}
        />
      </Surface>
    )
  }

  return (
    <Surface
      padding="none"
      className="overflow-hidden border-(--mc-color-border-strong) shadow-none"
      role="region"
      aria-label={t('Recent')}
    >
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-(--mc-color-border) px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Clock3 className="size-4 shrink-0 text-(--mc-color-accent)" aria-hidden="true" />
          <h2 className="truncate text-sm font-semibold text-(--mc-color-text)">{t('Recent')}</h2>
          <span className="rounded-(--mc-radius-pill) border border-(--mc-color-border) bg-(--mc-color-surface-raised) px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-(--mc-color-text-muted)">
            {history.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          aria-label={t('Clear all search history')}
          className="-mr-2 text-(--mc-color-accent)"
        >
          {t('Clear all')}
        </Button>
      </div>

      <ul className="divide-y divide-(--mc-color-border)">
        {history.map((entry) => (
          <li key={entry.id} className="list-none">
            <SearchResultItem
              user={entry}
              onClick={() => onSelect(entry)}
              onRemove={() => onRemove(entry.id)}
            />
          </li>
        ))}
      </ul>
    </Surface>
  )
}
