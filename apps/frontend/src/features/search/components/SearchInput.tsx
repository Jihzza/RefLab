import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { IconButton, Input } from '@/components/ui'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchInput({ value, onChange, placeholder = 'Search users' }: SearchInputProps) {
  const { t } = useTranslation()
  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={t(placeholder)}
      aria-label={t('Search users')}
      startAdornment={<Search className="size-5" />}
      endAdornment={value ? (
        <IconButton label={t('Clear search')} size="sm" variant="ghost" onClick={() => onChange('')}>
          <X className="size-4" />
        </IconButton>
      ) : undefined}
    />
  )
}
