import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Mail, KeyRound, LogOut, Trash2 } from 'lucide-react'
import { useAuth } from '@/features/auth/components/useAuth'
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
      <SettingsSection title={t('Account & Security')} icon={<Shield className="w-4.5 h-4.5" aria-hidden="true" />}>
        {/* Email */}
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Mail className="w-4 h-4 text-(--text-muted)" aria-hidden="true" />
            <span className="eyebrow">{t('Email')}</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-(--text-primary) truncate flex-1">{email}</p>
            {isGoogleAccount && (
              <span className="text-xs px-2 py-0.5 rounded-(--radius-pill) bg-(--bg-surface-2) border border-(--border-subtle) text-(--text-muted) whitespace-nowrap">
                {t('Managed by Google')}
              </span>
            )}
          </div>
        </div>

        {/* Reset password (email/password accounts only) */}
        {!isGoogleAccount && (
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm text-(--text-primary)">{t('Reset Password')}</p>
              {resetStatus === 'sent' && (
                <p className="text-xs text-(--success) mt-0.5">
                  {t('Password reset email sent. Check your inbox.')}
                </p>
              )}
              {resetStatus === 'error' && (
                <p className="text-xs text-(--error) mt-0.5">
                  {t('Failed to send reset email. Please try again.')}
                </p>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<KeyRound className="w-4 h-4" aria-hidden="true" />}
              onClick={handleResetPassword}
              loading={resetStatus === 'sending'}
              disabled={resetStatus === 'sending'}
              aria-label={t('Reset Password')}
              className="shrink-0"
            >
              {t('Reset Password')}
            </Button>
          </div>
        )}

        {/* Log out */}
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <p className="text-sm text-(--text-primary)">{t('Log Out')}</p>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<LogOut className="w-4 h-4" aria-hidden="true" />}
            onClick={handleLogout}
            loading={logoutLoading}
            disabled={logoutLoading}
            aria-label={t('Log Out')}
            className="shrink-0"
          >
            {logoutLoading ? `${t('Loading...')}` : t('Log Out')}
          </Button>
        </div>

        {/* Delete account */}
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-sm text-(--text-primary)">{t('Delete Account')}</p>
            {deleteError && (
              <p className="text-xs text-(--error) mt-0.5">{deleteError}</p>
            )}
          </div>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 className="w-4 h-4" aria-hidden="true" />}
            onClick={() => setDeleteOpen(true)}
            aria-label={t('Delete Account')}
            className="shrink-0"
          >
            {t('Delete Account')}
          </Button>
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
