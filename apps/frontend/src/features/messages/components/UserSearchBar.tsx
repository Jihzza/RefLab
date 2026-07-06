import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'

interface UserSearchBarProps {
  query: string
  onChange: (value: string) => void
  onClear?: () => void
  disabled?: boolean
  placeholder?: string
}

export default function UserSearchBar({
  query,
  onChange,
  onClear,
  disabled = false,
  placeholder = 'Search users...',
}: UserSearchBarProps) {
  const { t } = useTranslation()

  return (
    <div className="group flex items-center gap-2.5 h-11 bg-(--bg-surface-2) border border-(--border-subtle) rounded-(--radius-input) px-3.5 transition-[border-color,box-shadow] duration-150 focus-within:border-(--brand-yellow) focus-within:shadow-[0_0_0_3px_rgba(246,194,28,0.16)]">
      <Search
        className="h-4.5 w-4.5 text-(--text-muted) flex-shrink-0 transition-colors group-focus-within:text-(--brand-yellow)"
        aria-hidden="true"
      />

      <input
        value={query}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape' && onClear) {
            e.preventDefault()
            onClear()
          }
        }}
        disabled={disabled}
        placeholder={t(placeholder)}
        aria-label={t(placeholder)}
        className="w-full bg-transparent text-sm text-(--text-primary) placeholder-(--text-faint) focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {!!query.trim() && onClear && (
        <button
          onClick={onClear}
          className="w-7 h-7 -mr-1 rounded-full flex items-center justify-center text-(--text-muted) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors flex-shrink-0"
          aria-label={t('Clear search')}
          type="button"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
