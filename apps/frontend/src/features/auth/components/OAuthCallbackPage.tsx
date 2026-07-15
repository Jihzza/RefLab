import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import PublicAuthFrame from '@/features/landing/components/PublicAuthFrame'
import {
  buildAuthLandingUrl,
  consumeAuthReturnTo,
  persistAuthReturnTo,
  resolveAuthReturnTo,
} from '../utils/authNavigation'

const AUTH_CALLBACK_TIMEOUT_MS = 10_000

function readRedirectError(search: string, hash: string): Error | null {
  const queryParams = new URLSearchParams(search)
  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const errorValue = queryParams.get('error_description')
    ?? queryParams.get('error_code')
    ?? queryParams.get('error')
    ?? hashParams.get('error_description')
    ?? hashParams.get('error_code')
    ?? hashParams.get('error')

  return errorValue ? new Error(errorValue) : null
}

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
  const location = useLocation()
  const { authStatus } = useAuth()
  const [timedOut, setTimedOut] = useState(false)
  const redirectError = useMemo(
    () => readRedirectError(location.search, location.hash),
    [location.hash, location.search],
  )

  useEffect(() => {
    if (redirectError || authStatus !== 'authenticated') return
    navigate(consumeAuthReturnTo(location.search), { replace: true })
  }, [authStatus, location.search, navigate, redirectError])

  useEffect(() => {
    if (redirectError || authStatus === 'authenticated' || authStatus === 'error') return
    const timeout = window.setTimeout(() => setTimedOut(true), AUTH_CALLBACK_TIMEOUT_MS)
    return () => window.clearTimeout(timeout)
  }, [authStatus, redirectError])

  const error = redirectError || authStatus === 'error' || timedOut
      ? t('Authentication failed. Please try signing in again.')
      : null

  const handleBackToLogin = () => {
    const returnTo = persistAuthReturnTo(resolveAuthReturnTo(location.search))
    navigate(buildAuthLandingUrl('login', returnTo), { replace: true })
  }

  if (error) {
    return (
      <PublicAuthFrame compact>
        <div className="p-6 text-center sm:p-8">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full border border-(--mc-color-danger)/40 bg-(--mc-color-danger)/10 text-(--mc-color-danger)">
            <AlertTriangle className="size-7" aria-hidden="true" />
          </span>
          <h1 role="alert" className="mt-5 text-base font-semibold leading-6 text-(--mc-color-text)">
            {error}
          </h1>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={handleBackToLogin}
            className="mt-5"
          >
            {t('Back to login')}
          </Button>
        </div>
      </PublicAuthFrame>
    )
  }

  return (
    <PublicAuthFrame compact>
      <div className="p-8 text-center" role="status" aria-live="polite">
        <LoaderCircle className="mx-auto size-9 animate-spin text-(--mc-color-accent) motion-reduce:animate-none" aria-hidden="true" />
        <p className="mt-4 text-sm font-medium text-(--mc-color-text-secondary)">
          {t('Signing you in...')}
        </p>
      </div>
    </PublicAuthFrame>
  )
}
