import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { IconButton, Input } from '@/components/ui'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  placeholder?: string
  isLoading?: boolean
}

export default function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Search users...',
  isLoading = false,
}: SearchInputProps) {
  const { t } = useTranslation()
  const hasQuery = Boolean(value.trim())

  return (
    <Input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={t(placeholder)}
      aria-label={t('Search users...')}
      aria-busy={isLoading || undefined}
      autoComplete="off"
      spellCheck={false}
      startAdornment={<Search className="size-5" />}
      endAdornment={hasQuery ? (
        <IconButton
          label={t('Clear search')}
          size="sm"
          variant="ghost"
          className="size-8 rounded-full"
          onClick={onClear ?? (() => onChange(''))}
        >
          <X className="size-4" />
        </IconButton>
      ) : undefined}
      className="min-h-12 border-(--mc-color-border-strong) bg-(--mc-color-canvas)/75 pl-11 pr-12 text-base shadow-none [&::-webkit-search-cancel-button]:appearance-none"
    />
  )
}
