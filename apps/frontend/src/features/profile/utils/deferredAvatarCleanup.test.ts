// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import {
  AVATAR_CLEANUP_MAX_ENTRIES,
  AVATAR_CLEANUP_GRACE_MS,
  forgetDeferredAvatarCleanup,
  isDeferredAvatarCleanupDue,
  readDeferredAvatarCleanup,
  rememberDeferredAvatarCleanup,
} from './deferredAvatarCleanup'

const USER = '10000000-0000-4000-8000-000000000001'
const URL = `${USER}/avatars/avatar.webp`

describe('deferred avatar cleanup queue', () => {
  beforeEach(() => window.localStorage.clear())

  it('survives reload and cannot become due before 24 hours', () => {
    rememberDeferredAvatarCleanup(USER, URL, 1_000)
    const [entry] = readDeferredAvatarCleanup(USER, 2_000)
    expect(entry).toEqual({ url: URL, createdAt: 1_000 })
    expect(isDeferredAvatarCleanupDue(entry, 1_000 + AVATAR_CLEANUP_GRACE_MS - 1))
      .toBe(false)
    expect(isDeferredAvatarCleanupDue(entry, 1_000 + AVATAR_CLEANUP_GRACE_MS))
      .toBe(true)
  })

  it('does not reset age on repeated ambiguous failures', () => {
    rememberDeferredAvatarCleanup(USER, URL, 1_000)
    rememberDeferredAvatarCleanup(USER, URL, 5_000)
    expect(readDeferredAvatarCleanup(USER, 6_000)[0]?.createdAt).toBe(1_000)
    forgetDeferredAvatarCleanup(USER, URL)
    expect(readDeferredAvatarCleanup(USER)).toEqual([])
  })

  it('preserves the oldest backlog head and newest intent on overflow', () => {
    for (let index = 0; index <= AVATAR_CLEANUP_MAX_ENTRIES; index += 1) {
      rememberDeferredAvatarCleanup(USER, `${USER}/avatars/avatar-${index}.webp`, index + 1)
    }

    const entries = readDeferredAvatarCleanup(USER)
    expect(entries).toHaveLength(AVATAR_CLEANUP_MAX_ENTRIES)
    expect(entries[0]).toEqual({ url: `${USER}/avatars/avatar-0.webp`, createdAt: 1 })
    expect(entries.at(-1)).toEqual({
      url: `${USER}/avatars/avatar-${AVATAR_CLEANUP_MAX_ENTRIES}.webp`,
      createdAt: AVATAR_CLEANUP_MAX_ENTRIES + 1,
    })
  })
})
