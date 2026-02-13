import { supabase } from '@/lib/supabaseClient'
import type { EnrichedNotification } from '../types'

/**
 * Select clause that joins actor profile data from the profiles table.
 * Returns actor as null when actor_id is null (system notifications).
 */
const NOTIFICATION_SELECT = `
  *,
  actor:profiles!notifications_actor_id_fkey (
    id,
    username,
    name,
    photo_url
  )
`

/**
 * Fetch all notifications for the current user (with actor profile data).
 */
export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return { notifications: data as EnrichedNotification[] | null, error }
}

/**
 * Fetch active notifications (not permanently dismissed, with actor data).
 *
 * Returns newest first. System notifications (no actor) will have actor = null.
 */
export async function getActiveNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', userId)
    .eq('dismissed_permanently', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch notifications:', error)
  }

  return { notifications: data as EnrichedNotification[] | null, error }
}

/**
 * Get count of unread notifications.
 */
export async function getUnreadCount(userId: string) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
    .eq('dismissed_permanently', false)

  return { count: count ?? 0, error }
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  return { error }
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)

  return { error }
}

/**
 * Dismiss notification with "remind me later" (shows again tomorrow at 9am).
 */
export async function remindLater(notificationId: string) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)

  const { error } = await supabase
    .from('notifications')
    .update({
      read: true,
      next_reminder_at: tomorrow.toISOString(),
    })
    .eq('id', notificationId)

  return { error }
}

/**
 * Dismiss notification permanently ("don't remind again").
 */
export async function dismissPermanently(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({
      read: true,
      dismissed_permanently: true,
    })
    .eq('id', notificationId)

  return { error }
}

/**
 * Delete the profile completion notification (after profile is complete).
 */
export async function deleteProfileReminder(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('type', 'profile_incomplete')

  return { error }
}
