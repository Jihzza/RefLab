// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NotificationBell from './NotificationBell'

const mocks = vi.hoisted(() => ({
  currentUserId: 'notification-bell-test-user',
  location: { pathname: '/app/dashboard' },
  translate: (key: string) => key,
  getUnread: vi.fn(),
  channels: [] as Array<{
    name: string
    subscribe: null | ((status: string) => void)
  }>,
  removeChannel: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mocks.translate }),
}))

vi.mock('react-router-dom', () => ({
  useLocation: () => mocks.location,
  useNavigate: () => vi.fn(),
}))

vi.mock('@/features/auth/components/useAuth', () => ({
  useAuth: () => ({ user: { id: mocks.currentUserId } }),
}))

vi.mock('../api/notificationsApi', () => ({
  getUnreadCount: mocks.getUnread,
}))

vi.mock('@/components/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  IconButton: ({
    children,
    label,
    onClick,
  }: {
    children: React.ReactNode
    label: string
    onClick: () => void
  }) => (
    <button type="button" aria-label={label} onClick={onClick}>
      {children}
    </button>
  ),
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

beforeEach(() => {
  mocks.currentUserId = 'notification-bell-test-user'
  mocks.getUnread.mockReset()
  mocks.channels.length = 0
  mocks.removeChannel.mockReset().mockResolvedValue(undefined)
})

afterEach(cleanup)

describe('NotificationBell Realtime handoff', () => {
  it('re-fetches unread notifications when the channel reports SUBSCRIBED', async () => {
    mocks.getUnread
      .mockResolvedValueOnce({ count: 1, error: null })
      .mockResolvedValueOnce({ count: 2, error: null })

    render(<NotificationBell />)

    await screen.findByRole('button', { name: 'Notifications (1)' })
    await waitFor(() => expect(mocks.channels[0]?.subscribe).not.toBeNull())

    act(() => mocks.channels[0]?.subscribe?.('SUBSCRIBED'))

    await waitFor(() => expect(mocks.getUnread).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('button', { name: 'Notifications (2)' }))
      .toBeTruthy()
  })

  it('ignores account A callbacks and responses after switching user and unmounting', async () => {
    const accountA = 'notification-account-a'
    const accountB = 'notification-account-b'
    const accountACatchUp = deferred<{ count: number; error: null }>()
    mocks.currentUserId = accountA
    mocks.getUnread.mockImplementation((userId: string) => {
      const userCalls = mocks.getUnread.mock.calls
        .filter(call => call[0] === userId).length
      if (userId === accountA && userCalls === 1) {
        return Promise.resolve({ count: 1, error: null })
      }
      if (userId === accountA) return accountACatchUp.promise
      return Promise.resolve({ count: 2, error: null })
    })

    const { rerender, unmount } = render(<NotificationBell />)
    await screen.findByRole('button', { name: 'Notifications (1)' })
    const accountAChannel = mocks.channels[0]

    act(() => accountAChannel?.subscribe?.('SUBSCRIBED'))
    await waitFor(() => expect(mocks.getUnread).toHaveBeenCalledTimes(2))

    mocks.currentUserId = accountB
    rerender(<NotificationBell />)
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy()
    await screen.findByRole('button', { name: 'Notifications (2)' })
    const requestCountAfterSwitch = mocks.getUnread.mock.calls.length

    act(() => accountAChannel?.subscribe?.('SUBSCRIBED'))
    await new Promise(resolve => window.setTimeout(resolve, 180))
    expect(mocks.getUnread).toHaveBeenCalledTimes(requestCountAfterSwitch)

    await act(async () => {
      accountACatchUp.resolve({ count: 9, error: null })
      await accountACatchUp.promise
    })
    expect(screen.getByRole('button', { name: 'Notifications (2)' }))
      .toBeTruthy()

    const accountBChannel = mocks.channels.at(-1)
    unmount()
    act(() => {
      accountAChannel?.subscribe?.('SUBSCRIBED')
      accountBChannel?.subscribe?.('SUBSCRIBED')
    })
    await new Promise(resolve => window.setTimeout(resolve, 180))
    expect(mocks.getUnread).toHaveBeenCalledTimes(requestCountAfterSwitch)
  })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}
