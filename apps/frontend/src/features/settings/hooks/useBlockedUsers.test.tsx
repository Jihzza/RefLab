// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BlockedUser } from '../types'
import { useBlockedUsers } from './useBlockedUsers'

const ACCOUNT_A = 'blocked-account-a'
const ACCOUNT_B = 'blocked-account-b'
const BLOCKED_A = blockedUser('blocked-by-a', '2026-07-18T11:00:00.000Z')
const LATE_BLOCKED_A = blockedUser('late-blocked-by-a', '2026-07-18T12:00:00.000Z')

const mocks = vi.hoisted(() => ({
  currentUserId: 'blocked-account-a' as string | null,
  fetchBlockedUsers: vi.fn(),
  unblockUser: vi.fn(),
}))

vi.mock('@/features/auth/components/useAuth', () => ({
  useAuth: () => ({
    user: mocks.currentUserId ? { id: mocks.currentUserId } : null,
  }),
}))

vi.mock('../api/settingsApi', () => ({
  fetchBlockedUsers: mocks.fetchBlockedUsers,
}))

vi.mock('@/features/social/api/socialApi', () => ({
  unblockUser: mocks.unblockUser,
}))

beforeEach(() => {
  mocks.currentUserId = ACCOUNT_A
  mocks.fetchBlockedUsers.mockReset()
  mocks.unblockUser.mockReset().mockResolvedValue({ error: null })
})

afterEach(cleanup)

describe('useBlockedUsers account ownership', () => {
  it('hides A immediately, gates unblocks, and exposes a B error without A users', async () => {
    const lateAccountA = deferred<{
      blockedUsers: BlockedUser[]
      error: null
    }>()
    const accountB = deferred<{
      blockedUsers: BlockedUser[]
      error: Error
    }>()
    let accountACalls = 0

    mocks.fetchBlockedUsers.mockImplementation((userId: string) => {
      if (userId === ACCOUNT_A) {
        accountACalls += 1
        if (accountACalls === 1) {
          return Promise.resolve({ blockedUsers: [BLOCKED_A], error: null })
        }
        return lateAccountA.promise
      }
      return accountB.promise
    })

    const snapshots: BlockedUsersRenderSnapshot[] = []
    const { result, rerender } = renderHook(() => {
      const value = useBlockedUsers()
      snapshots.push({
        userId: mocks.currentUserId,
        blockedUsers: value.blockedUsers,
        loading: value.loading,
        error: value.error,
        unblock: value.unblock,
      })
      return value
    })

    await waitFor(() => expect(result.current.blockedUsers).toEqual([BLOCKED_A]))
    const staleAccountAUnblock = result.current.unblock
    act(() => {
      void result.current.retry()
    })
    await waitFor(() => expect(mocks.fetchBlockedUsers).toHaveBeenCalledTimes(2))

    const firstAccountBSnapshotIndex = snapshots.length
    mocks.currentUserId = ACCOUNT_B
    rerender()

    const firstAccountBSnapshot = snapshots[firstAccountBSnapshotIndex]
    expect(firstAccountBSnapshot).toMatchObject({
      userId: ACCOUNT_B,
      blockedUsers: [],
      loading: true,
      error: null,
    })
    expect(result.current.blockedUsers).toEqual([])
    await waitFor(() => expect(mocks.fetchBlockedUsers).toHaveBeenCalledTimes(3))

    await act(async () => {
      await firstAccountBSnapshot.unblock(BLOCKED_A.id)
      await staleAccountAUnblock(BLOCKED_A.id)
      await result.current.unblock(BLOCKED_A.id)
    })

    expect(mocks.unblockUser).not.toHaveBeenCalled()
    expect(result.current.blockedUsers).toEqual([])

    await act(async () => {
      lateAccountA.resolve({
        blockedUsers: [LATE_BLOCKED_A, BLOCKED_A],
        error: null,
      })
      await lateAccountA.promise
    })

    expect(result.current.blockedUsers).toEqual([])

    await act(async () => {
      accountB.resolve({
        blockedUsers: [],
        error: new Error('Account B blocked-users failed'),
      })
      await accountB.promise
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('Account B blocked-users failed')
    })
    expect(result.current.blockedUsers).toEqual([])
    expect(result.current.unblockingIds.size).toBe(0)
    expect(mocks.unblockUser).not.toHaveBeenCalled()
  })

  it('preserves optimistic unblock and rollback for one account', async () => {
    const unblockResponse = deferred<{ error: Error }>()
    mocks.fetchBlockedUsers.mockResolvedValue({
      blockedUsers: [BLOCKED_A],
      error: null,
    })
    mocks.unblockUser.mockReturnValue(unblockResponse.promise)

    const { result } = renderHook(() => useBlockedUsers())
    await waitFor(() => expect(result.current.blockedUsers).toEqual([BLOCKED_A]))

    let unblockPromise: Promise<void> | undefined
    act(() => {
      unblockPromise = result.current.unblock(BLOCKED_A.id)
    })

    expect(result.current.blockedUsers).toEqual([])
    expect(result.current.unblockingIds.has(BLOCKED_A.id)).toBe(true)
    expect(mocks.unblockUser).toHaveBeenCalledWith(ACCOUNT_A, BLOCKED_A.id)

    await act(async () => {
      unblockResponse.resolve({ error: new Error('Unblock failed') })
      await unblockPromise
    })

    expect(result.current.blockedUsers).toEqual([BLOCKED_A])
    expect(result.current.unblockingIds.size).toBe(0)
    expect(result.current.error).toBe('Unblock failed')
  })
})

interface BlockedUsersRenderSnapshot {
  userId: string | null
  blockedUsers: BlockedUser[]
  loading: boolean
  error: string | null
  unblock: (blockedId: string) => Promise<void>
}

function blockedUser(id: string, blockedAt: string): BlockedUser {
  return {
    id,
    username: id,
    name: id,
    photo_url: null,
    blocked_at: blockedAt,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}
