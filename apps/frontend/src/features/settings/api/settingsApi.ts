import { supabase } from '@/lib/supabaseClient'
import type { SettingsData, BlockedUser, MessagingPrivacy } from '../types'

// ============================================
// Default settings (used when no DB row exists)
// ============================================
const DEFAULT_SETTINGS: SettingsData = {
  settings: {
    messaging_privacy: 'everyone',
  },
  notification_preferences: {
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
  },
}

/**
 * Fetch all user settings in a single RPC call.
 * Returns notification preferences (complete map with defaults) and privacy settings.
 */
export async function fetchAllSettings(
  userId: string
): Promise<{ data: SettingsData; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_user_settings_all', {
    p_user_id: userId,
  })

  if (error) {
    return { data: DEFAULT_SETTINGS, error: new Error(error.message) }
  }

  // RPC returns JSON — merge with defaults for safety
  const result = data as SettingsData | null
  return {
    data: result ?? DEFAULT_SETTINGS,
    error: null,
  }
}

/**
 * Update a single notification preference (upsert).
 */
export async function updateNotificationPreference(
  userId: string,
  notificationType: string,
  enabled: boolean
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      { user_id: userId, notification_type: notificationType, enabled },
      { onConflict: 'user_id,notification_type' }
    )

  return { error: error ? new Error(error.message) : null }
}

/**
 * Update user settings (messaging privacy).
 */
export async function updateUserSettings(
  userId: string,
  updates: Partial<{ messaging_privacy: MessagingPrivacy }>
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('user_settings')
    .update(updates)
    .eq('user_id', userId)

  return { error: error ? new Error(error.message) : null }
}

/**
 * Fetch blocked users with their profile info.
 */
export async function fetchBlockedUsers(
  userId: string
): Promise<{ blockedUsers: BlockedUser[]; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_blocked_users', {
    p_user_id: userId,
  })

  if (error) {
    return { blockedUsers: [], error: new Error(error.message) }
  }

  return { blockedUsers: (data as BlockedUser[]) ?? [], error: null }
}

/**
 * Clear all learning history for a user.
 */
export async function clearLearningHistory(
  userId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc('clear_learning_history', {
    p_user_id: userId,
  })

  return { error: error ? new Error(error.message) : null }
}
