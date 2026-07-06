import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Heart,
  MessageCircle,
  Reply,
  AtSign,
  Repeat2,
  UserPlus,
  Mail,
  Flame,
  Crown,
  CalendarClock,
  Sparkles,
  UserCog,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
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

/**
 * Visual identity for each notification type: an icon and a semantic accent
 * color used for the type tile that sits on the actor avatar.
 */
const TYPE_META: Record<NotificationType, { icon: LucideIcon; tint: string }> = {
  liked_post: { icon: Heart, tint: 'var(--brand-red)' },
  comment_on_post: { icon: MessageCircle, tint: 'var(--info)' },
  reply_to_comment: { icon: Reply, tint: 'var(--info)' },
  mentioned_in_comment: { icon: AtSign, tint: 'var(--info)' },
  reposted_post: { icon: Repeat2, tint: 'var(--success)' },
  new_follower: { icon: UserPlus, tint: 'var(--brand-yellow)' },
  new_message: { icon: Mail, tint: 'var(--info)' },
  streak_track: { icon: Flame, tint: 'var(--warning)' },
  streak_reminder: { icon: Flame, tint: 'var(--warning)' },
  streak_loss: { icon: Flame, tint: 'var(--brand-red)' },
  welcome_to_plan: { icon: Crown, tint: 'var(--brand-yellow)' },
  plan_expiration_reminder: { icon: CalendarClock, tint: 'var(--warning)' },
  plan_expired: { icon: CalendarClock, tint: 'var(--brand-red)' },
  new_content_available: { icon: Sparkles, tint: 'var(--success)' },
  profile_incomplete: { icon: UserCog, tint: 'var(--info)' },
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
 * Layout: [Avatar + type tile] [Message + Timestamp] [Unread dot / chevron]
 *
 * Tapping a notification navigates to the relevant page.
 * Unread: highlighted surface + yellow left rail + yellow dot.
 * Read: transparent row that lifts on hover.
 */
export default function NotificationBanner({
  notification,
  isUnread,
}: NotificationBannerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { actor, created_at, type } = notification

  // Actor display info (fallback to "RefLab" for system notifications)
  const displayName = actor ? actor.name || actor.username : 'RefLab'
  const initials = displayName.slice(0, 2).toUpperCase()
  const localizedMessage = getLocalizedMessage(notification, t)

  const meta = TYPE_META[type] ?? { icon: Bell, tint: 'var(--text-muted)' }
  const TypeIcon = meta.icon

  const route = getNotificationRoute(notification)

  const handleClick = () => {
    if (route) navigate(route)
  }

  return (
    <div
      className={`group relative flex items-center gap-3.5 px-4 py-3.5 transition-colors ${
        route ? 'cursor-pointer' : ''
      } ${
        isUnread
          ? 'bg-(--brand-yellow)/[0.06] hover:bg-(--brand-yellow)/[0.09]'
          : 'hover:bg-(--bg-hover)'
      }`}
      role="listitem"
      aria-label={`${isUnread ? t('Unread notification') : t('Notification')}: ${displayName} ${localizedMessage}`}
      onClick={handleClick}
    >
      {/* Unread left rail */}
      {isUnread && (
        <span
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-(--brand-yellow)"
          aria-hidden="true"
        />
      )}

      {/* Avatar with type tile badge */}
      <div className="relative flex-shrink-0">
        {actor ? (
          actor.photo_url ? (
            <img
              src={actor.photo_url}
              alt={displayName}
              className="w-11 h-11 rounded-full object-cover ring-1 ring-(--border-subtle)"
            />
          ) : (
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center ring-1 ring-(--border-subtle)"
              style={{ backgroundImage: 'var(--grad-brand)' }}
            >
              <span className="text-sm font-bold text-(--bg-primary)">
                {initials}
              </span>
            </div>
          )
        ) : (
          <div className="w-11 h-11 rounded-full bg-(--bg-surface-2) flex items-center justify-center ring-1 ring-(--border-subtle)">
            <Bell className="w-5 h-5 text-(--text-muted)" aria-hidden="true" />
          </div>
        )}

        {/* Type icon tile overlaid on the avatar corner */}
        <span
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-(--bg-primary)"
          style={{ backgroundColor: meta.tint }}
          aria-hidden="true"
        >
          <TypeIcon className="w-3 h-3 text-(--bg-primary)" strokeWidth={2.5} />
        </span>
      </div>

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
        <span className="text-xs text-(--text-faint) mt-0.5 block numeral">
          {formatRelativeTime(created_at, t('now'))}
        </span>
      </div>

      {/* Trailing indicator: unread dot, else a subtle chevron for actionable rows */}
      {isUnread ? (
        <span
          className="w-2.5 h-2.5 rounded-full bg-(--brand-yellow) flex-shrink-0 shadow-[0_0_0_3px_rgba(246,194,28,0.18)]"
          aria-hidden="true"
        />
      ) : route ? (
        <ChevronRight
          className="w-4 h-4 text-(--text-faint) flex-shrink-0 opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0"
          aria-hidden="true"
        />
      ) : null}
    </div>
  )
}

/**
 * Skeleton placeholder for loading state.
 * Matches NotificationBanner layout with animated pulse.
 */
export function NotificationBannerSkeleton() {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-(--bg-surface-2) flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-(--bg-surface-2) rounded w-3/4" />
        <div className="h-2 bg-(--bg-surface-2) rounded w-1/4" />
      </div>
    </div>
  )
}
