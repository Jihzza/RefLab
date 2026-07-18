import {
  blockMessageOutboxForSender,
  deleteQueuedMessagesForSender,
  restoreMessageOutboxForSender,
} from '@/features/messages/offline/messageOutbox'
import { quiesceMessageOutboxForSender } from '@/features/messages/offline/messageOutboxDelivery'

const SEARCH_HISTORY_STORAGE_KEYS = [
  'search_history',
  'search:history_users',
]
const SEARCH_HISTORY_STORAGE_PREFIX = 'reflab:search-history:'
const AVATAR_CLEANUP_STORAGE_PREFIX = 'reflab-avatar-cleanup:'
const ACCOUNT_DELETION_PENDING_PREFIX = 'reflab:account-deletion-pending:'
type PendingDeletionState = 'prepared' | 'ambiguous' | 'accepted'
export type PendingAccountDeletionMarkerStatus = 'present' | 'absent' | 'unavailable'

function pendingDeletionStorageKey(userId: string): string {
  return `${ACCOUNT_DELETION_PENDING_PREFIX}${userId}`
}

export function getPendingAccountDeletionMarkerStatus(
  userId: string,
): PendingAccountDeletionMarkerStatus {
  if (typeof window === 'undefined') return 'absent'
  try {
    return window.localStorage.getItem(pendingDeletionStorageKey(userId)) !== null
      ? 'present'
      : 'absent'
  } catch {
    // Browser storage failure is not evidence of deletion intent. Treating an
    // unavailable store as a marker would turn a privacy-mode/browser error
    // into an unsolicited destructive server request.
    return 'unavailable'
  }
}

export function shouldReconcilePendingAccountDeletion(
  status: PendingAccountDeletionMarkerStatus,
): boolean {
  return status === 'present'
}

export function hasPendingAccountDeletion(userId: string): boolean {
  return shouldReconcilePendingAccountDeletion(
    getPendingAccountDeletionMarkerStatus(userId),
  )
}

function persistPendingAccountDeletion(userId: string): void {
  if (typeof window === 'undefined') {
    throw new Error('Account deletion must be started from a browser session.')
  }
  const storageKey = pendingDeletionStorageKey(userId)
  if (window.localStorage.getItem(storageKey) !== null) return
  window.localStorage.setItem(storageKey, JSON.stringify({
    userId,
    state: 'prepared' satisfies PendingDeletionState,
    requestedAt: new Date().toISOString(),
  }))
}

export function markPendingAccountDeletionOutcome(
  userId: string,
  state: Exclude<PendingDeletionState, 'prepared'>,
): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(pendingDeletionStorageKey(userId), JSON.stringify({
    userId,
    state,
    updatedAt: new Date().toISOString(),
  }))
}

/** Remove personal data which is intentionally persisted outside Supabase auth. */
export async function clearDeletedAccountLocalData(userId: string): Promise<void> {
  const cleanupErrors: unknown[] = []

  if (typeof window !== 'undefined' && window.indexedDB) {
    try {
      await deleteQueuedMessagesForSender(userId)
    } catch (error) {
      cleanupErrors.push(error)
    }

    // A flush may already have passed its local transaction when the tombstone
    // was written. Wait for that one remote call to settle, then purge again so
    // no plaintext/media record or retry timer can survive the deletion request.
    try {
      await quiesceMessageOutboxForSender(userId)
    } catch (error) {
      cleanupErrors.push(error)
    }
    try {
      await deleteQueuedMessagesForSender(userId)
    } catch (error) {
      cleanupErrors.push(error)
    }
  }

  if (typeof window !== 'undefined') {
    for (const storageKey of [
      ...SEARCH_HISTORY_STORAGE_KEYS,
      `${SEARCH_HISTORY_STORAGE_PREFIX}${userId}`,
      `${AVATAR_CLEANUP_STORAGE_PREFIX}${userId}`,
    ]) {
      try {
        window.localStorage.removeItem(storageKey)
      } catch (error) {
        cleanupErrors.push(error)
      }
    }

    try {
      const accountCachePrefix = `reflab:user:${userId}`
      const cacheNames = await window.caches?.keys() ?? []
      await Promise.all(
        cacheNames
          .filter(name => name === accountCachePrefix || name.startsWith(`${accountCachePrefix}:`))
          .map(name => window.caches.delete(name)),
      )
    } catch (error) {
      cleanupErrors.push(error)
    }
  }

  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      cleanupErrors,
      'Some deleted-account data could not be removed from this device.',
    )
  }
}

/** Persist a tombstone and stop sends without deleting recoverable local data. */
export async function prepareAccountDeletionLocalData(userId: string): Promise<void> {
  persistPendingAccountDeletion(userId)
  if (typeof window !== 'undefined' && window.indexedDB) {
    await blockMessageOutboxForSender(userId)
    await quiesceMessageOutboxForSender(userId)
  }
}

/** Roll back only a request tombstone after a definitive server rejection. */
export async function cancelPendingAccountDeletion(userId: string): Promise<void> {
  const cleanupErrors: unknown[] = []
  if (typeof window !== 'undefined' && window.indexedDB) {
    try {
      await restoreMessageOutboxForSender(userId)
    } catch (error) {
      cleanupErrors.push(error)
    }
  }
  try {
    window.localStorage.removeItem(pendingDeletionStorageKey(userId))
  } catch (error) {
    cleanupErrors.push(error)
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      cleanupErrors,
      'The rejected account-deletion marker could not be fully reset.',
    )
  }
}
