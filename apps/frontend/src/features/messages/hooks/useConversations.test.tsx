// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Conversation } from '../types'
import { useConversations } from './useConversations'

const mocks = vi.hoisted(() => ({
  currentUserId: 'conversation-test-user',
  getConversations: vi.fn(),
  getUnread: vi.fn(),
  channels: [] as Array<{
    name: string
    subscribe: null | ((status: string) => void)
  }>,
  removeChannel: vi.fn(),
}))

vi.mock('@/features/auth/components/useAuth', () => ({
  useAuth: () => ({ user: { id: mocks.currentUserId } }),
}))

vi.mock('../api/messagesApi', () => ({
  getConversations: mocks.getConversations,
  getTotalUnreadCount: mocks.getUnread,
}))

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    channel: vi.fn((name: string) => {
      const handlers = {
        name,
        subscribe: null as null | ((status: string) => void),
      }
      const channel = {
        on: vi.fn(() => channel),
        subscribe: vi.fn((handler: (status: string) => void) => {
          handlers.subscribe = handler
          return channel
        }),
      }
      mocks.channels.push(handlers)
      return channel
    }),
    removeChannel: mocks.removeChannel,
  },
}))

function conversation(id: string): Conversation {
  return {
    id,
    updated_at: '2026-07-18T10:00:00.000Z',
    other_user: {
      id: `participant-${id}`,
      username: `participant_${id}`,
      name: `Participant ${id}`,
      photo_url: null,
    },
    last_message: null,
    unread_count: 0,
  }
}

beforeEach(() => {
  mocks.currentUserId = 'conversation-test-user'
  mocks.getConversations.mockReset()
  mocks.getUnread.mockReset()
  mocks.channels.length = 0
  mocks.removeChannel.mockReset().mockResolvedValue(undefined)
})

afterEach(cleanup)

describe('useConversations Realtime handoff', () => {
  it('refreshes the snapshot after the channel reports SUBSCRIBED', async () => {
    const initial = conversation('initial')
    const missed = conversation('missed-before-subscribe')
    mocks.getConversations
      .mockResolvedValueOnce({ data: [initial], error: null })
      .mockResolvedValueOnce({ data: [missed, initial], error: null })
    mocks.getUnread
      .mockResolvedValueOnce({ data: 1, error: null })
      .mockResolvedValueOnce({ data: 2, error: null })

    const { result } = renderHook(() => useConversations())

    await waitFor(() => expect(result.current.conversations).toEqual([initial]))
    await waitFor(() => expect(mocks.channels[0]?.subscribe).not.toBeNull())

    act(() => mocks.channels[0]?.subscribe?.('SUBSCRIBED'))

    await waitFor(() => expect(mocks.getConversations).toHaveBeenCalledTimes(2))
    await waitFor(() => {
      expect(result.current.conversations).toEqual([missed, initial])
      expect(result.current.totalUnread).toBe(2)
    })
  })

  it('owner-gates account A and ignores its late response and stale channel callback', async () => {
    const accountA = 'conversation-account-a'
    const accountB = 'conversation-account-b'
    const visibleA = conversation('account-a')
    const lateA = conversation('account-a-late')
    const visibleB = conversation('account-b')
    const accountAConversations = deferred<{
      data: Conversation[]
      error: null
    }>()
    const accountAUnread = deferred<{ data: number; error: null }>()

    mocks.currentUserId = accountA
    mocks.getConversations.mockImplementation((userId: string) => {
      const userCalls = mocks.getConversations.mock.calls
        .filter(call => call[0] === userId).length
      if (userId === accountA && userCalls === 1) {
        return Promise.resolve({ data: [visibleA], error: null })
      }
      if (userId === accountA) return accountAConversations.promise
      return Promise.resolve({ data: [visibleB], error: null })
    })
    mocks.getUnread.mockImplementation((userId: string) => {
      const userCalls = mocks.getUnread.mock.calls
        .filter(call => call[0] === userId).length
      if (userId === accountA && userCalls === 1) {
        return Promise.resolve({ data: 1, error: null })
      }
      if (userId === accountA) return accountAUnread.promise
      return Promise.resolve({ data: 2, error: null })
    })

    const { result, rerender } = renderHook(() => useConversations())
    await waitFor(() => expect(result.current.conversations).toEqual([visibleA]))
    const accountAChannel = mocks.channels[0]

    act(() => accountAChannel?.subscribe?.('SUBSCRIBED'))
    await waitFor(() => expect(mocks.getConversations).toHaveBeenCalledTimes(2))

    mocks.currentUserId = accountB
    rerender()
    expect(result.current.conversations).toEqual([])
    expect(result.current.totalUnread).toBe(0)

    await waitFor(() => expect(result.current.conversations).toEqual([visibleB]))
    expect(result.current.totalUnread).toBe(2)
    const requestCountAfterSwitch = mocks.getConversations.mock.calls.length

    act(() => accountAChannel?.subscribe?.('SUBSCRIBED'))
    await new Promise(resolve => window.setTimeout(resolve, 180))
    expect(mocks.getConversations).toHaveBeenCalledTimes(requestCountAfterSwitch)

    await act(async () => {
      accountAConversations.resolve({ data: [lateA, visibleA], error: null })
      accountAUnread.resolve({ data: 99, error: null })
      await Promise.all([accountAConversations.promise, accountAUnread.promise])
    })
    expect(result.current.conversations).toEqual([visibleB])
    expect(result.current.totalUnread).toBe(2)
  })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}
