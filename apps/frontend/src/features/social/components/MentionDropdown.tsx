import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Avatar from '@/components/ui/Avatar'
import { useAuth } from '@/features/auth/components/useAuth'
import { searchUsers } from '@/features/messages/api/messagesApi'
import type { UserSearchResult } from '@/features/messages/types'

const DEBOUNCE_MS = 300
const EMPTY_RESULTS: UserSearchResult[] = []

interface MentionDropdownProps {
  id: string
  query: string
  onSelect: (username: string) => void
  onClose: () => void
}

/** Debounced, race-safe listbox for selecting @mentions from the composer. */
export default function MentionDropdown({
  id,
  query,
  onSelect,
  onClose,
}: MentionDropdownProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const userId = user?.id
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [resolvedQuery, setResolvedQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const lastRequestIdRef = useRef(0)
  const trimmedQuery = query.trim()

  useEffect(() => {
    const requestId = ++lastRequestIdRef.current
    if (!userId || !trimmedQuery) return

    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true)
      const { data, error } = await searchUsers(trimmedQuery, userId, 6)
      if (requestId !== lastRequestIdRef.current) return

      setResults(error ? [] : data)
      setResolvedQuery(trimmedQuery)
      setActiveIndex(0)
      setIsSearching(false)
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
      if (lastRequestIdRef.current === requestId) {
        lastRequestIdRef.current += 1
      }
    }
  }, [trimmedQuery, userId])

  const resultsAreCurrent = resolvedQuery === trimmedQuery
  const visibleResults = trimmedQuery && resultsAreCurrent ? results : EMPTY_RESULTS
  const searchPending = Boolean(trimmedQuery) && (!resultsAreCurrent || isSearching)
  const visibleActiveIndex = Math.min(activeIndex, Math.max(visibleResults.length - 1, 0))

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
        return
      }

      if (visibleResults.length === 0) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((index) => (index + 1) % visibleResults.length)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((index) => (index - 1 + visibleResults.length) % visibleResults.length)
      } else if (event.key === 'Home') {
        event.preventDefault()
        setActiveIndex(0)
      } else if (event.key === 'End') {
        event.preventDefault()
        setActiveIndex(visibleResults.length - 1)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        const selectedUser = visibleResults[visibleActiveIndex]
        if (selectedUser) onSelect(selectedUser.username)
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose, onSelect, visibleActiveIndex, visibleResults])

  return (
    <div
      id={id}
      role="listbox"
      aria-label={t('Mention a user')}
      aria-activedescendant={
        visibleResults.length > 0 ? `${id}-option-${visibleActiveIndex}` : undefined
      }
      className="absolute inset-x-0 top-[calc(100%+0.375rem)] z-40 max-h-64 overflow-y-auto overscroll-contain rounded-(--mc-radius-input) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) p-1 shadow-(--mc-shadow-raised)"
    >
      {searchPending && (
        <div
          role="status"
          aria-label={t('Searching users')}
          className="flex min-h-16 items-center justify-center"
        >
          <LoaderCircle className="size-4 animate-spin text-(--mc-color-accent) motion-reduce:animate-none" />
        </div>
      )}

      {!searchPending && trimmedQuery && visibleResults.length === 0 && (
        <div className="flex min-h-16 items-center justify-center gap-2 px-3 text-center text-xs text-(--mc-color-text-muted)">
          <SearchX className="size-4" aria-hidden="true" />
          <span>{t('No users found')}</span>
        </div>
      )}

      {visibleResults.map((result, index) => {
        const displayName = result.name || result.username
        return (
          <button
            key={result.id}
            id={`${id}-option-${index}`}
            type="button"
            role="option"
            tabIndex={-1}
            aria-selected={index === visibleActiveIndex}
            className={`flex min-h-12 w-full items-center gap-3 rounded-(--mc-radius-compact) px-3 py-2 text-left transition-colors focus-visible:outline-none motion-reduce:transition-none ${
              index === visibleActiveIndex
                ? 'bg-(--mc-color-surface-hover) text-(--mc-color-text)'
                : 'text-(--mc-color-text-secondary) hover:bg-(--mc-color-surface-hover)'
            }`}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseDown={(event) => {
              event.preventDefault()
              onSelect(result.username)
            }}
          >
            <Avatar
              src={result.photo_url}
              ownerId={result.id}
              alt={displayName}
              name={displayName}
              size="sm"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-(--mc-color-text)">
                {displayName}
              </span>
              <span className="block truncate text-xs text-(--mc-color-text-muted)">
                @{result.username}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
