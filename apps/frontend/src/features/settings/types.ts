// ============================================
// In-app notification types that users can toggle
// ============================================
export type InAppNotificationType =
  | 'liked_post'
  | 'comment_on_post'
  | 'reply_to_comment'
  | 'mentioned_in_comment'
  | 'reposted_post'
  | 'new_follower'
  | 'new_message'
  | 'streak_track'
  | 'streak_reminder'
  | 'streak_loss'
  | 'new_content_available'

// ============================================
// Privacy: who can message me
// ============================================
export type MessagingPrivacy = 'everyone' | 'following' | 'mutual' | 'nobody'

// ============================================
// Notification preferences map (type -> enabled)
// ============================================
export type NotificationPreferences = Record<InAppNotificationType, boolean>

// ============================================
// User settings (privacy & general)
// ============================================
export interface UserSettings {
  messaging_privacy: MessagingPrivacy
}

// ============================================
// Combined settings data from RPC
// ============================================
export interface SettingsData {
  settings: UserSettings
  notification_preferences: NotificationPreferences
}

// ============================================
// Blocked user (for list display)
// ============================================
export interface BlockedUser {
  id: string
  username: string
  name: string | null
  photo_url: string | null
  blocked_at: string
}

// ============================================
// Notification toggle item (for UI grouping)
// ============================================
export interface NotificationToggleItem {
  key: InAppNotificationType
  label: string
  description?: string
}
