import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { mapAuthError } from '../api/authErrors'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'

interface DeleteAccountDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function DeleteAccountDialog({ isOpen, onClose }: DeleteAccountDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { deleteAccount } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Close on Escape from anywhere in the document so keyboard-only users can
  // dismiss the dialog without a focus trap.
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        setError('')
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, loading, onClose])

  if (!isOpen) return null

  const handleDelete = async () => {
    setLoading(true)
    setError('')

    try {
      const { error: deleteError } = await deleteAccount()

      if (deleteError) {
        const mapped = mapAuthError(deleteError, 'delete-account')
        setError(mapped.message)
        setLoading(false)
        return
      }

      // Account deleted — redirect to landing
      navigate('/', { replace: true })
    } catch (err) {
      const mapped = mapAuthError(
        err instanceof Error ? err : new Error('Failed to delete account'),
        'delete-account'
      )
      setError(mapped.message)
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-(--bg-base)/70 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-description"
        className="relative card-console p-6 max-w-sm w-full mx-4 animate-scale-in"
      >
        <h2 id="delete-account-title" className="text-lg font-semibold text-(--error) mb-2">
          {t('Delete Account')}
        </h2>
        <p id="delete-account-description" className="text-(--text-secondary) text-sm mb-4">
          {t('This action is permanent and cannot be undone. All your data, including your profile, posts, and progress, will be permanently deleted.')}
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-(--radius-input) bg-(--error)/10 border border-(--error)/20 text-(--error) text-sm text-center" role="alert">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
            className="flex-1"
          >
            {t('Cancel')}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            loading={loading}
            className="flex-1"
            autoFocus
          >
            {loading ? t('Processing...') : t('Confirm')}
          </Button>
        </div>
      </div>
    </div>
  )
}
