import { useCallback, useState } from 'react'
import type { SearchHistoryEntry } from '../types'

const STORAGE_KEY = 'search_history'
const MAX_ENTRIES = 10

/** Safely read history from localStorage. Returns [] on any failure. */
function readHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SearchHistoryEntry[]) : []
  } catch {
    return []
  }
}

/** Persist history to localStorage. Silently fails (e.g. quota exceeded). */
function writeHistory(entries: SearchHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Ignore — private browsing or quota exceeded
  }
}

/**
 * Manages a list of recently visited user profiles in localStorage.
 * - Max 10 entries, most recent first
 * - Deduplicates by user id (moves existing entry to top)
 */
export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>(readHistory)

  /** Add or bump a user to the top of history. */
  const addEntry = useCallback((entry: SearchHistoryEntry) => {
    setHistory(prev => {
      const filtered = prev.filter(e => e.id !== entry.id)
      const next = [entry, ...filtered].slice(0, MAX_ENTRIES)
      writeHistory(next)
      return next
    })
  }, [])

  /** Remove a single user from history. */
  const removeEntry = useCallback((userId: string) => {
    setHistory(prev => {
      const next = prev.filter(e => e.id !== userId)
      writeHistory(next)
      return next
    })
  }, [])

  /** Clear all history entries. */
  const clearAll = useCallback(() => {
    writeHistory([])
    setHistory([])
  }, [])

  return { history, addEntry, removeEntry, clearAll }
}
