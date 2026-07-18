// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  POST_MEDIA_CLEANUP_MAX_ENTRIES,
  POST_MEDIA_CLEANUP_GRACE_MS,
  forgetDeferredPostMediaCleanup,
  isDeferredPostMediaCleanupDue,
  readDeferredPostMediaCleanup,
  rememberDeferredPostMediaCleanup,
} from './deferredPostMediaCleanup'

const USER = '10000000-0000-4000-8000-000000000001'
const PATH = `${USER}/asset.jpg`
const OPERATION = '20000000-0000-4000-8000-000000000001'

describe('deferred post-media cleanup queue', () => {
  beforeEach(() => window.localStorage.clear())

  it('persists operation identity and enforces a full 24-hour grace period', () => {
    rememberDeferredPostMediaCleanup(USER, PATH, OPERATION, 1_000)
    const [entry] = readDeferredPostMediaCleanup(USER, 2_000)
    expect(entry).toEqual({ path: PATH, operationId: OPERATION, createdAt: 1_000 })
    expect(isDeferredPostMediaCleanupDue(entry, 1_000 + POST_MEDIA_CLEANUP_GRACE_MS - 1))
      .toBe(false)
    expect(isDeferredPostMediaCleanupDue(entry, 1_000 + POST_MEDIA_CLEANUP_GRACE_MS))
      .toBe(true)
  })

  it('keeps the original timestamp across response-loss retries', () => {
    rememberDeferredPostMediaCleanup(USER, PATH, OPERATION, 1_000)
    rememberDeferredPostMediaCleanup(USER, PATH, OPERATION, 5_000)
    expect(readDeferredPostMediaCleanup(USER, 6_000)[0]?.createdAt).toBe(1_000)
    forgetDeferredPostMediaCleanup(USER, PATH, OPERATION)
    expect(readDeferredPostMediaCleanup(USER)).toEqual([])
  })

  it('migrates a legacy string queue without making it immediately due', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(OPERATION)
    window.localStorage.setItem(`reflab-post-media-cleanup:${USER}`, JSON.stringify([PATH]))
    const [entry] = readDeferredPostMediaCleanup(USER, 10_000)
    expect(entry.createdAt).toBe(10_000)
    expect(isDeferredPostMediaCleanupDue(entry, 10_001)).toBe(false)
    vi.restoreAllMocks()
  })

  it('preserves the oldest backlog head and newest intent on overflow', () => {
    for (let index = 0; index <= POST_MEDIA_CLEANUP_MAX_ENTRIES; index += 1) {
      rememberDeferredPostMediaCleanup(
        USER,
        `${USER}/asset-${index}.jpg`,
        `operation-${index}`,
        index + 1,
      )
    }

    const entries = readDeferredPostMediaCleanup(USER)
    expect(entries).toHaveLength(POST_MEDIA_CLEANUP_MAX_ENTRIES)
    expect(entries[0]).toMatchObject({ path: `${USER}/asset-0.jpg`, createdAt: 1 })
    expect(entries.at(-1)).toMatchObject({
      path: `${USER}/asset-${POST_MEDIA_CLEANUP_MAX_ENTRIES}.jpg`,
      createdAt: POST_MEDIA_CLEANUP_MAX_ENTRIES + 1,
    })
  })
})
