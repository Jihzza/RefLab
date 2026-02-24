import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { useTranslation } from 'react-i18next'

/**
 * OAuthCallbackPage - Landing page for all auth redirects
 *
 * Handles:
 * - Google OAuth redirects (PKCE code exchange)
 * - Email confirmation redirects
 * - Any future OAuth providers
 *
 * The Supabase client's detectSessionInUrl automatically exchanges
 * the code parameter. This page shows a spinner and redirects
 * once the auth state resolves.
 */
export default function OAuthCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { authStatus } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If the user is authenticated (code exchange succeeded), redirect
    if (authStatus === 'authenticated') {
      navigate('/app/dashboard', { replace: true })
      return
    }

    // If unauthenticated after a timeout, something went wrong
    const timeout = setTimeout(() => {
      if (authStatus === 'unauthenticated') {
        setError(t('Authentication failed. Please try signing in again.'))
      }
    }, 5000)

    return () => clearTimeout(timeout)
  }, [authStatus, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-(--bg-primary)">
        <div className="w-full max-w-md text-center">
          <div className="p-4 rounded-(--radius-card) bg-(--error)/10 border border-(--error)/20 text-(--error)">
            <p className="mb-4">{error}</p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="text-sm font-medium text-(--brand-yellow) hover:text-(--brand-yellow-soft) hover:underline"
            >
              {t('Back to login')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-(--bg-primary)">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-(--brand-yellow) border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-(--text-secondary)">{t('Signing you in...')}</p>
      </div>
    </div>
  )
}
