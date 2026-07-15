import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { searchUsers } from '@/features/messages/api/messagesApi'
import type { UserSearchResult } from '@/features/messages/types'

const DEBOUNCE_MS = 300
const RESULT_LIMIT = 10

/**
 * Search-page adapter for the shared user search RPC.
 * Keeps the existing 300 ms debounce, ten-result limit and stale-response guard,
 * while retaining the API error so the page can render a distinct error state.
 */
export function useProfileSearch() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const lastRequestIdRef = useRef(0)

  useEffect(() => {
    const q = query.trim()

    if (!user?.id || !q) {
      lastRequestIdRef.current += 1
      return
    }

    const requestId = ++lastRequestIdRef.current

    const timer = window.setTimeout(async () => {
      try {
        const response = await searchUsers(q, user.id, RESULT_LIMIT)

        if (requestId !== lastRequestIdRef.current) return

        if (response.error) {
          setResults([])
          setError(response.error.message)
          setIsSearching(false)
          return
        }

        setResults(response.data)
        setIsSearching(false)
      } catch (caughtError) {
        if (requestId !== lastRequestIdRef.current) return
        setResults([])
        setError(caughtError instanceof Error ? caughtError.message : 'Search failed')
        setIsSearching(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      if (requestId === lastRequestIdRef.current) {
        lastRequestIdRef.current += 1
      }
    }
  }, [query, retryToken, user?.id])

  const handleSearch = useCallback((nextQuery: string) => {
    // Invalidate an in-flight response immediately, before the next effect runs.
    lastRequestIdRef.current += 1
    setQuery(nextQuery)
    setError(null)

    if (nextQuery.trim()) {
      setIsSearching(true)
      return
    }

    setResults([])
    setIsSearching(false)
  }, [])

  const clearSearch = useCallback(() => {
    lastRequestIdRef.current += 1
    setQuery('')
    setResults([])
    setIsSearching(false)
    setError(null)
  }, [])

  const retrySearch = useCallback(() => {
    if (!query.trim()) return
    setError(null)
    setIsSearching(true)
    setRetryToken((current) => current + 1)
  }, [query])

  return {
    query,
    results,
    isSearching,
    error,
    handleSearch,
    clearSearch,
    retrySearch,
  }
}
