import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicProfileByUsername } from '../api/publicProfilesApi'
import type { PublicProfile } from '../types'
import { useTranslation } from 'react-i18next'
import { UserRound } from 'lucide-react'
import DocumentPage from '@/app/layouts/DocumentPage'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'

export default function PublicProfilePage() {
  const { t } = useTranslation()
  const { username: usernameParam } = useParams<{ username: string }>()

  const username = useMemo(() => {
    if (!usernameParam) return ''
    return decodeURIComponent(usernameParam)
  }, [usernameParam])

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    if (!username) {
      setError(t('Missing username.'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const { profile: publicProfile, error: fetchError } =
      await getPublicProfileByUsername(username)

    if (fetchError) {
      setError(fetchError.message)
      setProfile(null)
      setIsLoading(false)
      return
    }

    setProfile(publicProfile)
    setIsLoading(false)
  }, [username, t])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadProfile(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadProfile])

  const displayName = profile?.name || profile?.username || username
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <DocumentPage ariaLabel={t('Profile')} eyebrow="RefLab" width="narrow">
      {isLoading && (
        <div className="animate-pulse rounded-(--mc-radius-card) border border-(--mc-color-border) bg-(--mc-color-surface) p-6" aria-label={t('Loading profile...')}>
          <div className="size-20 rounded-full bg-(--mc-color-surface-raised)" />
          <div className="mt-5 h-5 w-40 rounded bg-(--mc-color-surface-raised)" />
          <div className="mt-2 h-3 w-28 rounded bg-(--mc-color-surface-raised)" />
          <div className="mt-6 h-16 rounded-(--mc-radius-input) bg-(--mc-color-surface-raised)" />
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-(--mc-radius-card) border border-(--mc-color-danger)/30 bg-(--mc-color-surface)">
          <EmptyState
            title={error}
            icon={<UserRound className="size-5" />}
            action={<Button onClick={() => void loadProfile()}>{t('Try Again')}</Button>}
          />
        </div>
      )}

      {!isLoading && !error && !profile && (
        <div className="rounded-(--mc-radius-card) border border-dashed border-(--mc-color-border-strong) bg-(--mc-color-surface)">
          <EmptyState
            title={t('Profile not found')}
            description={t('We could not find a public profile for @{{username}}.', { username })}
            icon={<UserRound className="size-5" />}
          />
        </div>
      )}

      {!isLoading && !error && profile && (
        <section className="relative isolate overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border-strong) bg-(--mc-color-surface) p-6 shadow-(--mc-shadow-soft)">
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full border border-(--mc-color-border)" aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-1 bg-(--mc-color-accent)" aria-hidden="true" />
          <div className="relative flex items-center gap-4">
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={displayName}
                className="size-20 rounded-full border-2 border-(--mc-color-accent)/60 object-cover shadow-(--mc-shadow-soft)"
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-full border-2 border-(--mc-color-accent-soft) bg-(--mc-color-accent) shadow-(--mc-shadow-soft)">
                <span className="text-xl font-extrabold text-(--mc-color-canvas)">
                  {initials}
                </span>
              </div>
            )}

            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold tracking-tight text-(--mc-color-text)">
                {displayName}
              </h1>
              <p className="mt-1 truncate text-sm text-(--mc-color-text-muted)">@{profile.username}</p>
            </div>
          </div>

          <div className="relative mt-5 border-t border-(--mc-color-border) pt-4">
            <p className="text-sm leading-6 text-(--mc-color-text-secondary)">
              {t('This is a public profile preview from the social/messages context.')}
            </p>
          </div>
        </section>
      )}
    </DocumentPage>
  )
}
