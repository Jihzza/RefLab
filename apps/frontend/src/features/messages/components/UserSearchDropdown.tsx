import { useEffect } from 'react'
import { AlertTriangle, LoaderCircle } from 'lucide-react'
import { Avatar, Button } from '@/components/ui'
import { useTranslation } from 'react-i18next'
import type { UserSearchResult } from '../types'

interface UserSearchDropdownProps {
  id?: string
  query: string
  results: UserSearchResult[]
  isSearching: boolean
  error?: string | null
  onRetry?: () => void
  onSelect: (user: UserSearchResult) => void
  isOpen: boolean
  disabled?: boolean
  activeIndex?: number
  onActiveIndexChange?: (index: number) => void
}

export default function UserSearchDropdown({
  id,
  query,
  results,
  isSearching,
  error = null,
  onRetry,
  onSelect,
  isOpen,
  disabled = false,
  activeIndex = -1,
  onActiveIndexChange,
}: UserSearchDropdownProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!id || activeIndex < 0) return
    document
      .getElementById(`${id}-option-${activeIndex}`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, id])

  if (!isOpen) return null

  return (
    <div
      id={id}
      role="listbox"
      aria-label={t('Search results')}
      aria-busy={isSearching}
      className="mc-layer-popover absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border-strong) bg-(--mc-color-surface) shadow-(--mc-shadow-raised)"
    >
      {isSearching && (
        <div className="flex min-h-20 items-center justify-center gap-2 px-4 py-4 text-sm text-(--mc-color-text-secondary)">
          <LoaderCircle
            className="size-5 animate-spin text-(--mc-color-accent) motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span>{t('Searching')}</span>
        </div>
      )}

      {!isSearching && error && (
        <div role="alert" className="flex flex-col items-center px-4 py-5 text-center">
          <AlertTriangle className="mb-2 size-5 text-(--mc-color-danger)" aria-hidden="true" />
          <p className="text-sm text-(--mc-color-text-secondary)">{t('Data unavailable')}</p>
          {onRetry && (
            <Button size="sm" variant="secondary" onClick={onRetry} className="mt-3">
              {t('Try Again')}
            </Button>
          )}
        </div>
      )}

      {!isSearching && !error && results.length === 0 && (
        <div className="px-4 py-5 text-center text-sm text-(--mc-color-text-muted)">
          {query.trim() ? t('No users found') : t('Type to search')}
        </div>
      )}

      {!isSearching && !error && results.length > 0 && (
        <div className="max-h-[min(20rem,48dvh)] overflow-y-auto p-1.5">
          {results.map((user, index) => {
            const displayName = user.name || user.username
            const isActive = index === activeIndex

            return (
              <button
                key={user.id}
                id={id ? `${id}-option-${index}` : undefined}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => onSelect(user)}
                onMouseEnter={() => onActiveIndexChange?.(index)}
                disabled={disabled}
                className={`mc-focus-ring flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-(--mc-color-surface-hover) disabled:cursor-not-allowed disabled:opacity-50 ${isActive ? 'bg-(--mc-color-surface-hover)' : ''}`}
              >
                <Avatar
                  src={user.photo_url}
                  ownerId={user.id}
                  alt={displayName}
                  name={displayName}
                  size="md"
                />

                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-(--mc-color-text)">
                    {displayName}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-(--mc-color-text-muted)">
                    @{user.username}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
