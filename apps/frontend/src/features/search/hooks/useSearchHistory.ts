import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { getSearchHistoryProfiles } from '../api/searchHistoryApi'
import type { SearchHistoryEntry } from '../types'
import {
  SEARCH_HISTORY_MAX_ENTRIES,
  getBrowserLocalStorage,
  readSearchHistoryIds,
  removeLegacySearchHistory,
  writeSearchHistoryIds,
} from '../utils/searchHistoryStorage'

interface HistoryState {
  scopeKey: string | null
  revision: number
  entries: SearchHistoryEntry[]
}

/**
 * Account/session-scoped recent profile IDs. Profile PII is always rehydrated
 * through the current block/deletion-aware RPC before it can be rendered.
 */
export function useSearchHistory() {
  const { session, user } = useAuth()
  const userId = user?.id ?? null
  const sessionIdentity = session?.access_token
    ?? user?.last_sign_in_at
    ?? user?.updated_at
    ?? 'no-session'
  const scopeKey = userId ? `${userId}:${sessionIdentity}` : null
  const [historyState, setHistoryState] = useState<HistoryState>({
    scopeKey: null,
    revision: 0,
    entries: [],
  })
  const historyRef = useRef<HistoryState>(historyState)
  const history = historyState.scopeKey === scopeKey ? historyState.entries : []

  const commitHistory = useCallback((next: HistoryState) => {
    historyRef.current = next
    setHistoryState(next)
  }, [])

  useEffect(() => {
    let active = true

    const storage = getBrowserLocalStorage()
    if (!storage) return () => { active = false }

    removeLegacySearchHistory(storage)
    if (!userId || !scopeKey) return () => { active = false }

    // Reset the mutation baseline for this exact auth session without
    // synchronously setting React state inside the effect. The scope mismatch
    // already makes prior-session entries invisible during this render.
    if (historyRef.current.scopeKey !== scopeKey) {
      historyRef.current = { scopeKey, revision: 0, entries: [] }
    }

    const ids = readSearchHistoryIds(storage, userId)
    if (ids.length === 0) return () => { active = false }
    const hydrationRevision = historyRef.current.revision

    void getSearchHistoryProfiles(ids).then(({ profiles, error }) => {
      const current = historyRef.current
      if (
        !active
        || current.scopeKey !== scopeKey
        || current.revision !== hydrationRevision
      ) {
        return
      }

      if (error) {
        // Fail closed: never render stale PII when current visibility cannot be
        // proven. Keep the IDs so a later visit can safely retry hydration.
        return
      }

      const next: HistoryState = {
        scopeKey,
        revision: hydrationRevision,
        entries: profiles,
      }
      commitHistory(next)
      writeSearchHistoryIds(
        storage,
        userId,
        profiles.map((profile) => profile.id),
      )
    })

    return () => { active = false }
  }, [commitHistory, scopeKey, userId])

  const addEntry = useCallback((entry: SearchHistoryEntry) => {
    if (!userId || !scopeKey) return

    const current = historyRef.current
    const currentEntries = current.scopeKey === scopeKey ? current.entries : []
    const entries = [
      entry,
      ...currentEntries.filter((item) => item.id !== entry.id),
    ].slice(0, SEARCH_HISTORY_MAX_ENTRIES)
    const next: HistoryState = {
      scopeKey,
      revision: current.scopeKey === scopeKey ? current.revision + 1 : 1,
      entries,
    }

    commitHistory(next)
    const storage = getBrowserLocalStorage()
    if (storage) {
      writeSearchHistoryIds(storage, userId, entries.map((item) => item.id))
    }
  }, [commitHistory, scopeKey, userId])

  const removeEntry = useCallback((profileId: string) => {
    if (!userId || !scopeKey) return

    const current = historyRef.current
    const currentEntries = current.scopeKey === scopeKey ? current.entries : []
    const entries = currentEntries.filter((entry) => entry.id !== profileId)
    const next: HistoryState = {
      scopeKey,
      revision: current.scopeKey === scopeKey ? current.revision + 1 : 1,
      entries,
    }
    commitHistory(next)
    const storage = getBrowserLocalStorage()
    if (storage) {
      writeSearchHistoryIds(storage, userId, entries.map((item) => item.id))
    }
  }, [commitHistory, scopeKey, userId])

  const clearAll = useCallback(() => {
    if (!userId || !scopeKey) return
    const current = historyRef.current
    commitHistory({
      scopeKey,
      revision: current.scopeKey === scopeKey ? current.revision + 1 : 1,
      entries: [],
    })
    const storage = getBrowserLocalStorage()
    if (storage) writeSearchHistoryIds(storage, userId, [])
  }, [commitHistory, scopeKey, userId])

  return { history, addEntry, removeEntry, clearAll }
}
