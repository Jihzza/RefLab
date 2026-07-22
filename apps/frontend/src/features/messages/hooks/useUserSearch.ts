import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { searchUsers } from '../api/messagesApi'
import type { UserSearchResult } from '../types'

const DEBOUNCE_MS = 300

export function useUserSearch(limit: number = 10) {
  const { user } = useAuth()
  const userId = user?.id
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lastRequestIdRef = useRef(0)

  useEffect(() => {
    if (!userId) return

    const q = query.trim()
    if (!q) return

    const requestId = ++lastRequestIdRef.current

    const t = window.setTimeout(async () => {
      const { data, error: searchError } = await searchUsers(q, userId, limit)

      // Ignore stale responses
      if (requestId !== lastRequestIdRef.current) return

      if (searchError) {
        setResults([])
        setError(searchError.message)
        setIsSearching(false)
        return
      }

      setError(null)
      setResults(data)
      setIsSearching(false)
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(t)
  }, [query, userId, limit])

  const handleSearch = useCallback((nextQuery: string) => {
    setQuery(nextQuery)
    setError(null)
    if (nextQuery.trim()) {
      setIsSearching(true)
    } else {
      setResults([])
      setIsSearching(false)
      lastRequestIdRef.current += 1
    }
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setIsSearching(false)
    setError(null)
    lastRequestIdRef.current += 1
  }, [])

  return {
    query,
    results,
    isSearching,
    error,
    handleSearch,
    clearSearch,
  }
}

