import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicProfileByUsername } from '../api/publicProfilesApi'
import type { PublicProfile } from '../types'
import { useTranslation } from 'react-i18next'

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
    void loadProfile()
  }, [loadProfile])

  const displayName = profile?.name || profile?.username || username
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="p-4 pb-20">
      {isLoading && (
        <div className="bg-(--bg-surface) rounded-(--radius-card) border border-(--border-subtle) p-6 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-(--bg-surface-2) mb-4" />
          <div className="h-4 w-40 bg-(--bg-surface-2) rounded mb-2" />
          <div className="h-3 w-28 bg-(--bg-surface-2) rounded" />
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-(--bg-surface) rounded-(--radius-card) border border-(--error)/30 p-6">
          <p className="text-sm text-(--error) mb-3">{error}</p>
          <button
            type="button"
            onClick={() => void loadProfile()}
            className="h-9 px-4 rounded-(--radius-button) bg-(--brand-yellow) text-(--bg-primary) text-sm font-semibold hover:bg-(--brand-yellow-soft) transition-colors"
          >
            {t('Try Again')}
          </button>
        </div>
      )}

      {!isLoading && !error && !profile && (
        <div className="bg-(--bg-surface) rounded-(--radius-card) border border-(--border-subtle) p-6">
          <h1 className="text-lg font-semibold text-(--text-primary) mb-2">{t('Profile not found')}</h1>
          <p className="text-sm text-(--text-muted)">
            {t('We could not find a public profile for @{{username}}.', { username })}
          </p>
        </div>
      )}

      {!isLoading && !error && profile && (
        <section className="bg-(--bg-surface) rounded-(--radius-card) border border-(--border-subtle) p-6">
          <div className="flex items-center gap-4">
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-(--brand-yellow) flex items-center justify-center">
                <span className="text-lg font-semibold text-(--bg-primary)">
                  {initials}
                </span>
              </div>
            )}

            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-(--text-primary) truncate">
                {displayName}
              </h1>
              <p className="text-sm text-(--text-muted) truncate">@{profile.username}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-(--border-subtle)">
            <p className="text-sm text-(--text-secondary)">
              {t('This is a public profile preview from the social/messages context.')}
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
