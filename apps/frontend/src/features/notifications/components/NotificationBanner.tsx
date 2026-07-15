import { Link } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  ChevronRight,
  Clock,
  CreditCard,
  Flame,
  User,
  type LucideIcon,
} from 'lucide-react'
import { Avatar, Skeleton } from '@/components/ui'
import type { EnrichedNotification, NotificationType } from '../types'
import { useTranslation } from 'react-i18next'

interface NotificationBannerProps {
  notification: EnrichedNotification
  isUnread: boolean
}

interface SystemNotificationVisual {
  icon: LucideIcon
  className: string
}

function getSystemNotificationVisual(type: NotificationType): SystemNotificationVisual {
  if (type === 'streak_reminder') {
    return {
      icon: Clock,
      className: 'border-(--mc-color-warning)/35 bg-(--mc-color-warning)/12 text-(--mc-color-warning)',
    }
  }

  if (type === 'streak_track') {
    return {
      icon: Flame,
      className: 'border-(--mc-color-success)/35 bg-(--mc-color-success)/12 text-(--mc-color-success)',
    }
  }

  if (type === 'streak_loss') {
    return {
      icon: Flame,
      className: 'border-(--mc-color-danger)/35 bg-(--mc-color-danger)/12 text-(--mc-color-danger)',
    }
  }

  if (type === 'plan_expired') {
    return {
      icon: CreditCard,
      className: 'border-(--mc-color-danger)/35 bg-(--mc-color-danger)/12 text-(--mc-color-danger)',
    }
  }

  if (type === 'welcome_to_plan' || type === 'plan_expiration_reminder') {
    return {
      icon: CreditCard,
      className: 'border-(--mc-color-accent)/35 bg-(--mc-color-accent)/12 text-(--mc-color-accent)',
    }
  }

  if (type === 'new_content_available') {
    return {
      icon: BookOpen,
      className: 'border-(--mc-color-info)/35 bg-(--mc-color-info)/12 text-(--mc-color-info)',
    }
  }

  if (type === 'profile_incomplete') {
    return {
      icon: User,
      className: 'border-(--mc-color-warning)/35 bg-(--mc-color-warning)/12 text-(--mc-color-warning)',
    }
  }

  return {
    icon: Bell,
    className: 'border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) text-(--mc-color-text-muted)',
  }
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
  const { actor, created_at } = notification

  // Actor display info (fallback to "RefLab" for system notifications)
  const displayName = actor ? actor.name || actor.username : 'RefLab'
  const localizedMessage = getLocalizedMessage(notification, t)
  const route = getNotificationRoute(notification)
  const systemVisual = getSystemNotificationVisual(notification.type)
  const SystemIcon = systemVisual.icon
  const accessibleLabel = `${
    isUnread ? t('Unread notification') : t('Notification')
  }: ${displayName} ${localizedMessage}`

  const content = (
    <>
      {actor ? (
        <Avatar
          src={actor.photo_url}
          alt={displayName}
          name={displayName}
          size="lg"
          className="border-(--mc-color-border-strong)"
        />
      ) : (
        <Avatar
          name={displayName}
          fallback={<SystemIcon className="size-5" aria-hidden="true" />}
          size="lg"
          className={systemVisual.className}
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="break-words text-sm leading-5 text-(--mc-color-text-secondary) [overflow-wrap:anywhere]">
          {actor && (
            <span className="font-semibold text-(--mc-color-text)">
              {displayName}
            </span>
          )}{actor ? ' ' : null}
          {localizedMessage}
        </p>
        <time
          dateTime={created_at}
          className="mt-1 block text-xs font-medium tabular-nums text-(--mc-color-text-muted)"
        >
          {formatRelativeTime(created_at, t('now'))}
        </time>
      </div>

      <div className="flex shrink-0 items-center gap-2 self-center" aria-hidden="true">
        {isUnread && <span className="size-2 rounded-full bg-(--mc-color-accent) shadow-[0_0_0_3px_var(--mc-color-selection)]" />}
        {route && (
          <ChevronRight className="size-4 text-(--mc-color-text-muted) transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        )}
      </div>
    </>
  )

  return (
    <li
      aria-label={route ? undefined : accessibleLabel}
      className="list-none"
    >
      {route ? (
        <Link
          to={route}
          className={`group relative flex min-h-[92px] w-full items-center gap-3 overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border-strong) px-4 py-4 text-left shadow-(--mc-shadow-soft) transition-[background-color,border-color,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) active:opacity-80 motion-reduce:transition-none sm:px-5 ${
            isUnread
              ? 'border-l-4 border-l-(--mc-color-accent) bg-(--mc-color-accent)/6 hover:border-(--mc-color-accent)/65'
              : 'bg-(--mc-color-surface) hover:border-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover)/70'
          }`}
          aria-label={accessibleLabel}
        >
          {content}
        </Link>
      ) : (
        <div
          className={`relative flex min-h-[92px] w-full items-center gap-3 overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border-strong) px-4 py-4 shadow-(--mc-shadow-soft) sm:px-5 ${
            isUnread
              ? 'border-l-4 border-l-(--mc-color-accent) bg-(--mc-color-accent)/6'
              : 'bg-(--mc-color-surface)'
          }`}
        >
          {content}
        </div>
      )}
    </li>
  )
}

/**
 * Skeleton placeholder for loading state.
 * Matches NotificationBanner layout with animated pulse.
 */
export function NotificationBannerSkeleton() {
  return (
    <div
      className="flex min-h-[92px] items-center gap-3 rounded-(--mc-radius-card) border border-(--mc-color-border-strong) bg-(--mc-color-surface) px-4 py-4 sm:px-5"
      aria-hidden="true"
    >
      <Skeleton variant="circular" width="3rem" />
      <div className="min-w-0 flex-1 space-y-2.5 py-0.5">
        <Skeleton variant="text" width="78%" />
        <Skeleton variant="text" width="24%" height="0.65rem" />
      </div>
    </div>
  )
}
