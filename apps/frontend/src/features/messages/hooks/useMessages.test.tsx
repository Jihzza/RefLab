// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Message, QueuedMessage } from '../types'
import { useMessages } from './useMessages'

type RealtimePayload = {
  new: Record<string, unknown>
}

type RealtimeChannelHandlers = {
  name: string
  insert: null | ((payload: RealtimePayload) => Promise<void>)
  subscribe: null | ((status: string) => void)
}

const mocks = vi.hoisted(() => ({
  currentUserId: 'message-test-user',
  currentProfile: {
    username: 'referee',
    name: 'Test Referee',
    photo_url: null,
  },
  translate: (key: string) => key,
  getMessages: vi.fn(),
  markRead: vi.fn(),
  listQueued: vi.fn(),
  subscribeOutbox: vi.fn(),
  channels: [] as RealtimeChannelHandlers[],
  removeChannel: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mocks.translate }),
}))

vi.mock('@/features/auth/components/useAuth', () => ({
  useAuth: () => ({
    user: { id: mocks.currentUserId },
    profile: mocks.currentProfile,
  }),
}))

vi.mock('../api/messagesApi', () => ({
  getMessages: mocks.getMessages,
  markConversationRead: mocks.markRead,
}))

vi.mock('../offline/messageOutbox', () => ({
  enqueueMessage: vi.fn(),
  listQueuedMessages: mocks.listQueued,
  subscribeToMessageOutbox: mocks.subscribeOutbox,
}))

vi.mock('../offline/messageOutboxDelivery', () => ({
  discardQueuedMessage: vi.fn(),
  flushMessageOutbox: vi.fn(),
  retryQueuedMessage: vi.fn(),
}))

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    channel: vi.fn((name: string) => {
      const handlers: RealtimeChannelHandlers = {
        name,
        insert: null,
        subscribe: null,
      }
      const channel = {
        on: vi.fn((
          _event: string,
          _filter: Record<string, unknown>,
          handler: (payload: RealtimePayload) => Promise<void>,
        ) => {
          handlers.insert = handler
          return channel
        }),
        subscribe: vi.fn((handler: (status: string) => void) => {
          handlers.subscribe = handler
          return channel
        }),
      }
      mocks.channels.push(handlers)
      return channel
    }),
    from: vi.fn(() => {
      throw new Error('Unexpected public profile lookup in useMessages test')
    }),
    removeChannel: mocks.removeChannel,
  },
}))

const CONVERSATION_ID = 'conversation-1'

function message(
  id: string,
  createdAt: string,
  content: string,
  senderId: string = mocks.currentUserId,
): Message {
  return {
    id,
    conversation_id: CONVERSATION_ID,
    sender_id: senderId,
    client_id: id,
    content,
    media_type: 'text',
    media_url: null,
    created_at: createdAt,
    sender: {
      id: senderId,
      username: mocks.currentProfile.username,
      name: mocks.currentProfile.name,
      photo_url: mocks.currentProfile.photo_url,
    },
  }
}

function realtimeRow(value: Message): RealtimePayload {
  return {
    new: {
      id: value.id,
      conversation_id: value.conversation_id,
      sender_id: value.sender_id,
      client_id: value.client_id,
      content: value.content,
      media_type: value.media_type,
      media_url: value.media_url,
      created_at: value.created_at,
    },
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

beforeEach(() => {
  mocks.currentUserId = 'message-test-user'
  mocks.getMessages.mockReset()
  mocks.markRead.mockReset().mockResolvedValue({ data: null, error: null })
  mocks.listQueued.mockReset().mockResolvedValue([])
  mocks.subscribeOutbox.mockReset().mockReturnValue(vi.fn())
  mocks.channels.length = 0
  mocks.removeChannel.mockReset().mockResolvedValue(undefined)
})

afterEach(cleanup)

describe('useMessages Realtime handoff', () => {
  it('reconciles a delivered fetch row with its persisted outbox operation', async () => {
    const clientId = 'message-client-id'
    const delivered = {
      ...message('message-delivered', '2026-07-18T10:00:00.000Z', 'Delivered'),
      client_id: clientId,
    }
    const queuedRequest = deferred<QueuedMessage[]>()
    mocks.getMessages.mockResolvedValue({ data: [delivered], error: null })
    mocks.listQueued.mockReturnValue(queuedRequest.promise)

    const { result } = renderHook(() => useMessages(CONVERSATION_ID))
    await waitFor(() => expect(result.current.messages).toEqual([delivered]))

    const queued: QueuedMessage = {
      clientId,
      conversationId: CONVERSATION_ID,
      senderId: mocks.currentUserId,
      content: 'Delivered',
      mediaType: 'text',
      mediaBlob: null,
      mediaName: null,
      mediaMimeType: null,
      createdAt: '2026-07-18T09:59:59.000Z',
      state: 'queued',
      attempts: 1,
      lastError: null,
      updatedAt: '2026-07-18T10:00:00.000Z',
    }

    await act(async () => {
      queuedRequest.resolve([queued])
      await queuedRequest.promise
      await Promise.resolve()
    })

    expect(result.current.messages).toEqual([delivered])
    expect(result.current.messages.some(item => item.id === `outbox-${clientId}`)).toBe(false)
  })

  it('preserves an INSERT delivered while the initial SELECT is in flight', async () => {
    const initialRequest = deferred<{ data: Message[]; error: null }>()
    const fetched = message('message-fetched', '2026-07-18T10:00:00.000Z', 'Fetched')
    const inserted = message('message-inserted', '2026-07-18T10:01:00.000Z', 'Realtime')
    mocks.getMessages.mockReturnValueOnce(initialRequest.promise)

    const { result } = renderHook(() => useMessages(CONVERSATION_ID))

    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledOnce())
    await waitFor(() => expect(mocks.channels[0]?.insert).not.toBeNull())

    await act(async () => {
      await mocks.channels[0]?.insert?.(realtimeRow(inserted))
    })

    await act(async () => {
      initialRequest.resolve({ data: [fetched], error: null })
      await initialRequest.promise
    })

    await waitFor(() => {
      expect(result.current.messages.map(item => item.id)).toEqual([
        fetched.id,
        inserted.id,
      ])
    })
    expect(mocks.getMessages).toHaveBeenCalledTimes(1)
  })

  it('catches up a mutation committed before the channel becomes SUBSCRIBED', async () => {
    const initial = message('message-initial', '2026-07-18T10:00:00.000Z', 'Initial')
    const missed = message('message-missed', '2026-07-18T10:01:00.000Z', 'Missed')
    mocks.getMessages
      .mockResolvedValueOnce({ data: [initial], error: null })
      .mockResolvedValueOnce({ data: [missed, initial], error: null })

    const { result } = renderHook(() => useMessages(CONVERSATION_ID))

    await waitFor(() => {
      expect(result.current.messages.map(item => item.id)).toEqual([initial.id])
    })
    await waitFor(() => expect(mocks.channels[0]?.subscribe).not.toBeNull())

    act(() => {
      mocks.channels[0]?.subscribe?.('SUBSCRIBED')
    })

    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledTimes(2))
    await waitFor(() => {
      expect(result.current.messages.map(item => item.id)).toEqual([
        initial.id,
        missed.id,
      ])
    })
    expect(mocks.getMessages).toHaveBeenNthCalledWith(
      2,
      CONVERSATION_ID,
      mocks.currentUserId,
      null,
      30,
    )
  })

  it('hides account A immediately and ignores its late catch-up after switching to B', async () => {
    const accountA = 'message-account-a'
    const accountB = 'message-account-b'
    const visibleA = message(
      'message-a-visible',
      '2026-07-18T10:00:00.000Z',
      'Account A',
      accountA,
    )
    const lateA = message(
      'message-a-late',
      '2026-07-18T10:01:00.000Z',
      'Late account A',
      accountA,
    )
    const visibleB = message(
      'message-b-visible',
      '2026-07-18T10:02:00.000Z',
      'Account B',
      accountB,
    )
    const accountACatchUp = deferred<{ data: Message[]; error: null }>()
    const accountBInitial = deferred<{ data: Message[]; error: null }>()

    mocks.currentUserId = accountA
    mocks.getMessages.mockImplementation((
      _conversationId: string,
      userId: string,
    ) => {
      if (userId === accountA && mocks.getMessages.mock.calls.length === 1) {
        return Promise.resolve({ data: [visibleA], error: null })
      }
      if (userId === accountA) return accountACatchUp.promise
      return accountBInitial.promise
    })

    const { result, rerender } = renderHook(() => useMessages(CONVERSATION_ID))
    await waitFor(() => expect(result.current.messages).toEqual([visibleA]))

    act(() => mocks.channels[0]?.subscribe?.('SUBSCRIBED'))
    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledTimes(2))

    mocks.currentUserId = accountB
    rerender()
    expect(result.current.messages).toEqual([])
    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledTimes(3))

    await act(async () => {
      accountACatchUp.resolve({ data: [lateA, visibleA], error: null })
      await accountACatchUp.promise
    })
    expect(result.current.messages).toEqual([])

    await act(async () => {
      accountBInitial.resolve({ data: [visibleB], error: null })
      await accountBInitial.promise
    })
    await waitFor(() => expect(result.current.messages).toEqual([visibleB]))
    expect(result.current.messages).not.toContainEqual(visibleA)
    expect(result.current.messages).not.toContainEqual(lateA)
  })

  it('retries a failed SUBSCRIBED catch-up and clears its load error on success', async () => {
    const initial = message('message-initial', '2026-07-18T10:00:00.000Z', 'Initial')
    const recovered = message('message-recovered', '2026-07-18T10:01:00.000Z', 'Recovered')
    mocks.getMessages
      .mockResolvedValueOnce({ data: [initial], error: null })
      .mockResolvedValueOnce({ data: [], error: new Error('Catch-up failed') })
      .mockResolvedValueOnce({ data: [recovered, initial], error: null })

    const { result } = renderHook(() => useMessages(CONVERSATION_ID))
    await waitFor(() => expect(result.current.messages).toEqual([initial]))

    act(() => mocks.channels[0]?.subscribe?.('SUBSCRIBED'))
    await waitFor(() => expect(result.current.loadError).toBe('Catch-up failed'))

    act(() => mocks.channels[0]?.subscribe?.('SUBSCRIBED'))
    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledTimes(3))
    await waitFor(() => {
      expect(result.current.loadError).toBeNull()
      expect(result.current.messages.map(item => item.id)).toEqual([
        initial.id,
        recovered.id,
      ])
    })
  })
})
