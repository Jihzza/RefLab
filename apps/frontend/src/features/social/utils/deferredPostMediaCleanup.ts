export const POST_MEDIA_CLEANUP_GRACE_MS = 24 * 60 * 60 * 1000

const STORAGE_PREFIX = 'reflab-post-media-cleanup:'
/**
 * Local safety net only. The server-side orphan sweep remains authoritative.
 * Keep enough history for prolonged offline use without approaching normal
 * localStorage limits; on overflow preserve the oldest due work and the newest
 * upload intent instead of silently evicting the cleanup backlog head.
 */
export const POST_MEDIA_CLEANUP_MAX_ENTRIES = 500

export type DeferredPostMediaCleanup = {
  path: string
  operationId: string
  createdAt: number
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`
}

export function readDeferredPostMediaCleanup(
  userId: string,
  now = Date.now(),
): DeferredPostMediaCleanup[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    let migrated = false
    const entries = parsed.flatMap((value): DeferredPostMediaCleanup[] => {
      if (typeof value === 'string' && value.length > 0) {
        migrated = true
        return [{ path: value, operationId: crypto.randomUUID(), createdAt: now }]
      }
      if (!value || typeof value !== 'object') return []
      const candidate = value as Partial<DeferredPostMediaCleanup>
      if (
        typeof candidate.path !== 'string' || candidate.path.length === 0
        || typeof candidate.operationId !== 'string' || candidate.operationId.length === 0
        || typeof candidate.createdAt !== 'number' || !Number.isFinite(candidate.createdAt)
      ) return []
      return [{
        path: candidate.path,
        operationId: candidate.operationId,
        createdAt: candidate.createdAt,
      }]
    })

    if (migrated) writeDeferredPostMediaCleanup(userId, entries)
    return entries
  } catch {
    return []
  }
}

export function writeDeferredPostMediaCleanup(
  userId: string,
  entries: Iterable<DeferredPostMediaCleanup>,
) {
  if (typeof window === 'undefined') return
  try {
    const deduped = new Map<string, DeferredPostMediaCleanup>()
    for (const entry of entries) {
      const key = `${entry.operationId}:${entry.path}`
      const existing = deduped.get(key)
      if (!existing || entry.createdAt < existing.createdAt) deduped.set(key, entry)
    }
    const ordered = [...deduped.values()]
      .sort((left, right) => left.createdAt - right.createdAt)
    const bounded = ordered.length <= POST_MEDIA_CLEANUP_MAX_ENTRIES
      ? ordered
      : [
          ...ordered.slice(0, POST_MEDIA_CLEANUP_MAX_ENTRIES - 1),
          ordered[ordered.length - 1],
        ]
    if (bounded.length === 0) {
      window.localStorage.removeItem(storageKey(userId))
    } else {
      window.localStorage.setItem(storageKey(userId), JSON.stringify(bounded))
    }
  } catch {
    // Server guards still protect committed references if storage is blocked.
  }
}

export function rememberDeferredPostMediaCleanup(
  userId: string,
  path: string,
  operationId: string,
  createdAt = Date.now(),
) {
  const entries = readDeferredPostMediaCleanup(userId, createdAt)
  const existing = entries.find(entry => (
    entry.path === path && entry.operationId === operationId
  ))
  writeDeferredPostMediaCleanup(userId, [
    ...entries,
    existing ?? { path, operationId, createdAt },
  ])
}

export function forgetDeferredPostMediaCleanup(
  userId: string,
  path: string,
  operationId: string,
) {
  writeDeferredPostMediaCleanup(
    userId,
    readDeferredPostMediaCleanup(userId).filter(entry => (
      entry.path !== path || entry.operationId !== operationId
    )),
  )
}

export function isDeferredPostMediaCleanupDue(
  entry: DeferredPostMediaCleanup,
  now = Date.now(),
) {
  return now - entry.createdAt >= POST_MEDIA_CLEANUP_GRACE_MS
}
