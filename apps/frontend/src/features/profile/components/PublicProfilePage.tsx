import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AtSign } from 'lucide-react'
import Button from '@/components/ui/Button'
import { getPublicProfileByUsername } from '../api/publicProfilesApi'
import type { PublicProfile } from '../types'
import { useTranslation } from 'react-i18next'

export default function PublicProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
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
        <div className="card-console p-6 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-(--bg-surface-2) mb-4" />
          <div className="h-4 w-40 bg-(--bg-surface-2) rounded mb-2" />
          <div className="h-3 w-28 bg-(--bg-surface-2) rounded" />
        </div>
      )}

      {!isLoading && error && (
        <div className="card-console border-(--error)/30 p-6">
          <p className="text-sm text-(--error) mb-3">{error}</p>
          <Button variant="primary" size="sm" onClick={() => void loadProfile()}>
            {t('Try Again')}
          </Button>
        </div>
      )}

      {!isLoading && !error && !profile && (
        <div className="card-console p-6">
          <h1 className="text-lg font-bold text-(--text-primary) mb-2">{t('Profile not found')}</h1>
          <p className="text-sm text-(--text-muted) mb-4">
            {t('We could not find a public profile for @{{username}}.', { username })}
          </p>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<AtSign className="w-4 h-4" aria-hidden="true" />}
            onClick={() => navigate('/app/search')}
          >
            {t('Search for another user')}
          </Button>
        </div>
      )}

      {!isLoading && !error && profile && (
        <section className="card-console overflow-hidden animate-fade-up">
          {/* Banner */}
          <div className="relative h-24 field-lines bg-[radial-gradient(120%_140%_at_0%_0%,rgba(246,194,28,0.16),transparent_55%),radial-gradient(120%_140%_at_100%_0%,rgba(77,163,255,0.12),transparent_55%)]">
            <span className="absolute inset-x-0 top-0 h-1 flag-accent" aria-hidden="true" />
          </div>

          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-10">
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover border-4 border-(--bg-surface) shadow-[var(--shadow-soft)]"
                />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center border-4 border-(--bg-surface) shadow-[var(--shadow-soft)]" style={{ backgroundImage: 'var(--grad-brand)' }}>
                  <span className="text-xl font-black text-(--bg-primary)">
                    {initials}
                  </span>
                </div>
              )}

              <div className="min-w-0 pb-1">
                <h1 className="text-xl font-bold text-(--text-primary) truncate leading-tight">
                  {displayName}
                </h1>
                <p className="text-sm text-(--text-muted) truncate">@{profile.username}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 divider">
              <p className="text-sm text-(--text-secondary)">
                {t('This is a public profile preview from the social/messages context.')}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
