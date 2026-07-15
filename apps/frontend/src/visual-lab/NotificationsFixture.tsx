import { useTranslation } from 'react-i18next'
import NotificationBanner from '@/features/notifications/components/NotificationBanner'
import type { EnrichedNotification, NotificationActor } from '@/features/notifications/types'
import FixtureShell from './FixtureShell'

const marta: NotificationActor = {
  id: 'fixture-marta',
  username: 'marta.correia',
  name: 'Marta Correia',
  photo_url: portrait('#26364c', '#d5a07b', '#30251f', '#11151b'),
}

const joao: NotificationActor = {
  id: 'fixture-joao',
  username: 'joao.ribeiro',
  name: 'João Ribeiro',
  photo_url: portrait('#37402f', '#c88c65', '#1f1814', '#121820'),
}

const ines: NotificationActor = {
  id: 'fixture-ines',
  username: 'ines.ferreira',
  name: 'Inês Ferreira',
  photo_url: portrait('#46352f', '#d09a77', '#3a2119', '#171a20'),
}

const tiago: NotificationActor = {
  id: 'fixture-tiago',
  username: 'tiago.alves',
  name: 'Tiago Alves',
  photo_url: portrait('#243b3a', '#c88b61', '#211915', '#11161c'),
}

const notifications: EnrichedNotification[] = [
  notification('notification-like', 'liked_post', '2026-07-15T19:39:00.000Z', marta, 'fixture-post-1'),
  notification('notification-comment', 'comment_on_post', '2026-07-15T19:29:00.000Z', joao, 'fixture-post-1'),
  notification('notification-follow', 'new_follower', '2026-07-15T18:41:00.000Z', ines),
  notification('notification-streak', 'streak_track', '2026-07-15T16:41:00.000Z'),
  notification('notification-message', 'new_message', '2026-07-15T14:41:00.000Z', tiago),
  {
    ...notification('notification-content', 'new_content_available', '2026-07-14T19:41:00.000Z'),
    message: 'A new test "Law 12 · Fouls and Misconduct" is now available.',
  },
]

export default function NotificationsFixture() {
  const { t } = useTranslation()

  return (
    <FixtureShell title="Notificações" notificationActive>
      <section aria-label={t('Notifications')} className="min-h-full bg-(--mc-color-canvas) pb-8 text-(--mc-color-text)">
        <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-5 sm:px-6 sm:pt-7">
          <header className="mb-4 sm:mb-5">
            <h2 className="text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-(--mc-color-text) sm:text-3xl">
              {t('Notifications')}
            </h2>
          </header>

          <ul className="space-y-3" aria-label={t('Notifications list')}>
            {notifications.map((item, index) => (
              <NotificationBanner
                key={item.id}
                notification={item}
                isUnread={index < 3}
              />
            ))}
          </ul>
        </div>
      </section>
    </FixtureShell>
  )
}

function notification(
  id: string,
  type: EnrichedNotification['type'],
  createdAt: string,
  actor: NotificationActor | null = null,
  referenceId: string | null = null,
): EnrichedNotification {
  return {
    id,
    user_id: 'fixture-rafael',
    actor_id: actor?.id ?? null,
    reference_id: referenceId,
    type,
    title: 'RefLab',
    message: type,
    read: false,
    dismissed_permanently: false,
    next_reminder_at: null,
    created_at: createdAt,
    updated_at: createdAt,
    actor,
  }
}

function portrait(background: string, skin: string, hair: string, shirt: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <rect width="96" height="96" fill="${background}"/>
      <circle cx="48" cy="38" r="20" fill="${skin}"/>
      <path d="M28 38c1-19 9-28 21-28 13 0 20 10 20 27-7-8-14-11-21-11-8 0-14 4-20 12Z" fill="${hair}"/>
      <path d="M12 96c2-26 14-42 36-42s34 16 36 42Z" fill="${shirt}"/>
      <circle cx="41" cy="38" r="1.7" fill="#2b211d"/>
      <circle cx="55" cy="38" r="1.7" fill="#2b211d"/>
      <path d="M41 48c5 4 10 4 15 0" fill="none" stroke="#754e3c" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `)}`
}
