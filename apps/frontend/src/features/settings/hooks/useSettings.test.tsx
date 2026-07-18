// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  InAppNotificationType,
  MessagingPrivacy,
  NotificationPreferences,
  SettingsData,
} from '../types'
import { useSettings } from './useSettings'

const ACCOUNT_A = 'settings-account-a'
const ACCOUNT_B = 'settings-account-b'

const mocks = vi.hoisted(() => ({
  currentUserId: 'settings-account-a' as string | null,
  fetchAllSettings: vi.fn(),
  updateNotificationPreference: vi.fn(),
  updateUserSettings: vi.fn(),
}))

vi.mock('@/features/auth/components/useAuth', () => ({
  useAuth: () => ({
    user: mocks.currentUserId ? { id: mocks.currentUserId } : null,
  }),
}))

vi.mock('../api/settingsApi', () => ({
  fetchAllSettings: mocks.fetchAllSettings,
  updateNotificationPreference: mocks.updateNotificationPreference,
  updateUserSettings: mocks.updateUserSettings,
}))

beforeEach(() => {
  mocks.currentUserId = ACCOUNT_A
  mocks.fetchAllSettings.mockReset()
  mocks.updateNotificationPreference.mockReset().mockResolvedValue({ error: null })
  mocks.updateUserSettings.mockReset().mockResolvedValue({ error: null })
})

afterEach(cleanup)

describe('useSettings account ownership', () => {
  it('hides A immediately, gates B mutations, and exposes a B load error without A data', async () => {
    const lateAccountA = deferred<{
      data: SettingsData
      error: null
    }>()
    const accountB = deferred<{
      data: SettingsData
      error: Error
    }>()
    let accountACalls = 0

    mocks.fetchAllSettings.mockImplementation((userId: string) => {
      if (userId === ACCOUNT_A) {
        accountACalls += 1
        if (accountACalls === 1) {
          return Promise.resolve({
            data: settingsData('nobody', false),
            error: null,
          })
        }
        return lateAccountA.promise
      }
      return accountB.promise
    })

    const snapshots: SettingsRenderSnapshot[] = []
    const { result, rerender } = renderHook(() => {
      const value = useSettings()
      snapshots.push(snapshot(value))
      return value
    })

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true)
      expect(result.current.settings.messaging_privacy).toBe('nobody')
      expect(result.current.notificationPreferences.liked_post).toBe(false)
    })

    const staleAccountAToggle = result.current.toggleNotification
    const staleAccountAPrivacy = result.current.setMessagingPrivacy
    act(() => result.current.retry())
    await waitFor(() => expect(mocks.fetchAllSettings).toHaveBeenCalledTimes(2))

    const firstAccountBSnapshotIndex = snapshots.length
    mocks.currentUserId = ACCOUNT_B
    rerender()

    const firstAccountBSnapshot = snapshots[firstAccountBSnapshotIndex]
    expect(firstAccountBSnapshot).toMatchObject({
      userId: ACCOUNT_B,
      privacy: 'everyone',
      likedPost: true,
      loading: true,
      hasLoaded: false,
      loadError: null,
    })
    expect(result.current.settings.messaging_privacy).toBe('everyone')
    expect(result.current.notificationPreferences.liked_post).toBe(true)
    await waitFor(() => expect(mocks.fetchAllSettings).toHaveBeenCalledTimes(3))

    await act(async () => {
      firstAccountBSnapshot.toggleNotification('liked_post')
      await firstAccountBSnapshot.setMessagingPrivacy('following')
      staleAccountAToggle('liked_post')
      await staleAccountAPrivacy('mutual')
    })

    expect(mocks.updateNotificationPreference).not.toHaveBeenCalled()
    expect(mocks.updateUserSettings).not.toHaveBeenCalled()
    expect(result.current.settings.messaging_privacy).toBe('everyone')
    expect(result.current.notificationPreferences.liked_post).toBe(true)

    await act(async () => {
      lateAccountA.resolve({
        data: settingsData('following', false),
        error: null,
      })
      await lateAccountA.promise
    })

    expect(result.current.settings.messaging_privacy).toBe('everyone')
    expect(result.current.notificationPreferences.liked_post).toBe(true)

    await act(async () => {
      accountB.resolve({
        data: settingsData('mutual', false),
        error: new Error('Account B settings failed'),
      })
      await accountB.promise
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.loadError).toBe('Account B settings failed')
    })
    expect(result.current.hasLoaded).toBe(false)
    expect(result.current.settings.messaging_privacy).toBe('everyone')
    expect(result.current.notificationPreferences.liked_post).toBe(true)
    expect(mocks.updateNotificationPreference).not.toHaveBeenCalled()
    expect(mocks.updateUserSettings).not.toHaveBeenCalled()
  })

  it('preserves optimistic privacy and debounced notification saves for one account', async () => {
    const privacySave = deferred<{ error: null }>()
    mocks.fetchAllSettings.mockResolvedValue({
      data: settingsData('everyone', true),
      error: null,
    })
    mocks.updateUserSettings.mockReturnValue(privacySave.promise)

    const { result } = renderHook(() => useSettings())
    await waitFor(() => expect(result.current.hasLoaded).toBe(true))

    act(() => result.current.toggleNotification('liked_post'))
    expect(result.current.notificationPreferences.liked_post).toBe(false)

    await waitFor(() => {
      expect(mocks.updateNotificationPreference).toHaveBeenCalledWith(
        ACCOUNT_A,
        'liked_post',
        false,
      )
    }, { timeout: 1_000 })

    let privacyPromise: Promise<void> | undefined
    act(() => {
      privacyPromise = result.current.setMessagingPrivacy('nobody')
    })
    expect(result.current.settings.messaging_privacy).toBe('nobody')
    expect(result.current.privacySaving).toBe(true)
    expect(mocks.updateUserSettings).toHaveBeenCalledWith(ACCOUNT_A, {
      messaging_privacy: 'nobody',
    })

    await act(async () => {
      privacySave.resolve({ error: null })
      await privacyPromise
    })

    expect(result.current.settings.messaging_privacy).toBe('nobody')
    expect(result.current.privacySaving).toBe(false)
  })
})

interface SettingsRenderSnapshot {
  userId: string | null
  privacy: MessagingPrivacy
  likedPost: boolean
  loading: boolean
  hasLoaded: boolean
  loadError: string | null
  toggleNotification: (type: InAppNotificationType) => void
  setMessagingPrivacy: (value: MessagingPrivacy) => Promise<void>
}

function snapshot(value: ReturnType<typeof useSettings>): SettingsRenderSnapshot {
  return {
    userId: mocks.currentUserId,
    privacy: value.settings.messaging_privacy,
    likedPost: value.notificationPreferences.liked_post,
    loading: value.loading,
    hasLoaded: value.hasLoaded,
    loadError: value.loadError,
    toggleNotification: value.toggleNotification,
    setMessagingPrivacy: value.setMessagingPrivacy,
  }
}

function settingsData(
  privacy: MessagingPrivacy,
  likedPost: boolean,
): SettingsData {
  return {
    settings: { messaging_privacy: privacy },
    notification_preferences: {
      ...defaultNotificationPreferences(),
      liked_post: likedPost,
    },
  }
}

function defaultNotificationPreferences(): NotificationPreferences {
  return {
    liked_post: true,
    comment_on_post: true,
    reply_to_comment: true,
    mentioned_in_comment: true,
    reposted_post: true,
    new_follower: true,
    new_message: true,
    streak_track: true,
    streak_reminder: true,
    streak_loss: true,
    new_content_available: true,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}
