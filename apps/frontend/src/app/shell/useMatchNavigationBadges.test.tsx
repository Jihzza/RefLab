// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMatchNavigationBadges } from './useMatchNavigationBadges'

const mocks = vi.hoisted(() => ({
  user: { id: 'navigation-badge-test-user' },
  location: { pathname: '/app/dashboard' },
  getUnread: vi.fn(),
  flushOutbox: vi.fn(),
  subscribeHandler: null as null | ((status: string) => void),
  removeChannel: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useLocation: () => mocks.location,
}))

vi.mock('@/features/auth/components/useAuth', () => ({
  useAuth: () => ({ user: mocks.user }),
}))

vi.mock('@/features/messages/api/messagesApi', () => ({
  getTotalUnreadCount: mocks.getUnread,
}))

vi.mock('@/features/messages/offline/messageOutboxDelivery', () => ({
  flushMessageOutbox: mocks.flushOutbox,
}))

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    channel: vi.fn(() => {
      const channel = {
        on: vi.fn(() => channel),
        subscribe: vi.fn((handler: (status: string) => void) => {
          mocks.subscribeHandler = handler
          return channel
        }),
      }
      return channel
    }),
    removeChannel: mocks.removeChannel,
  },
}))

beforeEach(() => {
  mocks.getUnread.mockReset()
  mocks.flushOutbox.mockReset().mockResolvedValue([])
  mocks.subscribeHandler = null
  mocks.removeChannel.mockReset().mockResolvedValue(undefined)
})

afterEach(cleanup)

describe('useMatchNavigationBadges Realtime handoff', () => {
  it('re-fetches unread messages when the channel reports SUBSCRIBED', async () => {
    mocks.getUnread
      .mockResolvedValueOnce({ data: 1, error: null })
      .mockResolvedValueOnce({ data: 2, error: null })

    const { result } = renderHook(() => useMatchNavigationBadges())

    await waitFor(() => expect(result.current.messages).toBe(1))
    await waitFor(() => expect(mocks.subscribeHandler).not.toBeNull())

    act(() => mocks.subscribeHandler?.('SUBSCRIBED'))

    await waitFor(() => expect(mocks.getUnread).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.messages).toBe(2))
  })
})
