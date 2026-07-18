// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSearchHistoryStorageKey } from '../utils/searchHistoryStorage'
import { useSearchHistory } from './useSearchHistory'

const mocks = vi.hoisted(() => ({
  currentUserId: null as string | null,
  currentSessionId: null as string | null,
  hydrate: vi.fn(),
}))

vi.mock('@/features/auth/components/useAuth', () => ({
  useAuth: () => ({
    user: mocks.currentUserId ? { id: mocks.currentUserId } : null,
    session: mocks.currentSessionId
      ? { access_token: mocks.currentSessionId }
      : null,
  }),
}))

vi.mock('../api/searchHistoryApi', () => ({
  getSearchHistoryProfiles: mocks.hydrate,
}))

const USER_A = '486d2f31-f7b8-4d8f-a8e0-8247fe543210'
const USER_B = '386d2f31-f7b8-4d8f-a8e0-8247fe543210'
const PROFILE_A = {
  id: '286d2f31-f7b8-4d8f-a8e0-8247fe543210',
  username: 'profile_a',
  name: 'Profile A',
  photo_url: null,
}
const PROFILE_B = {
  id: '186d2f31-f7b8-4d8f-a8e0-8247fe543210',
  username: 'profile_b',
  name: 'Profile B',
  photo_url: null,
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

beforeEach(() => {
  window.localStorage.clear()
  mocks.currentUserId = USER_A
  mocks.currentSessionId = 'session-a-1'
  mocks.hydrate.mockReset()
})

describe('useSearchHistory', () => {
  it('never exposes account A history after switching to account B', async () => {
    window.localStorage.setItem(
      getSearchHistoryStorageKey(USER_A),
      JSON.stringify([PROFILE_A.id]),
    )
    window.localStorage.setItem(
      getSearchHistoryStorageKey(USER_B),
      JSON.stringify([PROFILE_B.id]),
    )
    mocks.hydrate.mockImplementation(async (ids: string[]) => ({
      profiles: ids[0] === PROFILE_A.id ? [PROFILE_A] : [PROFILE_B],
      error: null,
    }))

    const { result, rerender } = renderHook(() => useSearchHistory())
    await waitFor(() => expect(result.current.history).toEqual([PROFILE_A]))

    mocks.currentUserId = USER_B
    mocks.currentSessionId = 'session-b-1'
    rerender()
    await waitFor(() => expect(result.current.history).toEqual([PROFILE_B]))
    expect(result.current.history).not.toContainEqual(PROFILE_A)
  })

  it('drops a cached profile when the server now hides it after a block', async () => {
    window.localStorage.setItem(
      getSearchHistoryStorageKey(USER_A),
      JSON.stringify([PROFILE_A.id]),
    )
    mocks.hydrate.mockResolvedValue({ profiles: [], error: null })

    const { result } = renderHook(() => useSearchHistory())
    await waitFor(() => expect(mocks.hydrate).toHaveBeenCalledWith([PROFILE_A.id]))

    expect(result.current.history).toEqual([])
    expect(window.localStorage.getItem(getSearchHistoryStorageKey(USER_A)))
      .toBe('[]')
  })

  it('persists only the selected profile ID, never its PII', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => result.current.addEntry(PROFILE_A))

    expect(window.localStorage.getItem(getSearchHistoryStorageKey(USER_A)))
      .toBe(JSON.stringify([PROFILE_A.id]))
  })

  it('does not flash a prior profile while the same account rehydrates after logout', async () => {
    window.localStorage.setItem(
      getSearchHistoryStorageKey(USER_A),
      JSON.stringify([PROFILE_A.id]),
    )
    const secondHydration = deferred<{
      profiles: Array<typeof PROFILE_A>
      error: null
    }>()
    mocks.hydrate
      .mockResolvedValueOnce({ profiles: [PROFILE_A], error: null })
      .mockReturnValueOnce(secondHydration.promise)

    const { result, rerender } = renderHook(() => useSearchHistory())
    await waitFor(() => expect(result.current.history).toEqual([PROFILE_A]))

    mocks.currentUserId = null
    mocks.currentSessionId = null
    rerender()
    expect(result.current.history).toEqual([])

    mocks.currentUserId = USER_A
    mocks.currentSessionId = 'session-a-2'
    rerender()
    expect(result.current.history).toEqual([])
    await waitFor(() => expect(mocks.hydrate).toHaveBeenCalledTimes(2))

    await act(async () => {
      secondHydration.resolve({ profiles: [PROFILE_A], error: null })
      await secondHydration.promise
    })
    await waitFor(() => expect(result.current.history).toEqual([PROFILE_A]))
  })

  it('does not let a late hydration overwrite a newer search selection', async () => {
    window.localStorage.setItem(
      getSearchHistoryStorageKey(USER_A),
      JSON.stringify([PROFILE_A.id]),
    )
    const hydration = deferred<{
      profiles: Array<typeof PROFILE_A>
      error: null
    }>()
    mocks.hydrate.mockReturnValue(hydration.promise)

    const { result } = renderHook(() => useSearchHistory())
    await waitFor(() => expect(mocks.hydrate).toHaveBeenCalledOnce())
    act(() => result.current.addEntry(PROFILE_B))

    await act(async () => {
      hydration.resolve({ profiles: [PROFILE_A], error: null })
      await hydration.promise
    })

    expect(result.current.history).toEqual([PROFILE_B])
    expect(window.localStorage.getItem(getSearchHistoryStorageKey(USER_A)))
      .toBe(JSON.stringify([PROFILE_B.id]))
  })

  it('remains usable when the browser blocks the localStorage getter', () => {
    const storageGetter = vi.spyOn(window, 'localStorage', 'get')
      .mockImplementation(() => {
        throw new DOMException('Storage is blocked', 'SecurityError')
      })

    try {
      const { result } = renderHook(() => useSearchHistory())
      act(() => result.current.addEntry(PROFILE_A))
      expect(result.current.history).toEqual([PROFILE_A])
    } finally {
      storageGetter.mockRestore()
    }
  })
})
