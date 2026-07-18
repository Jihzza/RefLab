import { ChevronRight, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Avatar, IconButton } from '@/components/ui'
import type { SearchHistoryEntry } from '../types'

interface SearchResultItemProps {
  user: SearchHistoryEntry
  onClick: () => void
  /** When provided, renders a remove action instead of the navigation marker. */
  onRemove?: () => void
}

export default function SearchResultItem({
  user,
  onClick,
  onRemove,
}: SearchResultItemProps) {
  const { t } = useTranslation()
  const displayName = user.name?.trim() || user.username

  return (
    <div className="group relative flex min-h-[72px] items-center overflow-hidden px-3 transition-colors hover:bg-(--mc-color-surface-hover) focus-within:bg-(--mc-color-surface-hover) sm:px-4">
      <span
        className="absolute inset-y-3 left-0 w-0.5 bg-(--mc-color-accent) opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute inset-y-0 right-11 w-24 opacity-[0.055]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(112deg, transparent 0 8px, var(--mc-color-text-muted) 8px 12px)',
        }}
        aria-hidden="true"
      />

      <Link
        to={`/app/profile/${encodeURIComponent(user.username)}`}
        onClick={onClick}
        className="relative z-10 flex min-w-0 flex-1 items-center gap-3 rounded-(--mc-radius-button) py-3 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus)"
        aria-label={t('View profile of {{name}}', { name: displayName })}
      >
        <Avatar
          src={user.photo_url}
          ownerId={user.id}
          name={displayName}
          alt={displayName}
          size="lg"
          className="border-(--mc-color-border-strong) bg-(--mc-color-canvas)"
        />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-(--mc-color-text)">
            {displayName}
          </span>
          <span className="mt-0.5 block truncate text-xs text-(--mc-color-text-muted)">
            @{user.username}
          </span>
        </span>
      </Link>

      {onRemove ? (
        <IconButton
          label={t('Remove {{name}} from search history', { name: displayName })}
          variant="ghost"
          size="sm"
          className="relative z-10 rounded-full"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
        >
          <X className="size-4" />
        </IconButton>
      ) : (
        <ChevronRight
          className="relative z-10 size-4 shrink-0 text-(--mc-color-text-muted) transition-colors group-hover:text-(--mc-color-accent)"
          aria-hidden="true"
        />
      )}
    </div>
  )
}
