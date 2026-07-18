import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import PublicAuthFrame from '@/features/landing/components/PublicAuthFrame'
import { LEGAL_DOCUMENT_VERSIONS } from '../config'
import { useAuthOwnerGuard } from '../hooks/useAuthOwnerGuard'
import {
  buildAuthLandingUrl,
  resolveAuthReturnTo,
} from '../utils/authNavigation'
import { useAuth } from './useAuth'

interface LegalAcceptanceContentProps {
  ownerId: string | null
}

function LegalAcceptanceContent({ ownerId }: LegalAcceptanceContentProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const {
    acceptLegalDocuments,
    authStatus,
    legalAcceptanceStatus,
    refreshLegalAcceptance,
    signOut,
    user,
  } = useAuth()
  const isCurrentOwner = useAuthOwnerGuard(ownerId, user?.id ?? null)
  const [checked, setChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const returnTo = resolveAuthReturnTo(location.search)

  if (authStatus === 'unauthenticated' || authStatus === 'error') {
    return <Navigate to={buildAuthLandingUrl('login', returnTo)} replace />
  }

  if (legalAcceptanceStatus === 'accepted') {
    return <Navigate to={returnTo} replace />
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isCurrentOwner()) return
    setError(null)

    if (!checked) {
      setError(t('You must explicitly accept the Terms of Service and acknowledge the Privacy Policy.'))
      return
    }

    setSubmitting(true)
    const { error: acceptError } = await acceptLegalDocuments()
    if (!isCurrentOwner()) return
    if (acceptError) {
      setError(t("We couldn't record your acceptance. Check your connection and try again."))
      setSubmitting(false)
      return
    }

    navigate(returnTo, { replace: true })
  }

  const handleRetry = async () => {
    if (!isCurrentOwner()) return
    setError(null)
    setSubmitting(true)
    await refreshLegalAcceptance()
    if (!isCurrentOwner()) return
    setSubmitting(false)
  }

  const handleSignOut = async () => {
    if (!isCurrentOwner()) return
    setSubmitting(true)
    await signOut()
    if (!isCurrentOwner()) return
    navigate('/', { replace: true })
  }

  const isLoading = authStatus === 'checking_session'
    || legalAcceptanceStatus === 'loading'

  return (
    <PublicAuthFrame compact>
      <div className="p-6 sm:p-8">
        <span className="flex size-12 items-center justify-center rounded-full border border-(--mc-color-accent)/40 bg-(--mc-color-accent)/10 text-(--mc-color-accent)">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.025em] text-(--mc-color-text)">
          {t('Review and accept to continue')}
        </h1>
        <p className="mt-2 text-sm leading-6 text-(--mc-color-text-secondary)">
          {t('Your session is active, but access to RefLab stays paused until you explicitly accept the current documents.')}
        </p>

        {isLoading ? (
          <div className="mt-6 flex items-center gap-3 rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas)/55 px-3 py-3 text-sm text-(--mc-color-text-secondary)" role="status">
            <LoaderCircle className="size-5 animate-spin text-(--mc-color-accent) motion-reduce:animate-none" aria-hidden="true" />
            <span>{t('Checking document acceptance...')}</span>
          </div>
        ) : legalAcceptanceStatus === 'error' ? (
          <div className="mt-6">
            <div role="alert" className="flex items-start gap-3 rounded-(--mc-radius-input) border border-(--mc-color-danger)/45 bg-(--mc-color-danger)/10 px-3 py-3 text-sm leading-6 text-(--mc-color-danger)">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <span>{t("We couldn't verify the current document versions. Access remains paused.")}</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              loading={submitting}
              onClick={handleRetry}
              className="mt-4"
            >
              {t('Try Again')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            {error && (
              <div role="alert" className="rounded-(--mc-radius-input) border border-(--mc-color-danger)/45 bg-(--mc-color-danger)/10 px-3 py-2.5 text-sm leading-5 text-(--mc-color-danger)">
                {error}
              </div>
            )}

            <div className="rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas)/55 p-4">
              <div className="flex items-start gap-3">
                <input
                  id="legal-gate-acceptance"
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    setChecked(event.target.checked)
                    if (event.target.checked) setError(null)
                  }}
                  disabled={submitting}
                  required
                  aria-invalid={Boolean(error)}
                  className="mc-focus-ring mt-0.5 size-5 shrink-0 cursor-pointer rounded border-(--mc-color-border-strong) accent-(--mc-color-accent) disabled:cursor-not-allowed disabled:opacity-50"
                />
                <label htmlFor="legal-gate-acceptance" className="text-sm leading-6 text-(--mc-color-text-secondary)">
                  {t('I have read and agree to the')}{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noreferrer"
                    className="mc-focus-ring rounded-sm font-semibold text-(--mc-color-info) underline underline-offset-2"
                  >
                    {t('Terms of Service')}
                  </a>{' '}
                  {t('and acknowledge the')}{' '}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="mc-focus-ring rounded-sm font-semibold text-(--mc-color-info) underline underline-offset-2"
                  >
                    {t('Privacy Policy')}
                  </a>.
                </label>
              </div>
              <p className="mt-3 break-words text-[0.6875rem] leading-5 text-(--mc-color-text-muted)">
                {t('Document versions: Terms {{terms}}, Privacy {{privacy}}', {
                  terms: LEGAL_DOCUMENT_VERSIONS.terms,
                  privacy: LEGAL_DOCUMENT_VERSIONS.privacy,
                })}
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={submitting}
              loadingText={t('Recording acceptance...')}
            >
              {t('Accept and continue')}
            </Button>
          </form>
        )}

        {!isLoading && (
          <button
            type="button"
            onClick={handleSignOut}
            disabled={submitting}
            className="mc-focus-ring mx-auto mt-5 block min-h-10 rounded-lg px-2 text-sm font-semibold text-(--mc-color-text-muted) hover:text-(--mc-color-text) disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('Log Out')}
          </button>
        )}
      </div>
    </PublicAuthFrame>
  )
}

export default function LegalAcceptancePage() {
  const { user } = useAuth()
  const ownerId = user?.id ?? null

  return (
    <LegalAcceptanceContent
      key={ownerId ?? 'unauthenticated'}
      ownerId={ownerId}
    />
  )
}
