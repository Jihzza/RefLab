import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Mail, KeyRound, LogOut, Trash2 } from 'lucide-react'
import { useAuth } from '@/features/auth/components/useAuth'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import SettingsSection from './SettingsSection'
import ConfirmDialog from './ConfirmDialog'
import { useTranslation } from 'react-i18next'

export default function AccountSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, signOut, resetPassword, deleteAccount } = useAuth()

  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (!user) return null

  const isGoogleAccount = user.app_metadata?.provider === 'google'
  const email = user.email ?? ''

  const handleResetPassword = async () => {
    if (!email) return
    setResetStatus('sending')
    const { error } = await resetPassword(email)
    setResetStatus(error ? 'error' : 'sent')
  }

  const handleLogout = async () => {
    setLogoutLoading(true)
    await signOut()
    navigate('/', { replace: true })
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    setDeleteError(null)

    const { error } = await deleteAccount()

    if (error) {
      setDeleteError(error.message)
      setDeleteLoading(false)
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <>
      <SettingsSection title={t('Account & Security')} icon={<Shield className="size-5" />}>
        <div className="px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-(--mc-color-text-muted)" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-(--mc-color-text-muted)">{t('Email')}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-(--mc-color-text)">{email}</p>
            {isGoogleAccount && (
              <Badge size="sm" variant="neutral">
                {t('Managed by Google')}
              </Badge>
            )}
          </div>
        </div>

        {!isGoogleAccount && (
          <div className="px-4 py-4 sm:px-5">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetPassword}
              disabled={resetStatus === 'sending'}
              loading={resetStatus === 'sending'}
              loadingText={t('Loading...')}
              leadingIcon={<KeyRound className="size-4" />}
              aria-label={t('Reset Password')}
            >
              {t('Reset Password')}
            </Button>
            {resetStatus === 'sent' && (
              <p className="mt-2 text-xs leading-5 text-(--mc-color-success)" role="status">
                {t('Password reset email sent. Check your inbox.')}
              </p>
            )}
            {resetStatus === 'error' && (
              <p className="mt-2 text-xs leading-5 text-(--mc-color-danger)" role="alert">
                {t('Failed to send reset email. Please try again.')}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogout}
            disabled={logoutLoading}
            loading={logoutLoading}
            loadingText={t('Loading...')}
            leadingIcon={<LogOut className="size-4" />}
            aria-label={t('Log Out')}
          >
            {t('Log Out')}
          </Button>
        </div>

        <div className="bg-(--mc-color-danger)/5 px-4 py-4 sm:px-5">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-(--mc-color-text)">{t('Delete Account')}</p>
              <p className="mt-1 text-xs leading-5 text-(--mc-color-text-muted)">
                {t('This action is permanent and cannot be undone. All your data, including your profile, posts, and progress, will be permanently deleted.')}
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              leadingIcon={<Trash2 className="size-4" />}
              aria-label={t('Delete Account')}
              className="shrink-0"
            >
              {t('Delete Account')}
            </Button>
          </div>
          {deleteError && (
            <p className="mt-2 text-xs text-(--mc-color-danger)" role="alert">{deleteError}</p>
          )}
        </div>
      </SettingsSection>

      {/* Delete account confirmation dialog */}
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
      />
    </>
  )
}
