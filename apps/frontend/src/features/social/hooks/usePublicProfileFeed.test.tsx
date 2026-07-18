// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Post } from '../types'
import { usePublicProfileFeed } from './usePublicProfileFeed'

const VIEWER_A = 'profile-feed-viewer-a'
const VIEWER_B = 'profile-feed-viewer-b'
const TARGET_USER = 'profile-feed-target'

const mocks = vi.hoisted(() => ({
  getPublicProfileFeed: vi.fn(),
}))

vi.mock('../api/socialApi', () => ({
  getPublicProfileFeed: mocks.getPublicProfileFeed,
}))

beforeEach(() => {
  mocks.getPublicProfileFeed.mockReset()
})

afterEach(cleanup)

describe('usePublicProfileFeed owner scope', () => {
  it('hides viewer A posts until the same target is loaded for viewer B', async () => {
    const postA = post('post-visible-to-a', 'Viewer A relationship state')
    const postB = post('post-visible-to-b', 'Viewer B relationship state')
    const accountBResponse = deferred<{
      posts: Post[]
      error: null
    }>()
    let viewerId = VIEWER_A

    mocks.getPublicProfileFeed.mockImplementation((requestedViewerId: string) => {
      if (requestedViewerId === VIEWER_A) {
        return Promise.resolve({ posts: [postA], error: null })
      }
      return accountBResponse.promise
    })

    const { result, rerender } = renderHook(() => (
      usePublicProfileFeed(viewerId, TARGET_USER, true)
    ))

    await waitFor(() => expect(result.current.posts).toEqual([postA]))

    viewerId = VIEWER_B
    rerender()

    expect(result.current.posts).toEqual([])
    expect(result.current.isLoading).toBe(true)
    expect(result.current.hasInitiallyLoaded).toBe(false)
    expect(result.current.error).toBeNull()
    await waitFor(() => expect(mocks.getPublicProfileFeed).toHaveBeenCalledTimes(2))

    await act(async () => {
      accountBResponse.resolve({ posts: [postB], error: null })
      await accountBResponse.promise
    })

    await waitFor(() => expect(result.current.posts).toEqual([postB]))
    expect(result.current.posts).not.toContainEqual(postA)
    expect(result.current.isLoading).toBe(false)
    expect(mocks.getPublicProfileFeed).toHaveBeenNthCalledWith(
      1,
      VIEWER_A,
      TARGET_USER,
      null,
      20,
    )
    expect(mocks.getPublicProfileFeed).toHaveBeenNthCalledWith(
      2,
      VIEWER_B,
      TARGET_USER,
      null,
      20,
    )
  })
})

function post(id: string, content: string): Post {
  return {
    id,
    content,
    media_type: 'text',
    media_url: null,
    media_metadata: null,
    original_post_id: null,
    like_count: 0,
    comment_count: 0,
    repost_count: 0,
    save_count: 0,
    created_at: '2026-07-18T12:00:00.000Z',
    author: {
      id: TARGET_USER,
      username: 'shared_target',
      name: 'Shared target',
      photo_url: null,
    },
    original_post: null,
    is_liked: false,
    is_saved: false,
    is_reposted: false,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}
