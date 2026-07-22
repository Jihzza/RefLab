import { useEffect, useRef, useState } from 'react'
import { AtSign, SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import { searchUsers } from '@/features/messages/api/messagesApi'
import type { UserSearchResult } from '@/features/messages/types'

const DEBOUNCE_MS = 300

interface MentionDropdownProps {
  query: string
  onSelect: (username: string) => void
  onClose: () => void
}

export default function MentionDropdown({ query, onSelect, onClose }: MentionDropdownProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const userId = user?.id
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)
  const lastRequestIdRef = useRef(0)
  const trimmedQuery = query.trim()

  useEffect(() => {
    if (!userId || !trimmedQuery) return

    const requestId = ++lastRequestIdRef.current
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true)
      setSearchFailed(false)
      const { data, error } = await searchUsers(trimmedQuery, userId, 6)
      if (requestId !== lastRequestIdRef.current) return

      setResults(error ? [] : data)
      setSearchFailed(Boolean(error))
      setIsSearching(false)
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [trimmedQuery, userId])

  useEffect(() => {
    const handleClick = () => onClose()
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [onClose])

  const visibleResults = trimmedQuery ? results : []

  return (
    <div
      className="absolute left-0 right-0 top-full z-(--mc-z-popover) mt-1 max-h-64 overflow-y-auto rounded-(--mc-radius-card) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) p-1 shadow-(--mc-shadow-raised)"
      onClick={(event) => event.stopPropagation()}
      role="listbox"
      aria-label={t('Mention a user')}
    >
      {!trimmedQuery && (
        <div className="flex items-center gap-2 px-3 py-3 text-xs text-(--mc-color-text-muted)">
          <AtSign className="size-4 text-(--mc-color-accent)" aria-hidden="true" />
          {t('Type a username to mention someone')}
        </div>
      )}

      {isSearching && trimmedQuery && (
        <div className="space-y-2 p-2" role="status" aria-label={t('Searching')}>
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2">
              <Skeleton variant="circular" width="1.75rem" />
              <Skeleton variant="text" width="55%" />
            </div>
          ))}
        </div>
      )}

      {!isSearching && searchFailed && trimmedQuery && (
        <p className="px-3 py-3 text-center text-xs text-(--mc-color-danger)" role="alert">
          {t('Unable to search users. Please try again.')}
        </p>
      )}

      {!isSearching && !searchFailed && trimmedQuery && visibleResults.length === 0 && (
        <div className="flex items-center justify-center gap-2 px-3 py-4 text-xs text-(--mc-color-text-muted)">
          <SearchX className="size-4" aria-hidden="true" />
          {t('No users found')}
        </div>
      )}

      {!isSearching && visibleResults.map((result) => {
        const displayName = result.name || result.username
        return (
          <button
            key={result.id}
            type="button"
            role="option"
            aria-selected="false"
            className="mc-focus-ring flex min-h-12 w-full items-center gap-3 rounded-(--mc-radius-button) px-3 py-2 text-left hover:bg-(--mc-color-surface-hover)"
            onMouseDown={(event) => {
              event.preventDefault()
              onSelect(result.username)
            }}
          >
            {result.photo_url ? (
              <img
                src={result.photo_url}
                alt=""
                className="size-8 shrink-0 rounded-full border border-(--mc-color-border) object-cover"
              />
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--mc-color-accent)/15 text-[10px] font-bold text-(--mc-color-accent)">
                {displayName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-(--mc-color-text)">{displayName}</span>
              <span className="block truncate text-xs text-(--mc-color-text-muted)">@{result.username}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
