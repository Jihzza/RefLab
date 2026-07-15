import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface UserSearchBarProps {
  query: string
  onChange: (value: string) => void
  onClear?: () => void
  disabled?: boolean
  placeholder?: string
  isExpanded?: boolean
  resultsId?: string
}

export default function UserSearchBar({
  query,
  onChange,
  onClear,
  disabled = false,
  placeholder = 'Search users...',
  isExpanded = false,
  resultsId,
}: UserSearchBarProps) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-11 items-center gap-2 rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-surface-raised) pl-3 transition-colors hover:border-(--mc-color-border-strong) focus-within:ring-2 focus-within:ring-(--mc-color-focus) focus-within:ring-offset-1 focus-within:ring-offset-(--mc-color-canvas)">
      <Search
        className="size-5 shrink-0 text-(--mc-color-text-muted)"
        strokeWidth={1.8}
        aria-hidden="true"
      />

      <input
        value={query}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        placeholder={t(placeholder)}
        role="combobox"
        aria-label={t('Search')}
        aria-autocomplete="list"
        aria-expanded={isExpanded}
        aria-controls={isExpanded ? resultsId : undefined}
        className="min-h-11 min-w-0 flex-1 bg-transparent py-2 text-sm text-(--mc-color-text) placeholder:text-(--mc-color-text-muted) focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />

      {Boolean(query.trim()) && onClear && (
        <button
          onClick={onClear}
          className="mc-focus-ring flex size-11 shrink-0 items-center justify-center rounded-(--mc-radius-button) text-(--mc-color-text-muted) transition-colors hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)"
          aria-label={t('Clear search')}
          type="button"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
