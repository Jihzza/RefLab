// ============================================
// Notification type identifiers
// ============================================
export type NotificationType =
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
  | 'welcome_to_plan'
  | 'plan_expiration_reminder'
  | 'plan_expired'
  | 'new_content_available'
  | 'profile_incomplete'

// ============================================
// Actor profile subset (joined from profiles table)
// ============================================
export interface NotificationActor {
  id: string
  username: string
  name: string | null
  photo_url: string | null
}

// ============================================
// Enriched notification (with actor data joined)
// ============================================
export interface EnrichedNotification {
  id: string
  user_id: string
  actor_id: string | null
  reference_id: string | null
  type: NotificationType
  title: string
  message: string
  read: boolean
  dismissed_permanently: boolean
  next_reminder_at: string | null
  created_at: string
  updated_at: string
  actor: NotificationActor | null
}
