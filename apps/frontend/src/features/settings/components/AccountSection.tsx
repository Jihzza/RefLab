import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Mail, KeyRound, LogOut, Trash2 } from 'lucide-react'
import { useAuth } from '@/features/auth/components/useAuth'
import SettingsSection from './SettingsSection'
import ConfirmDialog from './ConfirmDialog'

export default function AccountSection() {
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
      <SettingsSection title="Account & Security" icon={<Shield className="w-4.5 h-4.5" />}>
        {/* Email */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-(--text-muted)" />
            <span className="text-sm text-(--text-secondary)">Email</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-(--text-primary) truncate flex-1">{email}</p>
            {isGoogleAccount && (
              <span className="text-xs px-2 py-0.5 rounded-(--radius-pill) bg-(--bg-surface-2) border border-(--border-subtle) text-(--text-muted) whitespace-nowrap">
                Managed by Google
              </span>
            )}
          </div>
        </div>

        {/* Reset password (email/password accounts only) */}
        {!isGoogleAccount && (
          <div className="px-4 py-3">
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resetStatus === 'sending'}
              className="flex items-center gap-2 text-sm text-(--text-primary) hover:text-(--brand-yellow) transition-colors disabled:opacity-50"
              aria-label="Reset password"
            >
              <KeyRound className="w-4 h-4" />
              <span>Reset Password</span>
            </button>
            {resetStatus === 'sent' && (
              <p className="text-xs text-(--success) mt-1">
                Password reset email sent. Check your inbox.
              </p>
            )}
            {resetStatus === 'error' && (
              <p className="text-xs text-(--error) mt-1">
                Failed to send reset email. Please try again.
              </p>
            )}
          </div>
        )}

        {/* Log out */}
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={handleLogout}
            disabled={logoutLoading}
            className="flex items-center gap-2 text-sm text-(--text-primary) hover:text-(--brand-yellow) transition-colors disabled:opacity-50"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
            <span>{logoutLoading ? 'Logging out...' : 'Log Out'}</span>
          </button>
        </div>

        {/* Delete account */}
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-2 text-sm text-(--error) hover:opacity-80 transition-colors"
            aria-label="Delete account"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Account</span>
          </button>
          {deleteError && (
            <p className="text-xs text-(--error) mt-1">{deleteError}</p>
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
        title="Delete Account"
        description="This action is permanent and cannot be undone. All your data, including your profile, posts, and progress, will be permanently deleted."
        confirmLabel="Delete Account"
        confirmPhrase="DELETE"
        variant="danger"
        loading={deleteLoading}
      />
    </>
  )
}
