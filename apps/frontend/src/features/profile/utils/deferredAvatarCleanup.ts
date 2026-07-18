export const AVATAR_CLEANUP_GRACE_MS = 24 * 60 * 60 * 1000

const STORAGE_PREFIX = 'reflab-avatar-cleanup:'
/**
 * Local safety net only. The server-side orphan sweep remains authoritative.
 * On overflow preserve the oldest due work and the newest upload intent.
 */
export const AVATAR_CLEANUP_MAX_ENTRIES = 500

export type DeferredAvatarCleanup = {
  url: string
  createdAt: number
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`
}

export function readDeferredAvatarCleanup(
  userId: string,
  now = Date.now(),
): DeferredAvatarCleanup[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    let migrated = false
    const entries = parsed.flatMap((value): DeferredAvatarCleanup[] => {
      if (typeof value === 'string' && value.length > 0) {
        migrated = true
        return [{ url: value, createdAt: now }]
      }
      if (!value || typeof value !== 'object') return []
      const candidate = value as Partial<DeferredAvatarCleanup>
      if (
        typeof candidate.url !== 'string' || candidate.url.length === 0
        || typeof candidate.createdAt !== 'number' || !Number.isFinite(candidate.createdAt)
      ) return []
      return [{ url: candidate.url, createdAt: candidate.createdAt }]
    })
    if (migrated) writeDeferredAvatarCleanup(userId, entries)
    return entries
  } catch {
    return []
  }
}

export function writeDeferredAvatarCleanup(
  userId: string,
  entries: Iterable<DeferredAvatarCleanup>,
) {
  if (typeof window === 'undefined') return
  try {
    const deduped = new Map<string, DeferredAvatarCleanup>()
    for (const entry of entries) {
      const current = deduped.get(entry.url)
      if (!current || entry.createdAt < current.createdAt) {
        deduped.set(entry.url, entry)
      }
    }
    const ordered = [...deduped.values()]
      .sort((left, right) => left.createdAt - right.createdAt)
    const bounded = ordered.length <= AVATAR_CLEANUP_MAX_ENTRIES
      ? ordered
      : [
          ...ordered.slice(0, AVATAR_CLEANUP_MAX_ENTRIES - 1),
          ordered[ordered.length - 1],
        ]
    if (bounded.length === 0) window.localStorage.removeItem(storageKey(userId))
    else window.localStorage.setItem(storageKey(userId), JSON.stringify(bounded))
  } catch {
    // Server reference guards remain authoritative if local storage is blocked.
  }
}

export function rememberDeferredAvatarCleanup(
  userId: string,
  url: string,
  createdAt = Date.now(),
) {
  const entries = readDeferredAvatarCleanup(userId, createdAt)
  const existing = entries.find(entry => entry.url === url)
  writeDeferredAvatarCleanup(userId, [
    ...entries,
    existing ?? { url, createdAt },
  ])
}

export function forgetDeferredAvatarCleanup(userId: string, url: string) {
  writeDeferredAvatarCleanup(
    userId,
    readDeferredAvatarCleanup(userId).filter(entry => entry.url !== url),
  )
}

export function isDeferredAvatarCleanupDue(
  entry: DeferredAvatarCleanup,
  now = Date.now(),
) {
  return now - entry.createdAt >= AVATAR_CLEANUP_GRACE_MS
}
