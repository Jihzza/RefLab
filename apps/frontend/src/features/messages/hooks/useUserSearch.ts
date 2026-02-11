import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { searchUsers } from '../api/messagesApi'
import type { UserSearchResult } from '../types'

const DEBOUNCE_MS = 300

export function useUserSearch(limit: number = 10) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const lastRequestIdRef = useRef(0)

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
      const { data, error } = await searchUsers(q, user.id, limit)

      // Ignore stale responses
      if (requestId !== lastRequestIdRef.current) return

      if (error) {
        setResults([])
        setIsSearching(false)
        return
      }

      setResults(data)
      setIsSearching(false)
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(t)
  }, [query, user?.id, limit])

  const handleSearch = useCallback((nextQuery: string) => {
    setQuery(nextQuery)
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setIsSearching(false)
    lastRequestIdRef.current += 1
  }, [])

  return {
    query,
    results,
    isSearching,
    handleSearch,
    clearSearch,
  }
}

