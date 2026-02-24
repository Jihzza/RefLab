import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import type { EnrichedNotification, NotificationType } from '../types'
import { useTranslation } from 'react-i18next'

interface NotificationBannerProps {
  notification: EnrichedNotification
  isUnread: boolean
}

/** Formats a timestamp into a relative time string (e.g. "5m", "2h", "3d"). */
function formatRelativeTime(dateString: string, nowLabel: string): string {
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const seconds = Math.floor((now - date) / 1000)

  if (seconds < 60) return nowLabel
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo`
  return `${Math.floor(months / 12)}y`
}

/** Returns the route to navigate to when a notification is tapped. */
function getNotificationRoute(notification: EnrichedNotification): string | null {
  const { type, actor, reference_id } = notification

  const postTypes: NotificationType[] = [
    'liked_post',
    'comment_on_post',
    'reply_to_comment',
    'mentioned_in_comment',
    'reposted_post',
  ]

  if (postTypes.includes(type)) {
    return reference_id ? `/app/post/${reference_id}` : '/app/social'
  }

  if (type === 'new_follower' && actor?.username) {
    return `/app/profile/${encodeURIComponent(actor.username)}`
  }

  if (type === 'streak_track' || type === 'streak_reminder' || type === 'streak_loss') {
    return '/app/dashboard'
  }

  if (type === 'welcome_to_plan' || type === 'plan_expired' || type === 'plan_expiration_reminder') {
    return '/app/pricing'
  }

  if (type === 'new_content_available') {
    return '/app/tests'
  }

  if (type === 'new_message') {
    return '/app/messages'
  }

  if (type === 'profile_incomplete') {
    return '/app/profile/edit'
  }

  return null
}

function getLocalizedMessage(
  notification: EnrichedNotification,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  switch (notification.type) {
    case 'liked_post':
      return t('liked your post')
    case 'comment_on_post':
      return t('commented on your post')
    case 'reply_to_comment':
      return t('replied to your comment')
    case 'mentioned_in_comment':
      return t('mentioned you in a comment')
    case 'reposted_post':
      return t('reposted your post')
    case 'new_follower':
      return t('started following you')
    case 'new_message':
      return t('sent you a message')
    case 'streak_track':
      return t('You completed a learning activity today. Keep it up!')
    case 'welcome_to_plan':
      return t('Your plan is now active. Enjoy all premium features!')
    case 'plan_expiration_reminder':
      return t('Your plan will expire soon. Renew to keep premium features.')
    case 'plan_expired':
      return t('Your plan has expired. Renew to keep premium features.')
    case 'new_content_available': {
      const match = notification.message.match(/"([^"]+)"/)
      if (match?.[1]) {
        return t('A new test "{{title}}" is now available. Check it out!', { title: match[1] })
      }
      return t('New content is available. Check it out!')
    }
    case 'profile_incomplete':
      return t('Complete your profile to unlock all features.')
    default:
      return t(notification.message)
  }
}

/**
 * NotificationBanner - Renders a single clickable notification row.
 *
 * Layout: [Avatar] [Message + Timestamp] [Unread dot]
 *
 * Tapping a notification navigates to the relevant page.
 * Unread: highlighted background + yellow left border + yellow dot
 * Read: standard surface background
 */
export default function NotificationBanner({
  notification,
  isUnread,
}: NotificationBannerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { actor, created_at } = notification

  // Actor display info (fallback to "RefLab" for system notifications)
  const displayName = actor ? actor.name || actor.username : 'RefLab'
  const initials = displayName.slice(0, 2).toUpperCase()
  const localizedMessage = getLocalizedMessage(notification, t)

  const route = getNotificationRoute(notification)

  const handleClick = () => {
    if (route) navigate(route)
  }

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 transition-colors ${
        route ? 'cursor-pointer active:opacity-80' : ''
      } ${
        isUnread
          ? 'bg-(--bg-surface-2) border-l-2 border-l-(--brand-yellow)'
          : 'bg-(--bg-surface)'
      }`}
      role="listitem"
      aria-label={`${isUnread ? t('Unread notification') : t('Notification')}: ${displayName} ${localizedMessage}`}
      onClick={handleClick}
    >
      {/* Avatar */}
      {actor ? (
        actor.photo_url ? (
          <img
            src={actor.photo_url}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-(--brand-yellow) flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-(--bg-primary)">
              {initials}
            </span>
          </div>
        )
      ) : (
        /* System notification: generic bell icon */
        <div className="w-10 h-10 rounded-full bg-(--bg-surface-2) flex items-center justify-center flex-shrink-0 border border-(--border-subtle)">
          <Bell className="w-5 h-5 text-(--text-muted)" aria-hidden="true" />
        </div>
      )}

      {/* Message + Timestamp */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-(--text-secondary) leading-snug">
          {actor && (
            <span className="font-semibold text-(--text-primary)">
              {displayName}
            </span>
          )}{' '}
          {localizedMessage}
        </p>
        <span className="text-xs text-(--text-muted) mt-0.5 block">
          {formatRelativeTime(created_at, t('now'))}
        </span>
      </div>

      {/* Unread dot indicator */}
      {isUnread && (
        <div
          className="w-2 h-2 rounded-full bg-(--brand-yellow) flex-shrink-0 mt-2"
          aria-hidden="true"
        />
      )}
    </div>
  )
}

/**
 * Skeleton placeholder for loading state.
 * Matches NotificationBanner layout with animated pulse.
 */
export function NotificationBannerSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-(--bg-surface-2) flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-(--bg-surface-2) rounded w-3/4" />
        <div className="h-2 bg-(--bg-surface-2) rounded w-1/4" />
      </div>
    </div>
  )
}
