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

// Defaults used before DB data loads or when no row exists
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

export function useSettings() {
  const { user } = useAuth()

  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS)
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Debounce timer ref for notification toggles
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  // Pending notification updates to batch-save
  const pendingUpdatesRef = useRef<Map<InAppNotificationType, boolean>>(new Map())

  // Load all settings on mount
  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await fetchAllSettings(user!.id)

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      setSettings(data.settings)
      setNotificationPreferences(data.notification_preferences)
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Flush pending notification preference updates to the DB
  const flushPendingUpdates = useCallback(async () => {
    if (!user?.id || pendingUpdatesRef.current.size === 0) return

    setSaving(true)
    const updates = new Map(pendingUpdatesRef.current)
    pendingUpdatesRef.current.clear()

    // Save each pending update (parallel)
    const promises = Array.from(updates.entries()).map(([type, enabled]) =>
      updateNotificationPreference(user!.id, type, enabled)
    )

    const results = await Promise.all(promises)
    const failed = results.find((r) => r.error)

    if (failed?.error) {
      console.error('Failed to save notification preference:', failed.error)
    }

    setSaving(false)
  }, [user?.id])

  // Toggle a notification preference (optimistic + debounced save)
  const toggleNotification = useCallback(
    (type: InAppNotificationType) => {
      setNotificationPreferences((prev) => {
        const newValue = !prev[type]
        pendingUpdatesRef.current.set(type, newValue)
        return { ...prev, [type]: newValue }
      })

      // Debounce: coalesce rapid toggles into one save
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        flushPendingUpdates()
      }, DEBOUNCE_MS)
    },
    [flushPendingUpdates]
  )

  // Update messaging privacy (immediate save)
  const setMessagingPrivacy = useCallback(
    async (value: MessagingPrivacy) => {
      if (!user?.id) return

      // Optimistic update
      setSettings((prev) => ({ ...prev, messaging_privacy: value }))

      setSaving(true)
      const { error: saveError } = await updateUserSettings(user.id, {
        messaging_privacy: value,
      })
      setSaving(false)

      if (saveError) {
        console.error('Failed to update messaging privacy:', saveError)
        // Revert on error
        setSettings((prev) => ({ ...prev, messaging_privacy: prev.messaging_privacy }))
      }
    },
    [user?.id]
  )

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      // Flush any pending saves
      if (pendingUpdatesRef.current.size > 0) {
        flushPendingUpdates()
      }
    }
  }, [flushPendingUpdates])

  return {
    settings,
    notificationPreferences,
    loading,
    error,
    saving,
    toggleNotification,
    setMessagingPrivacy,
  }
}
