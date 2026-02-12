import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { searchUsers } from '../api/searchApi'
import type { SearchedUser } from '../types'

const HISTORY_USERS_KEY = 'search:history_users'

export function useSearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<SearchedUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [historyUsers, setHistoryUsers] = useState<SearchedUser[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_USERS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { /* ignore */
      return []
    }
  })

  const debounceRef = useRef<number | null>(null)

  const doSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await searchUsers(supabase, term)
      setResults(data)
    } catch (err) {
      setError((err as Error)?.message ?? 'Search failed')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => void doSearch(searchTerm), 300)
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current) }
  }, [searchTerm, doSearch])

  const selectHistoryUser = useCallback((user: SearchedUser) => {
    setSearchTerm(user.username)
    setResults([user])
  }, [])

  const addHistoryUser = useCallback((user: SearchedUser) => {
    setHistoryUsers((h) => {
      const next = [user, ...h.filter((u) => u.username !== user.username)].slice(0, 8)
      try { localStorage.setItem(HISTORY_USERS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const clearHistoryUsers = useCallback(() => {
    setHistoryUsers([])
    try { localStorage.removeItem(HISTORY_USERS_KEY) } catch { /* ignore */ }
  }, [])

  return { searchTerm, setSearchTerm, results, isLoading, error, historyUsers, clearHistoryUsers, selectHistoryUser, addHistoryUser }
}
