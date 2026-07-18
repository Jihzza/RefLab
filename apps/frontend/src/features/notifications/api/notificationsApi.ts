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

export interface NotificationCursor {
  createdAt: string
  id: string
}

/**
 * Fetch all notifications for the current user (with actor profile data).
 */
export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(50)

  return { notifications: data as EnrichedNotification[] | null, error }
}

/**
 * Fetch active notifications (not permanently dismissed, with actor data).
 *
 * Returns newest first. System notifications (no actor) will have actor = null.
 */
export async function getActiveNotifications(
  userId: string,
  cursor: NotificationCursor | null = null,
  limit: number = 50,
) {
  let query = supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', userId)
    .eq('dismissed_permanently', false)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)))

  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    )
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch notifications:', error)
  }

  return { notifications: data as EnrichedNotification[] | null, error }
}

/** Fetch only rows changed by Realtime, retaining the same active-row rule. */
export async function getActiveNotificationsByIds(
  userId: string,
  notificationIds: string[],
) {
  if (notificationIds.length === 0) {
    return { notifications: [] as EnrichedNotification[], error: null }
  }

  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', userId)
    .eq('dismissed_permanently', false)
    .in('id', notificationIds)

  return { notifications: (data ?? []) as EnrichedNotification[], error }
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
 * Mark the exact fetched notification snapshot as read for a user. Scoping the
 * update to IDs prevents a notification inserted between SELECT and UPDATE
 * from being silently consumed without ever appearing unread.
 */
export async function markNotificationsAsRead(
  userId: string,
  notificationIds: string[],
) {
  if (notificationIds.length === 0) return { error: null }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .in('id', notificationIds)

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
 * Dismiss the profile completion notification after the profile is complete.
 * Client-side deletes are intentionally blocked by notifications RLS; owners
 * can update their own rows.
 */
export async function dismissProfileReminder(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({
      read: true,
      dismissed_permanently: true,
    })
    .eq('user_id', userId)
    .eq('type', 'profile_incomplete')

  return { error }
}
