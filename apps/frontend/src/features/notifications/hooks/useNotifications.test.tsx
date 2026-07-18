// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EnrichedNotification } from '../types'
import { useNotifications } from './useNotifications'

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (payload: { new: Record<string, unknown> }) => void>(),
  getActive: vi.fn(),
  getByIds: vi.fn(),
  markRead: vi.fn(),
}))

vi.mock('@/features/auth/components/useAuth', () => ({
  useAuth: () => ({ user: { id: 'notification-test-user' } }),
}))

vi.mock('../api/notificationsApi', () => ({
  getActiveNotifications: mocks.getActive,
  getActiveNotificationsByIds: mocks.getByIds,
  markNotificationsAsRead: mocks.markRead,
}))

vi.mock('@/lib/supabaseClient', () => {
  const channel = {
    on: vi.fn((_event: string, filter: { event?: string }, handler: (
      payload: { new: Record<string, unknown> }
    ) => void) => {
      if (filter.event) mocks.handlers.set(filter.event, handler)
      return channel
    }),
    subscribe: vi.fn(() => channel),
  }

  return {
    supabase: {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    },
  }
})

function notification(index: number): EnrichedNotification {
  const timestamp = new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString()
  return {
    id: `notification-${String(index).padStart(4, '0')}`,
    user_id: 'notification-test-user',
    actor_id: null,
    reference_id: null,
    type: 'new_content_available',
    title: `Notification ${index}`,
    message: `Notification ${index}`,
    read: true,
    dismissed_permanently: false,
    next_reminder_at: null,
    created_at: timestamp,
    updated_at: timestamp,
    actor: null,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

beforeEach(() => {
  mocks.handlers.clear()
  mocks.getActive.mockReset()
  mocks.getByIds.mockReset()
  mocks.markRead.mockReset().mockResolvedValue({ error: null })
})

describe('useNotifications keyset reconciliation', () => {
  it('retries a stale first page without losing an INSERT or resurrecting an UPDATE', async () => {
    const initialRequest = deferred<{
      notifications: EnrichedNotification[]
      error: null
    }>()
    const inserted = notification(300)
    const dismissedDuringLoad = notification(250)
    const stable = notification(200)

    mocks.getActive
      .mockImplementationOnce(() => initialRequest.promise)
      .mockResolvedValueOnce({ notifications: [inserted, stable], error: null })
    mocks.getByIds.mockResolvedValue({
      // The missing requested UPDATE row represents a notification that is no
      // longer active; reconciliation must remove/keep it absent.
      notifications: [inserted],
      error: null,
    })

    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(mocks.handlers.has('INSERT')).toBe(true))
    await waitFor(() => expect(mocks.handlers.has('UPDATE')).toBe(true))

    await act(async () => {
      mocks.handlers.get('INSERT')?.({ new: { id: inserted.id } })
      mocks.handlers.get('UPDATE')?.({ new: { id: dismissedDuringLoad.id } })
      await new Promise(resolve => window.setTimeout(resolve, 180))
    })
    expect(mocks.getByIds).toHaveBeenCalledWith(
      'notification-test-user',
      expect.arrayContaining([inserted.id, dismissedDuringLoad.id]),
    )

    await act(async () => {
      initialRequest.resolve({
        // This response began before both deltas: it lacks the INSERT and still
        // contains the now-inactive UPDATE row.
        notifications: [dismissedDuringLoad, stable],
        error: null,
      })
      await initialRequest.promise
    })

    await waitFor(() => expect(mocks.getActive).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.notifications.map(item => item.id)).toContain(inserted.id)
    expect(result.current.notifications.map(item => item.id))
      .not.toContain(dismissedDuringLoad.id)
    expect(mocks.getActive).toHaveBeenNthCalledWith(
      2,
      'notification-test-user',
      null,
      51,
    )
  })

  it('ignores an unseen older UPDATE without skipping the intermediate page', async () => {
    const initialWithLookahead = Array.from(
      { length: 51 },
      (_, offset) => notification(100 - offset),
    )
    const nextWithLookahead = Array.from(
      { length: 51 },
      (_, offset) => notification(50 - offset),
    )
    const initialBoundary = notification(51)
    const unseenOlderUpdate = notification(-10)

    mocks.getActive
      .mockResolvedValueOnce({ notifications: initialWithLookahead, error: null })
      .mockResolvedValueOnce({ notifications: nextWithLookahead, error: null })
    mocks.getByIds.mockResolvedValue({
      notifications: [unseenOlderUpdate],
      error: null,
    })

    const { result } = renderHook(() => useNotifications())

    await waitFor(() => expect(result.current.notifications).toHaveLength(50))
    await waitFor(() => expect(mocks.handlers.has('UPDATE')).toBe(true))

    await act(async () => {
      mocks.handlers.get('UPDATE')?.({ new: { id: unseenOlderUpdate.id } })
      await new Promise(resolve => window.setTimeout(resolve, 180))
    })

    expect(result.current.notifications.map(item => item.id))
      .not.toContain(unseenOlderUpdate.id)

    await act(async () => {
      await result.current.loadMore()
    })

    expect(mocks.getActive).toHaveBeenNthCalledWith(
      2,
      'notification-test-user',
      { createdAt: initialBoundary.created_at, id: initialBoundary.id },
      51,
    )
    expect(result.current.notifications.map(item => item.id))
      .toContain(notification(50).id)
    expect(result.current.notifications.map(item => item.id))
      .toContain(notification(49).id)
  })
})
