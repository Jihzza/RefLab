// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  deleteProfileAvatarByUrl: vi.fn(),
}))

vi.mock('@/features/auth/api/profilesApi', () => ({
  getProfile: mocks.getProfile,
  deleteProfileAvatarByUrl: mocks.deleteProfileAvatarByUrl,
}))

import {
  commitProfileUpdateWithAvatarRecovery,
  reconcileDeferredAvatarCleanup,
} from './avatarMutationRecovery'
import {
  AVATAR_CLEANUP_GRACE_MS,
  readDeferredAvatarCleanup,
  rememberDeferredAvatarCleanup,
} from './deferredAvatarCleanup'

const USER = '10000000-0000-4000-8000-000000000001'
const AVATAR = `${USER}/avatars/response-loss.webp`

describe('EditProfile avatar mutation recovery', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mocks.getProfile.mockReset()
    mocks.deleteProfileAvatarByUrl.mockReset().mockResolvedValue({ error: null })
  })

  it('recovers a committed update after a lost response without deleting the new avatar', async () => {
    rememberDeferredAvatarCleanup(USER, AVATAR, 1_000)
    const updateProfile = vi.fn().mockResolvedValue({ error: new Error('network timeout') })
    mocks.getProfile.mockResolvedValue({
      profile: { id: USER, photo_url: AVATAR },
      error: null,
    })

    const result = await commitProfileUpdateWithAvatarRecovery(
      USER,
      { photo_url: AVATAR },
      AVATAR,
      updateProfile,
    )

    expect(updateProfile).toHaveBeenCalledWith({ photo_url: AVATAR })
    expect(mocks.getProfile).toHaveBeenCalledWith(USER)
    expect(result).toEqual({ committed: true, error: null })
    expect(mocks.deleteProfileAvatarByUrl).not.toHaveBeenCalled()
    expect(readDeferredAvatarCleanup(USER)).toEqual([])
  })

  it('survives reload while ambiguous, waits 24 hours, and rechecks before deletion', async () => {
    rememberDeferredAvatarCleanup(USER, AVATAR, 1_000)
    mocks.getProfile.mockResolvedValue({
      profile: { id: USER, photo_url: AVATAR },
      error: null,
    })

    await reconcileDeferredAvatarCleanup(
      USER,
      null,
      1_000 + AVATAR_CLEANUP_GRACE_MS - 1,
    )
    expect(mocks.getProfile).not.toHaveBeenCalled()
    expect(mocks.deleteProfileAvatarByUrl).not.toHaveBeenCalled()
    expect(readDeferredAvatarCleanup(USER)).toHaveLength(1)

    await reconcileDeferredAvatarCleanup(
      USER,
      null,
      1_000 + AVATAR_CLEANUP_GRACE_MS,
    )
    expect(mocks.getProfile).toHaveBeenCalledWith(USER)
    expect(mocks.deleteProfileAvatarByUrl).not.toHaveBeenCalled()
    expect(readDeferredAvatarCleanup(USER)).toEqual([])
  })

  it('deletes only a due candidate proven unreferenced by an authoritative recheck', async () => {
    rememberDeferredAvatarCleanup(USER, AVATAR, 1_000)
    mocks.getProfile.mockResolvedValue({
      profile: { id: USER, photo_url: `${USER}/avatars/current.webp` },
      error: null,
    })

    await reconcileDeferredAvatarCleanup(
      USER,
      null,
      1_000 + AVATAR_CLEANUP_GRACE_MS,
    )

    expect(mocks.getProfile).toHaveBeenCalledWith(USER)
    expect(mocks.deleteProfileAvatarByUrl).toHaveBeenCalledWith(AVATAR, USER)
    expect(readDeferredAvatarCleanup(USER)).toEqual([])
  })
})
