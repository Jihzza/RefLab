import { useTranslation } from 'react-i18next'

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
    <div className="flex items-center gap-2 bg-(--bg-surface-2) border border-(--border-subtle) rounded-(--radius-input) px-3 py-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-(--text-muted) flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>

      <input
        value={query}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder={t(placeholder)}
        className="w-full bg-transparent text-sm text-(--text-primary) placeholder-(--text-muted) focus:outline-none"
      />

      {!!query.trim() && onClear && (
        <button
          onClick={onClear}
          className="w-7 h-7 rounded-full flex items-center justify-center text-(--text-muted) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors"
          aria-label={t('Clear search')}
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
