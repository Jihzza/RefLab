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
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const lastRequestIdRef = useRef(0)

  useEffect(() => {
    const q = query.trim()
    if (!user?.id || !q) return

    const requestId = ++lastRequestIdRef.current
    let cancelled = false

    const timer = window.setTimeout(async () => {
      const { data, error: searchError } = await searchUsers(q, user.id, limit)

      if (cancelled || requestId !== lastRequestIdRef.current) return

      if (searchError) {
        setResults([])
        setError(searchError.message)
        setIsSearching(false)
        return
      }

      setResults(data)
      setIsSearching(false)
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, user?.id, limit, retryToken])

  const handleSearch = useCallback((nextQuery: string) => {
    setQuery(nextQuery)
    if (!nextQuery.trim()) {
      setResults([])
      setError(null)
      setIsSearching(false)
      lastRequestIdRef.current += 1
      return
    }

    setIsSearching(true)
    setError(null)
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    setIsSearching(false)
    lastRequestIdRef.current += 1
  }, [])

  const retrySearch = useCallback(() => {
    setIsSearching(true)
    setError(null)
    setRetryToken(value => value + 1)
  }, [])

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
