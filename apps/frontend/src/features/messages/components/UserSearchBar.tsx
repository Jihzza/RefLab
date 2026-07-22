import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { IconButton, Input } from '@/components/ui'

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
    <Input
      value={query}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && query && onClear) onClear()
      }}
      disabled={disabled}
      placeholder={t(placeholder)}
      aria-label={t('Search users')}
      autoComplete="off"
      data-user-search=""
      startAdornment={<Search className="size-5" />}
      endAdornment={query.trim() && onClear ? (
        <IconButton label={t('Clear search')} size="sm" variant="ghost" onClick={onClear}>
          <X className="size-4" />
        </IconButton>
      ) : undefined}
      className="bg-(--mc-color-canvas)"
    />
  )
}
