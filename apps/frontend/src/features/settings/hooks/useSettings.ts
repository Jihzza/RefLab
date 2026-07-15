import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import {
  fetchAllSettings,
  updateNotificationPreference,
  updateUserSettings,
} from '../api/settingsApi'
import type {
  InAppNotificationType,
  MessagingPrivacy,
  NotificationPreferences,
  UserSettings,
} from '../types'

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
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

const DEFAULT_SETTINGS: UserSettings = {
  messaging_privacy: 'everyone',
}

const DEBOUNCE_MS = 300

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Unexpected settings error')
}

interface NotificationFlush {
  userId: string
  promise: Promise<void>
}

export function useSettings() {
  const { user } = useAuth()
  const userId = user?.id

  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>({ ...DEFAULT_NOTIFICATION_PREFS })
  const [settings, setSettings] = useState<UserSettings>({ ...DEFAULT_SETTINGS })
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveErrorScope, setSaveErrorScope] = useState<'notifications' | 'privacy' | null>(null)
  const [notificationSaving, setNotificationSaving] = useState(false)
  const [privacySaving, setPrivacySaving] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const mountedRef = useRef(true)
  const activeUserIdRef = useRef(userId)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingUpdatesRef = useRef<Map<InAppNotificationType, boolean>>(new Map())
  const pendingUpdatesUserIdRef = useRef<string | undefined>(undefined)
  const persistedNotificationsRef = useRef<NotificationPreferences>({
    ...DEFAULT_NOTIFICATION_PREFS,
  })
  const persistedSettingsRef = useRef<UserSettings>({ ...DEFAULT_SETTINGS })
  const notificationFlushRef = useRef<NotificationFlush | null>(null)
  const privacyRequestRef = useRef(0)
  const privacyInFlightRef = useRef(false)

  activeUserIdRef.current = userId

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      pendingUpdatesRef.current.clear()
      pendingUpdatesUserIdRef.current = undefined
      persistedNotificationsRef.current = { ...DEFAULT_NOTIFICATION_PREFS }
      persistedSettingsRef.current = { ...DEFAULT_SETTINGS }
      setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFS })
      setSettings({ ...DEFAULT_SETTINGS })
      setHasLoaded(false)
      setLoadError(null)
      setSaveError(null)
      setSaveErrorScope(null)
      setNotificationSaving(false)
      setPrivacySaving(false)
      privacyInFlightRef.current = false
      setLoading(false)
      return
    }

    const authenticatedUserId = userId
    if (
      pendingUpdatesUserIdRef.current &&
      pendingUpdatesUserIdRef.current !== authenticatedUserId
    ) {
      pendingUpdatesRef.current.clear()
      pendingUpdatesUserIdRef.current = undefined
    }
    let cancelled = false

    async function loadSettings() {
      setLoading(true)
      setHasLoaded(false)
      setLoadError(null)
      setSaveError(null)
      setSaveErrorScope(null)
      setPrivacySaving(false)
      privacyInFlightRef.current = false

      try {
        const { data, error } = await fetchAllSettings(authenticatedUserId)
        if (cancelled) return

        if (error) {
          setLoadError(error.message)
          return
        }

        const nextSettings = {
          ...DEFAULT_SETTINGS,
          ...data.settings,
        }
        const nextNotifications = {
          ...DEFAULT_NOTIFICATION_PREFS,
          ...data.notification_preferences,
        }

        persistedSettingsRef.current = nextSettings
        persistedNotificationsRef.current = nextNotifications
        setSettings(nextSettings)
        setNotificationPreferences(nextNotifications)
        setHasLoaded(true)
      } catch (error) {
        if (!cancelled) setLoadError(toError(error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadSettings()

    return () => {
      cancelled = true
    }
  }, [reloadToken, userId])

  const flushPendingUpdates = useCallback((): Promise<void> => {
    if (!userId) return Promise.resolve()

    const activeFlush = notificationFlushRef.current
    if (activeFlush?.userId === userId) return activeFlush.promise
    if (
      pendingUpdatesUserIdRef.current !== userId ||
      pendingUpdatesRef.current.size === 0
    ) {
      return Promise.resolve()
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    const run = async () => {
      if (mountedRef.current && activeUserIdRef.current === userId) {
        setNotificationSaving(true)
      }

      const latestErrorsByType = new Map<InAppNotificationType, Error>()

      while (
        pendingUpdatesUserIdRef.current === userId &&
        pendingUpdatesRef.current.size > 0
      ) {
        const updates = new Map(pendingUpdatesRef.current)
        pendingUpdatesRef.current.clear()

        const results = await Promise.all(
          Array.from(updates.entries()).map(async ([type, enabled]) => {
            try {
              const result = await updateNotificationPreference(userId, type, enabled)
              return { type, enabled, error: result.error }
            } catch (error) {
              return { type, enabled, error: toError(error) }
            }
          }),
        )

        const isCurrentUser = activeUserIdRef.current === userId

        for (const result of results) {
          if (result.error) {
            latestErrorsByType.set(result.type, result.error)

            if (
              isCurrentUser &&
              mountedRef.current &&
              !pendingUpdatesRef.current.has(result.type)
            ) {
              const persistedValue = persistedNotificationsRef.current[result.type]
              setNotificationPreferences((current) => (
                current[result.type] === result.enabled
                  ? { ...current, [result.type]: persistedValue }
                  : current
              ))
            }
          } else if (isCurrentUser) {
            latestErrorsByType.delete(result.type)
            persistedNotificationsRef.current = {
              ...persistedNotificationsRef.current,
              [result.type]: result.enabled,
            }
          }
        }

        if (!isCurrentUser) break
      }

      const latestError = latestErrorsByType.values().next().value
      if (latestError && mountedRef.current && activeUserIdRef.current === userId) {
        setSaveError(latestError.message)
        setSaveErrorScope('notifications')
      }
    }

    const promise = run().finally(() => {
      if (notificationFlushRef.current?.promise === promise) {
        notificationFlushRef.current = null
      }
      if (
        pendingUpdatesUserIdRef.current === userId &&
        pendingUpdatesRef.current.size === 0
      ) {
        pendingUpdatesUserIdRef.current = undefined
      }
      if (mountedRef.current && activeUserIdRef.current === userId) {
        setNotificationSaving(false)
      }
    })

    notificationFlushRef.current = { userId, promise }
    return promise
  }, [userId])

  const toggleNotification = useCallback(
    (type: InAppNotificationType) => {
      if (!userId || !hasLoaded || loading) return

      setSaveError(null)
      setSaveErrorScope(null)
      setNotificationPreferences((current) => {
        const nextValue = !current[type]
        if (pendingUpdatesUserIdRef.current !== userId) {
          pendingUpdatesRef.current.clear()
          pendingUpdatesUserIdRef.current = userId
        }
        pendingUpdatesRef.current.set(type, nextValue)
        return { ...current, [type]: nextValue }
      })

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        void flushPendingUpdates()
      }, DEBOUNCE_MS)
    },
    [flushPendingUpdates, hasLoaded, loading, userId],
  )

  const setMessagingPrivacy = useCallback(
    async (value: MessagingPrivacy) => {
      if (!userId || !hasLoaded || privacyInFlightRef.current) return
      if (settings.messaging_privacy === value) return

      const previousValue = persistedSettingsRef.current.messaging_privacy
      const requestId = privacyRequestRef.current + 1
      privacyRequestRef.current = requestId

      setSaveError(null)
      setSaveErrorScope(null)
      privacyInFlightRef.current = true
      setPrivacySaving(true)
      setSettings((current) => ({ ...current, messaging_privacy: value }))

      let saveFailure: Error | null = null

      try {
        const { error } = await updateUserSettings(userId, {
          messaging_privacy: value,
        })
        saveFailure = error
      } catch (error) {
        saveFailure = toError(error)
      }

      if (activeUserIdRef.current !== userId || !mountedRef.current) {
        if (privacyRequestRef.current === requestId) {
          privacyInFlightRef.current = false
        }
        return
      }

      if (privacyRequestRef.current !== requestId) {
        return
      }

      if (saveFailure) {
        setSettings((current) => (
          current.messaging_privacy === value
            ? { ...current, messaging_privacy: previousValue }
            : current
        ))
        setSaveError(saveFailure.message)
        setSaveErrorScope('privacy')
      } else {
        persistedSettingsRef.current = {
          ...persistedSettingsRef.current,
          messaging_privacy: value,
        }
      }

      privacyInFlightRef.current = false
      setPrivacySaving(false)
    },
    [hasLoaded, settings.messaging_privacy, userId],
  )

  useEffect(() => () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (pendingUpdatesRef.current.size > 0) {
      void flushPendingUpdates()
    }
  }, [flushPendingUpdates])

  return {
    settings,
    notificationPreferences,
    loading,
    hasLoaded,
    error: loadError,
    loadError,
    saveError,
    saveErrorScope,
    saving: notificationSaving || privacySaving,
    notificationSaving,
    privacySaving,
    toggleNotification,
    setMessagingPrivacy,
    retry: () => setReloadToken((current) => current + 1),
    clearSaveError: () => {
      setSaveError(null)
      setSaveErrorScope(null)
    },
  }
}
