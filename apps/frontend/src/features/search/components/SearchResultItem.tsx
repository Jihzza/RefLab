import { ChevronRight, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { IconButton, Surface } from '@/components/ui'
import type { SearchHistoryEntry } from '../types'

interface SearchResultItemProps {
  user: SearchHistoryEntry
  onClick: () => void
  onRemove?: () => void
}

export default function SearchResultItem({ user, onClick, onRemove }: SearchResultItemProps) {
  const { t } = useTranslation()
  const displayName = user.name || user.username
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <Surface className="flex items-center" padding="none" role="listitem">
      <button
        type="button"
        onClick={onClick}
        className="mc-focus-ring flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-l-(--mc-radius-card) px-3 py-2.5 text-left hover:bg-(--mc-color-surface-hover) sm:px-4"
        aria-label={t('View profile of {{name}}', { name: displayName })}
      >
        {user.photo_url ? (
          <img src={user.photo_url} alt="" className="size-11 shrink-0 rounded-full border border-(--mc-color-border-strong) object-cover" />
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-(--mc-color-accent)/35 bg-(--mc-color-accent)/15 text-xs font-bold text-(--mc-color-accent)">{initials}</span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-(--mc-color-text)">{displayName}</span>
          <span className="block truncate text-xs text-(--mc-color-text-muted)">@{user.username}</span>
        </span>
        {!onRemove && <ChevronRight className="size-4 shrink-0 text-(--mc-color-text-muted)" aria-hidden="true" />}
      </button>

      {onRemove && (
        <IconButton
          label={t('Remove {{name}} from search history', { name: displayName })}
          variant="ghost"
          onClick={onRemove}
          className="mr-2"
        >
          <X className="size-4" />
        </IconButton>
      )}
    </Surface>
  )
}
