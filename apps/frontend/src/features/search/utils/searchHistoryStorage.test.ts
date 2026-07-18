// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import {
  getSearchHistoryStorageKey,
  readSearchHistoryIds,
  removeLegacySearchHistory,
  writeSearchHistoryIds,
} from './searchHistoryStorage'

const USER_A = '486d2f31-f7b8-4d8f-a8e0-8247fe543210'
const USER_B = '386d2f31-f7b8-4d8f-a8e0-8247fe543210'
const PROFILE = '286d2f31-f7b8-4d8f-a8e0-8247fe543210'

beforeEach(() => window.localStorage.clear())

describe('search history storage', () => {
  it('namespaces IDs by signed-in account and stores no profile PII', () => {
    writeSearchHistoryIds(window.localStorage, USER_A, [PROFILE])

    expect(readSearchHistoryIds(window.localStorage, USER_A)).toEqual([PROFILE])
    expect(readSearchHistoryIds(window.localStorage, USER_B)).toEqual([])
    expect(window.localStorage.getItem(getSearchHistoryStorageKey(USER_A)))
      .toBe(JSON.stringify([PROFILE]))
  })

  it('drops invalid, duplicate and excess IDs', () => {
    const ids = Array.from({ length: 12 }, (_, index) =>
      `${String(index).padStart(8, '0')}-f7b8-4d8f-a8e0-8247fe543210`)
    writeSearchHistoryIds(window.localStorage, USER_A, [ids[0], 'not-a-user', ...ids])

    expect(readSearchHistoryIds(window.localStorage, USER_A)).toEqual(ids.slice(0, 10))
  })

  it('removes the unsafe legacy global PII cache without migration', () => {
    window.localStorage.setItem('search_history', JSON.stringify([{ id: PROFILE, name: 'PII' }]))
    window.localStorage.setItem('search:history_users', JSON.stringify([{ id: PROFILE, name: 'PII' }]))
    removeLegacySearchHistory(window.localStorage)
    expect(window.localStorage.getItem('search_history')).toBeNull()
    expect(window.localStorage.getItem('search:history_users')).toBeNull()
  })
})
