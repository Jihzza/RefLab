import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Surface } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import ConfirmDialog from './ConfirmDialog'
import SettingsSection from './SettingsSection'

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Unexpected account error')
}

export default function AccountSection() {
  const { t } = useTranslation()
  const { user, resetPassword } = useAuth()
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const resetInFlightRef = useRef(false)

  if (!user) return null

  const isGoogleAccount = user.app_metadata?.provider === 'google'
  const email = user.email ?? ''

  const handleResetPassword = async () => {
    if (!email || resetInFlightRef.current) return
    resetInFlightRef.current = true
    setResetStatus('sending')

    try {
      const { error } = await resetPassword(email)
      setResetStatus(error ? 'error' : 'sent')
    } catch {
      setResetStatus('error')
    } finally {
      resetInFlightRef.current = false
    }
  }

  return (
    <SettingsSection
      title={t('Account & Security')}
      icon={<ShieldCheck className="size-7" />}
      defaultOpen
    >
      <div className="flex min-h-20 items-center gap-4 px-4 py-3.5 sm:px-5">
        <span className="shrink-0 text-sm text-(--mc-color-text-muted)">
          {t('Email')}
        </span>
        <span className="ml-auto min-w-0 text-right">
          <span className="block truncate text-sm text-(--mc-color-text-secondary)">
            {email || '—'}
          </span>
          {isGoogleAccount && (
            <Badge size="sm" className="mt-1 ml-auto whitespace-nowrap">
              {t('Managed by Google')}
            </Badge>
          )}
        </span>
      </div>

      {!isGoogleAccount && (
        <div>
          <button
            type="button"
            onClick={() => void handleResetPassword()}
            disabled={resetStatus === 'sending' || !email}
            className="group flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-(--mc-color-surface-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--mc-color-focus) disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none sm:px-5"
          >
            <span className="min-w-0 flex-1 text-sm font-medium text-(--mc-color-text)">
              {t('Reset Password')}
            </span>
            {resetStatus === 'sending' ? (
              <LoaderCircle
                className="size-4.5 shrink-0 animate-spin text-(--mc-color-accent) motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <ChevronRight
                className="size-5 shrink-0 text-(--mc-color-text-muted) transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            )}
          </button>

          {resetStatus === 'sent' && (
            <p className="px-4 pb-3 text-xs text-(--mc-color-success) sm:px-5" role="status">
              {t('Password reset email sent. Check your inbox.')}
            </p>
          )}
          {resetStatus === 'error' && (
            <p className="px-4 pb-3 text-xs text-(--mc-color-danger) sm:px-5" role="alert">
              {t('Failed to send reset email. Please try again.')}
            </p>
          )}
        </div>
      )}
    </SettingsSection>
  )
}

export function AccountActions() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, signOut, deleteAccount } = useAuth()
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const logoutInFlightRef = useRef(false)

  if (!user) return null

  const handleLogout = async () => {
    if (logoutInFlightRef.current) return
    logoutInFlightRef.current = true
    setLogoutLoading(true)
    try {
      await signOut()
    } finally {
      navigate('/', { replace: true })
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteLoading) return
    setDeleteLoading(true)
    setDeleteError(null)

    try {
      const { error } = await deleteAccount()
      if (error) {
        setDeleteError(error.message)
        return
      }
      navigate('/', { replace: true })
    } catch (error) {
      setDeleteError(toError(error).message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <Surface
        padding="none"
        className="divide-y divide-(--mc-color-border) overflow-hidden border-(--mc-color-border-strong) shadow-none"
      >
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={logoutLoading}
          className="group flex min-h-[4.75rem] w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-(--mc-color-surface-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--mc-color-focus) disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none sm:px-5"
        >
          <span className="flex size-10 shrink-0 items-center justify-center text-(--mc-color-accent)" aria-hidden="true">
            {logoutLoading ? (
              <LoaderCircle className="size-6 animate-spin motion-reduce:animate-none" />
            ) : (
              <LogOut className="size-7" />
            )}
          </span>
          <span className="min-w-0 flex-1 text-base font-semibold text-(--mc-color-text)">
            {logoutLoading ? t('Loading...') : t('Log Out')}
          </span>
          <ChevronRight
            className="size-5 shrink-0 text-(--mc-color-text-muted) transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={() => {
            setDeleteError(null)
            setDeleteOpen(true)
          }}
          className="group flex min-h-[4.75rem] w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-(--mc-color-danger)/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--mc-color-focus) motion-reduce:transition-none sm:px-5"
        >
          <span className="flex size-10 shrink-0 items-center justify-center text-(--mc-color-danger)" aria-hidden="true">
            <Trash2 className="size-7" />
          </span>
          <span className="min-w-0 flex-1 text-base font-semibold text-(--mc-color-danger)">
            {t('Delete Account')}
          </span>
          <ChevronRight
            className="size-5 shrink-0 text-(--mc-color-text-muted) transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </button>
      </Surface>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setDeleteError(null)
        }}
        onConfirm={handleDeleteAccount}
        title={t('Delete Account')}
        description={t('This action is permanent and cannot be undone. All your data, including your profile, posts, and progress, will be permanently deleted.')}
        confirmLabel={t('Delete Account')}
        confirmPhrase="DELETE"
        variant="danger"
        loading={deleteLoading}
        error={deleteError}
      />
    </>
  )
}
