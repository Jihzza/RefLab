// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const outbox = vi.hoisted(() => ({
  block: vi.fn<() => Promise<void>>(),
  purge: vi.fn<() => Promise<void>>(),
  restore: vi.fn<() => Promise<void>>(),
  quiesce: vi.fn<() => Promise<void>>(),
}))

vi.mock('@/features/messages/offline/messageOutbox', () => ({
  blockMessageOutboxForSender: outbox.block,
  deleteQueuedMessagesForSender: outbox.purge,
  restoreMessageOutboxForSender: outbox.restore,
}))

vi.mock('@/features/messages/offline/messageOutboxDelivery', () => ({
  quiesceMessageOutboxForSender: outbox.quiesce,
}))

import {
  cancelPendingAccountDeletion,
  clearDeletedAccountLocalData,
  getPendingAccountDeletionMarkerStatus,
  hasPendingAccountDeletion,
  prepareAccountDeletionLocalData,
  shouldReconcilePendingAccountDeletion,
} from './accountLocalData'

const USER_ID = '10000000-0000-4000-8000-000000000001'

describe('account-local deletion safety', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    outbox.block.mockResolvedValue()
    outbox.purge.mockResolvedValue()
    outbox.restore.mockResolvedValue()
    outbox.quiesce.mockResolvedValue()
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: {},
    })
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: {
        delete: vi.fn().mockResolvedValue(true),
        keys: vi.fn().mockResolvedValue([]),
      },
    })
  })

  it('persists its marker before quiescing and preserves recoverable data pre-request', async () => {
    window.localStorage.setItem(`reflab:search-history:${USER_ID}`, '["law 12"]')
    window.localStorage.setItem('reflab:preferences', '{"compact":true}')
    outbox.block.mockImplementation(async () => {
      expect(hasPendingAccountDeletion(USER_ID)).toBe(true)
    })

    await prepareAccountDeletionLocalData(USER_ID)

    expect(outbox.block).toHaveBeenCalledWith(USER_ID)
    expect(outbox.quiesce).toHaveBeenCalledWith(USER_ID)
    expect(outbox.purge).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(`reflab:search-history:${USER_ID}`))
      .toBe('["law 12"]')
    expect(window.localStorage.getItem('reflab:preferences'))
      .toBe('{"compact":true}')
  })

  it('reactivates an intact outbox and preferences after definitive rejection', async () => {
    window.localStorage.setItem('search_history', '["VAR"]')
    window.localStorage.setItem(`reflab:search-history:${USER_ID}`, '["offside"]')
    await prepareAccountDeletionLocalData(USER_ID)

    await cancelPendingAccountDeletion(USER_ID)

    expect(outbox.restore).toHaveBeenCalledWith(USER_ID)
    expect(outbox.purge).not.toHaveBeenCalled()
    expect(hasPendingAccountDeletion(USER_ID)).toBe(false)
    expect(window.localStorage.getItem('search_history')).toBe('["VAR"]')
    expect(window.localStorage.getItem(`reflab:search-history:${USER_ID}`))
      .toBe('["offside"]')
  })

  it('never treats unavailable browser storage as deletion intent', async () => {
    const localStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
    const deleteEndpoint = vi.fn<() => Promise<void>>().mockResolvedValue()

    try {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('Storage is unavailable', 'SecurityError')
        },
      })

      const markerStatus = getPendingAccountDeletionMarkerStatus(USER_ID)
      if (shouldReconcilePendingAccountDeletion(markerStatus)) {
        await deleteEndpoint()
      }

      expect(markerStatus).toBe('unavailable')
      expect(hasPendingAccountDeletion(USER_ID)).toBe(false)
      expect(deleteEndpoint).not.toHaveBeenCalled()
    } finally {
      if (localStorageDescriptor) {
        Object.defineProperty(window, 'localStorage', localStorageDescriptor)
      }
    }
  })

  it('purges only account-scoped browser data after acceptance or ambiguity', async () => {
    window.localStorage.setItem('search_history', '["legacy"]')
    window.localStorage.setItem('search:history_users', '["legacy-user"]')
    window.localStorage.setItem(`reflab:search-history:${USER_ID}`, '["law 3"]')
    window.localStorage.setItem(`reflab-avatar-cleanup:${USER_ID}`, 'avatar.webp')
    window.localStorage.setItem('reflab:preferences', '{"compact":true}')

    await clearDeletedAccountLocalData(USER_ID)

    expect(outbox.purge).toHaveBeenCalledTimes(2)
    expect(outbox.quiesce).toHaveBeenCalledWith(USER_ID)
    expect(window.localStorage.getItem('search_history')).toBeNull()
    expect(window.localStorage.getItem('search:history_users')).toBeNull()
    expect(window.localStorage.getItem(`reflab:search-history:${USER_ID}`))
      .toBeNull()
    expect(window.localStorage.getItem(`reflab-avatar-cleanup:${USER_ID}`))
      .toBeNull()
    expect(window.localStorage.getItem('reflab:preferences'))
      .toBe('{"compact":true}')
  })
})
