import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { searchUsers } from '@/features/messages/api/messagesApi'
import type { UserSearchResult } from '@/features/messages/types'

const DEBOUNCE_MS = 300

interface MentionDropdownProps {
  query: string
  onSelect: (username: string) => void
  onClose: () => void
}

/**
 * MentionDropdown - Floating autocomplete for @mentions in comments.
 *
 * Positioned absolutely below the comment input.
 * Searches users via the existing search_users RPC with debounce.
 */
export default function MentionDropdown({
  query,
  onSelect,
  onClose,
}: MentionDropdownProps) {
  const { user } = useAuth()
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const lastRequestIdRef = useRef(0)

  // Debounced search whenever query changes
  useEffect(() => {
    if (!user?.id) return

    const q = query.trim()
    if (!q) {
      setResults([])
      setIsSearching(false)
      return
    }

    const requestId = ++lastRequestIdRef.current
    setIsSearching(true)

    const t = window.setTimeout(async () => {
      const { data, error } = await searchUsers(q, user.id, 6)

      // Ignore stale responses
      if (requestId !== lastRequestIdRef.current) return

      if (error) {
        setResults([])
      } else {
        setResults(data)
      }
      setIsSearching(false)
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(t)
  }, [query, user?.id])

  // Close on outside click
  useEffect(() => {
    const handleClick = () => onClose()
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [onClose])

  return (
    <div
      className="absolute left-0 right-0 top-full mt-1 z-50 bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) shadow-lg max-h-52 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Loading */}
      {isSearching && results.length === 0 && (
        <div className="flex justify-center py-3">
          <div className="w-4 h-4 border-2 border-(--brand-yellow) border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* No results */}
      {!isSearching && query.trim() && results.length === 0 && (
        <p className="text-xs text-(--text-muted) text-center py-3">
          No users found
        </p>
      )}

      {/* Results */}
      {results.map((u) => (
        <button
          key={u.id}
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-(--bg-hover) transition-colors text-left"
          onMouseDown={(e) => {
            // Prevent input blur before we handle the selection
            e.preventDefault()
            onSelect(u.username)
          }}
        >
          {u.photo_url ? (
            <img
              src={u.photo_url}
              alt={u.username}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-(--brand-yellow) flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-semibold text-(--bg-primary)">
                {(u.name || u.username).slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-(--text-primary) truncate">
              {u.name || u.username}
            </p>
            <p className="text-xs text-(--text-muted) truncate">
              @{u.username}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}
