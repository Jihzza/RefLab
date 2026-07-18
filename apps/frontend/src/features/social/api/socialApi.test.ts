// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const state: { queryData: unknown; queryError: unknown } = {
    queryData: null,
    queryError: null,
  }
  const upload = vi.fn()
  const remove = vi.fn()
  const rpc = vi.fn()
  const makeQuery = () => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {}
    query.select = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.limit = vi.fn(() => query)
    query.maybeSingle = vi.fn(async () => ({
      data: state.queryData,
      error: state.queryError,
    }))
    return query
  }
  return { state, upload, remove, rpc, makeQuery }
})

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    rpc: mocks.rpc,
    from: vi.fn(() => mocks.makeQuery()),
    storage: {
      from: vi.fn(() => ({ upload: mocks.upload, remove: mocks.remove })),
    },
  },
}))

import { createPost, reconcileDeferredPostMediaCleanup } from './socialApi'
import {
  POST_MEDIA_CLEANUP_GRACE_MS,
  readDeferredPostMediaCleanup,
  rememberDeferredPostMediaCleanup,
} from '../utils/deferredPostMediaCleanup'

const USER = '10000000-0000-4000-8000-000000000001'
const OPERATION = '20000000-0000-4000-8000-000000000001'
const MEDIA_ID = '30000000-0000-4000-8000-000000000001'

describe('createPost response-loss reconciliation', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mocks.upload.mockReset().mockResolvedValue({ error: null })
    mocks.remove.mockReset().mockResolvedValue({ error: null })
    mocks.rpc.mockReset().mockResolvedValue({ data: null, error: { message: 'network timeout' } })
    mocks.state.queryData = null
    mocks.state.queryError = null
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce(OPERATION)
      .mockReturnValueOnce(MEDIA_ID)
  })

  afterEach(() => vi.restoreAllMocks())

  it('returns the committed post and never deletes media after a lost RPC response', async () => {
    const path = `${USER}/${MEDIA_ID}.jpg`
    mocks.state.queryData = {
      id: '40000000-0000-4000-8000-000000000001',
      user_id: USER,
      client_id: OPERATION,
      media_url: path,
    }

    const result = await createPost(
      USER,
      'response lost after commit',
      'image',
      new File(['image'], 'image.jpg', { type: 'image/jpeg' }),
    )

    expect(result.error).toBeNull()
    expect(result.post?.client_id).toBe(OPERATION)
    expect(mocks.rpc).toHaveBeenCalledWith('create_social_post', expect.objectContaining({
      p_operation_id: OPERATION,
      p_media_url: path,
    }))
    expect(mocks.remove).not.toHaveBeenCalled()
    expect(readDeferredPostMediaCleanup(USER)).toEqual([])
  })

  it('retains a timestamped cleanup entry when both mutation and recheck are ambiguous', async () => {
    mocks.state.queryError = { message: 'still offline' }
    const result = await createPost(
      USER,
      'ambiguous result',
      'image',
      new File(['image'], 'image.jpg', { type: 'image/jpeg' }),
    )

    expect(result.error?.message).toBe('network timeout')
    expect(mocks.remove).not.toHaveBeenCalled()
    expect(readDeferredPostMediaCleanup(USER)).toEqual([
      expect.objectContaining({
        operationId: OPERATION,
        path: `${USER}/${MEDIA_ID}.jpg`,
      }),
    ])
  })

  it('survives reload, waits 24 hours, and rechecks client_id before cleanup', async () => {
    const path = `${USER}/${MEDIA_ID}.jpg`
    rememberDeferredPostMediaCleanup(USER, path, OPERATION, 1_000)

    await reconcileDeferredPostMediaCleanup(
      USER,
      1_000 + POST_MEDIA_CLEANUP_GRACE_MS - 1,
    )
    expect(mocks.remove).not.toHaveBeenCalled()
    expect(readDeferredPostMediaCleanup(USER)).toHaveLength(1)

    mocks.state.queryData = {
      id: '40000000-0000-4000-8000-000000000001',
      user_id: USER,
      client_id: OPERATION,
      media_url: path,
    }
    await reconcileDeferredPostMediaCleanup(
      USER,
      1_000 + POST_MEDIA_CLEANUP_GRACE_MS,
    )

    expect(mocks.remove).not.toHaveBeenCalled()
    expect(readDeferredPostMediaCleanup(USER)).toEqual([])
  })
})
