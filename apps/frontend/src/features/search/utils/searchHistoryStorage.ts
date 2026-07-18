const LEGACY_STORAGE_KEYS = ['search_history', 'search:history_users'] as const
const STORAGE_KEY_PREFIX = 'reflab:search-history:'
export const SEARCH_HISTORY_MAX_ENTRIES = 10

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getSearchHistoryStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`
}

export function getBrowserLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const uniqueIds = new Set<string>()
  for (const candidate of value) {
    if (typeof candidate !== 'string' || !UUID_PATTERN.test(candidate)) continue
    uniqueIds.add(candidate.toLowerCase())
    if (uniqueIds.size === SEARCH_HISTORY_MAX_ENTRIES) break
  }

  return [...uniqueIds]
}

/**
 * Removes the former global PII cache. It is intentionally never migrated:
 * its entries may belong to another account and may now be blocked or deleted.
 */
export function removeLegacySearchHistory(storage: Storage): void {
  try {
    for (const key of LEGACY_STORAGE_KEYS) storage.removeItem(key)
  } catch {
    // Storage can be unavailable in hardened/private browsing contexts.
  }
}

export function readSearchHistoryIds(storage: Storage, userId: string): string[] {
  try {
    const raw = storage.getItem(getSearchHistoryStorageKey(userId))
    if (!raw) return []
    return normalizeIds(JSON.parse(raw))
  } catch {
    return []
  }
}

export function writeSearchHistoryIds(
  storage: Storage,
  userId: string,
  ids: readonly string[],
): void {
  try {
    storage.setItem(
      getSearchHistoryStorageKey(userId),
      JSON.stringify(normalizeIds(ids)),
    )
  } catch {
    // Search remains fully usable when persistence is unavailable.
  }
}
