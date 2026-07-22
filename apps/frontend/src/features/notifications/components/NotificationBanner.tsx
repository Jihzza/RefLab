import {
  AtSign,
  Bell,
  BookOpen,
  ChevronRight,
  CreditCard,
  Flame,
  Heart,
  MessageCircle,
  MessageSquare,
  Repeat2,
  UserPlus,
  UserRoundCog,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Skeleton, Surface } from '@/components/ui'
import type { EnrichedNotification, NotificationType } from '../types'

interface NotificationBannerProps {
  notification: EnrichedNotification
  isUnread: boolean
}

function formatRelativeTime(dateString: string, nowLabel: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
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

function getNotificationRoute(notification: EnrichedNotification): string | null {
  const { type, actor, reference_id } = notification
  const postTypes: NotificationType[] = [
    'liked_post',
    'comment_on_post',
    'reply_to_comment',
    'mentioned_in_comment',
    'reposted_post',
  ]

  if (postTypes.includes(type)) return reference_id ? `/app/post/${reference_id}` : '/app/social'
  if (type === 'new_follower' && actor?.username) return `/app/profile/${encodeURIComponent(actor.username)}`
  if (type === 'streak_track' || type === 'streak_reminder' || type === 'streak_loss') return '/app/dashboard'
  if (type === 'welcome_to_plan' || type === 'plan_expired' || type === 'plan_expiration_reminder') return '/app/pricing'
  if (type === 'new_content_available') return '/app/tests'
  if (type === 'new_message') return '/app/messages'
  if (type === 'profile_incomplete') return '/app/profile/edit'
  return null
}

function getLocalizedMessage(
  notification: EnrichedNotification,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  switch (notification.type) {
    case 'liked_post': return t('liked your post')
    case 'comment_on_post': return t('commented on your post')
    case 'reply_to_comment': return t('replied to your comment')
    case 'mentioned_in_comment': return t('mentioned you in a comment')
    case 'reposted_post': return t('reposted your post')
    case 'new_follower': return t('started following you')
    case 'new_message': return t('sent you a message')
    case 'streak_track': return t('You completed a learning activity today. Keep it up!')
    case 'streak_reminder': return t(notification.message)
    case 'streak_loss': return t(notification.message)
    case 'welcome_to_plan': return t('Your plan is now active. Enjoy all premium features!')
    case 'plan_expiration_reminder': return t('Your plan will expire soon. Renew to keep premium features.')
    case 'plan_expired': return t('Your plan has expired. Renew to keep premium features.')
    case 'new_content_available': {
      const match = notification.message.match(/"([^"]+)"/)
      return match?.[1]
        ? t('A new test "{{title}}" is now available. Check it out!', { title: match[1] })
        : t('New content is available. Check it out!')
    }
    case 'profile_incomplete': return t('Complete your profile to unlock all features.')
    default: return t(notification.message)
  }
}

function NotificationIcon({ type }: { type: NotificationType }) {
  const iconClassName = 'size-5'
  if (type === 'liked_post') return <Heart className={iconClassName} />
  if (type === 'comment_on_post' || type === 'reply_to_comment') return <MessageCircle className={iconClassName} />
  if (type === 'mentioned_in_comment') return <AtSign className={iconClassName} />
  if (type === 'reposted_post') return <Repeat2 className={iconClassName} />
  if (type === 'new_follower') return <UserPlus className={iconClassName} />
  if (type === 'new_message') return <MessageSquare className={iconClassName} />
  if (type === 'streak_track' || type === 'streak_reminder' || type === 'streak_loss') return <Flame className={iconClassName} />
  if (type === 'welcome_to_plan' || type === 'plan_expiration_reminder' || type === 'plan_expired') return <CreditCard className={iconClassName} />
  if (type === 'new_content_available') return <BookOpen className={iconClassName} />
  if (type === 'profile_incomplete') return <UserRoundCog className={iconClassName} />
  return <Bell className={iconClassName} />
}

export default function NotificationBanner({ notification, isUnread }: NotificationBannerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const displayName = notification.actor
    ? notification.actor.name || notification.actor.username
    : 'RefLab'
  const initials = displayName.slice(0, 2).toUpperCase()
  const localizedMessage = getLocalizedMessage(notification, t)
  const route = getNotificationRoute(notification)

  const content = (
    <>
      <span className="relative shrink-0">
        {notification.actor ? (
          notification.actor.photo_url ? (
            <img src={notification.actor.photo_url} alt="" className="size-11 rounded-full border border-(--mc-color-border-strong) object-cover" />
          ) : (
            <span className="flex size-11 items-center justify-center rounded-full border border-(--mc-color-accent)/35 bg-(--mc-color-accent)/15 text-xs font-bold text-(--mc-color-accent)">{initials}</span>
          )
        ) : (
          <span className="flex size-11 items-center justify-center rounded-(--mc-radius-button) border border-(--mc-color-border) bg-(--mc-color-canvas) text-(--mc-color-accent)" aria-hidden="true">
            <NotificationIcon type={notification.type} />
          </span>
        )}
        {isUnread && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-(--mc-color-surface) bg-(--mc-color-accent)" aria-hidden="true" />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-5 text-(--mc-color-text-secondary)">
          {notification.actor && <strong className="font-semibold text-(--mc-color-text)">{displayName} </strong>}
          {localizedMessage}
        </span>
        <span className="mt-1 block text-xs tabular-nums text-(--mc-color-text-muted)">
          {formatRelativeTime(notification.created_at, t('now'))}
        </span>
      </span>

      {route && <ChevronRight className="mt-1 size-4 shrink-0 text-(--mc-color-text-muted)" aria-hidden="true" />}
    </>
  )

  return (
    <li>
      <Surface padding="none" selected={isUnread} className={isUnread ? 'border-l-2 border-l-(--mc-color-accent)' : ''}>
        {route ? (
          <button
            type="button"
            onClick={() => navigate(route)}
            className="mc-focus-ring flex min-h-[4.75rem] w-full items-start gap-3 rounded-(--mc-radius-card) px-3 py-3 text-left transition-colors hover:bg-(--mc-color-surface-hover) sm:px-4"
            aria-label={`${isUnread ? t('Unread notification') : t('Notification')}: ${displayName} ${localizedMessage}`}
          >
            {content}
          </button>
        ) : (
          <div className="flex min-h-[4.75rem] items-start gap-3 px-3 py-3 sm:px-4" aria-label={`${t('Notification')}: ${displayName} ${localizedMessage}`}>
            {content}
          </div>
        )}
      </Surface>
    </li>
  )
}

export function NotificationBannerSkeleton() {
  return (
    <Surface className="flex items-start gap-3" padding="sm" aria-hidden="true">
      <Skeleton variant="circular" width="2.75rem" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="25%" className="h-3" />
      </div>
    </Surface>
  )
}
