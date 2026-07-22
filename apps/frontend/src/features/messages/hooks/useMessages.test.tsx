import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Message } from '../types'
import { useMessages } from './useMessages'

type RealtimeCallback = (payload: { new: unknown }) => Promise<void>
type RealtimeStatusCallback = (status: string) => void

const mocks = vi.hoisted(() => ({
  auth: {
    current: {
      user: { id: 'user-1' },
      profile: {
        id: 'user-1',
        username: 'referee_one',
        name: 'Referee One',
        photo_url: null,
      },
    },
  },
  getMessages: vi.fn(),
  markConversationRead: vi.fn(),
  sendMessage: vi.fn(),
  profileSingle: vi.fn(),
  removeChannel: vi.fn(),
  realtimeCallbacks: new Map<string, RealtimeCallback>(),
  realtimeStatusCallbacks: new Map<string, RealtimeStatusCallback>(),
}))

vi.mock('@/features/auth/components/useAuth', () => ({
  useAuth: () => mocks.auth.current,
}))

vi.mock('../api/messagesApi', () => ({
  getMessages: mocks.getMessages,
  markConversationRead: mocks.markConversationRead,
  sendMessage: mocks.sendMessage,
}))

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    channel: (name: string) => {
      const channel = {
        on: vi.fn(),
        subscribe: vi.fn(),
      }
      channel.on.mockImplementation(
        (_event: string, _filter: unknown, callback: RealtimeCallback) => {
          mocks.realtimeCallbacks.set(name, callback)
          return channel
        },
      )
      channel.subscribe.mockImplementation((callback?: RealtimeStatusCallback) => {
        if (callback) mocks.realtimeStatusCallbacks.set(name, callback)
        return channel
      })
      return channel
    },
    removeChannel: mocks.removeChannel,
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mocks.profileSingle,
        })),
      })),
    })),
  },
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

function makeMessage(id: string, conversationId: string, senderId = 'other-user'): Message {
  return {
    id,
    conversation_id: conversationId,
    sender_id: senderId,
    content: id,
    media_type: 'text',
    media_url: null,
    created_at: `2026-07-22T12:00:0${id.endsWith('b') ? '2' : '1'}.000Z`,
    sender: {
      id: senderId,
      username: senderId,
      name: senderId,
      photo_url: null,
    },
  }
}

describe('useMessages conversation isolation', () => {
  beforeEach(() => {
    mocks.auth.current = {
      user: { id: 'user-1' },
      profile: {
        id: 'user-1',
        username: 'referee_one',
        name: 'Referee One',
        photo_url: null,
      },
    }
    mocks.getMessages.mockReset()
    mocks.markConversationRead.mockReset().mockResolvedValue({ error: null })
    mocks.sendMessage.mockReset()
    mocks.profileSingle.mockReset()
    mocks.removeChannel.mockReset()
    mocks.realtimeCallbacks.clear()
    mocks.realtimeStatusCallbacks.clear()
  })

  it('discards a slow initial response from the previous conversation', async () => {
    const conversationA = deferred<{ data: Message[]; error: null }>()
    const conversationB = deferred<{ data: Message[]; error: null }>()
    mocks.getMessages.mockImplementation((conversationId: string) => (
      conversationId === 'conversation-a' ? conversationA.promise : conversationB.promise
    ))

    const { result, rerender } = renderHook(
      ({ conversationId }) => useMessages(conversationId),
      { initialProps: { conversationId: 'conversation-a' } },
    )

    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledWith(
      'conversation-a',
      'user-1',
      null,
      30,
    ))

    rerender({ conversationId: 'conversation-b' })
    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledWith(
      'conversation-b',
      'user-1',
      null,
      30,
    ))

    await act(async () => {
      conversationB.resolve({ data: [makeMessage('message-b', 'conversation-b')], error: null })
      await conversationB.promise
    })
    await waitFor(() => expect(result.current.messages.map((message) => message.id)).toEqual(['message-b']))

    await act(async () => {
      conversationA.resolve({ data: [makeMessage('message-a', 'conversation-a')], error: null })
      await conversationA.promise
    })

    expect(result.current.messages.map((message) => message.id)).toEqual(['message-b'])
    expect(mocks.markConversationRead).toHaveBeenCalledWith('conversation-b', 'user-1')
    expect(mocks.markConversationRead).not.toHaveBeenCalledWith('conversation-a', 'user-1')
  })

  it('ignores an old realtime callback that completes after navigation', async () => {
    mocks.getMessages.mockResolvedValue({ data: [], error: null })
    const profileLookup = deferred<{
      data: { id: string; username: string; name: string; photo_url: null }
      error: null
    }>()
    mocks.profileSingle.mockReturnValue(profileLookup.promise)

    const { result, rerender } = renderHook(
      ({ conversationId }) => useMessages(conversationId),
      { initialProps: { conversationId: 'conversation-a' } },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const oldCallback = mocks.realtimeCallbacks.get('messages:conversation-a')
    expect(oldCallback).toBeDefined()
    mocks.markConversationRead.mockClear()

    let callbackPromise!: Promise<void>
    act(() => {
      callbackPromise = oldCallback!({
        new: {
          id: 'realtime-a',
          conversation_id: 'conversation-a',
          sender_id: 'other-user',
          content: 'late message',
          media_type: 'text',
          media_url: null,
          created_at: '2026-07-22T12:00:00.000Z',
        },
      })
    })
    await waitFor(() => expect(mocks.profileSingle).toHaveBeenCalled())

    rerender({ conversationId: 'conversation-b' })
    await waitFor(() => expect(mocks.realtimeCallbacks.has('messages:conversation-b')).toBe(true))

    await act(async () => {
      profileLookup.resolve({
        data: {
          id: 'other-user',
          username: 'other_user',
          name: 'Other User',
          photo_url: null,
        },
        error: null,
      })
      await callbackPromise
    })

    expect(result.current.messages).toEqual([])
    expect(mocks.markConversationRead).not.toHaveBeenCalledWith('conversation-a', 'user-1')
  })

  it('invalidates an initial request when the authenticated user changes', async () => {
    const firstUser = deferred<{ data: Message[]; error: null }>()
    const secondUser = deferred<{ data: Message[]; error: null }>()
    mocks.getMessages.mockImplementation(
      (_conversationId: string, userId: string) => (
        userId === 'user-1' ? firstUser.promise : secondUser.promise
      ),
    )

    const { result, rerender } = renderHook(() => useMessages('conversation-a'))
    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledWith(
      'conversation-a',
      'user-1',
      null,
      30,
    ))

    mocks.auth.current = {
      user: { id: 'user-2' },
      profile: {
        id: 'user-2',
        username: 'referee_two',
        name: 'Referee Two',
        photo_url: null,
      },
    }
    rerender()

    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledWith(
      'conversation-a',
      'user-2',
      null,
      30,
    ))
    await act(async () => {
      secondUser.resolve({ data: [makeMessage('message-b', 'conversation-a', 'user-2')], error: null })
      await secondUser.promise
    })
    await waitFor(() => expect(result.current.messages.map((message) => message.id)).toEqual(['message-b']))

    await act(async () => {
      firstUser.resolve({ data: [makeMessage('message-a', 'conversation-a', 'user-1')], error: null })
      await firstUser.promise
    })

    expect(result.current.messages.map((message) => message.id)).toEqual(['message-b'])
    expect(mocks.markConversationRead).toHaveBeenCalledWith('conversation-a', 'user-2')
    expect(mocks.markConversationRead).not.toHaveBeenCalledWith('conversation-a', 'user-1')
  })

  it('keeps a realtime insert that arrives while the initial fetch is pending', async () => {
    const initial = deferred<{ data: Message[]; error: null }>()
    mocks.getMessages.mockReturnValue(initial.promise)
    mocks.profileSingle.mockResolvedValue({
      data: {
        id: 'other-user',
        username: 'other_user',
        name: 'Other User',
        photo_url: null,
      },
      error: null,
    })

    const { result } = renderHook(() => useMessages('conversation-a'))
    await waitFor(() => expect(mocks.realtimeCallbacks.has('messages:conversation-a')).toBe(true))

    await act(async () => {
      await mocks.realtimeCallbacks.get('messages:conversation-a')!({
        new: {
          id: 'realtime-during-fetch',
          conversation_id: 'conversation-a',
          sender_id: 'other-user',
          content: 'arrived during fetch',
          media_type: 'text',
          media_url: null,
          created_at: '2026-07-22T12:00:03.000Z',
        },
      })
    })
    expect(result.current.messages.map((message) => message.id)).toEqual([
      'realtime-during-fetch',
    ])

    await act(async () => {
      initial.resolve({ data: [], error: null })
      await initial.promise
    })

    expect(result.current.messages.map((message) => message.id)).toEqual([
      'realtime-during-fetch',
    ])
  })

  it('catches up rows committed before realtime subscription acknowledgement', async () => {
    mocks.getMessages
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [makeMessage('message-before-ack', 'conversation-a')],
        error: null,
      })

    const { result } = renderHook(() => useMessages('conversation-a'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.messages).toEqual([])

    act(() => {
      mocks.realtimeStatusCallbacks.get('messages:conversation-a')?.('SUBSCRIBED')
    })

    await waitFor(() => expect(result.current.messages.map((message) => message.id)).toEqual([
      'message-before-ack',
    ]))
    expect(mocks.getMessages).toHaveBeenCalledTimes(2)
  })

  it('disables further sends after the API reports an unavailable conversation', async () => {
    mocks.getMessages.mockResolvedValue({ data: [], error: null })
    mocks.sendMessage.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('Message not sent'), { code: '42501' }),
    })

    const { result } = renderHook(() => useMessages('conversation-a'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await expect(result.current.sendMessage('hello')).rejects.toThrow('Message not sent')
    })

    expect(result.current.isConversationUnavailable).toBe(true)
    expect(result.current.messages).toEqual([])
  })
})
