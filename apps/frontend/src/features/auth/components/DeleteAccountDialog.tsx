import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { mapAuthError } from '../api/authErrors'
import { useTranslation } from 'react-i18next'

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
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-(--bg-surface) rounded-(--radius-card) shadow-xl p-6 max-w-sm w-full mx-4 border border-(--border-subtle)">
        <h2 className="text-lg font-semibold text-(--error) mb-2">
          {t('Eliminar Cuenta')}
        </h2>
        <p className="text-(--text-secondary) text-sm mb-4">
          {t('Esta accion es permanente y no se puede deshacer. Todos tus datos, incluyendo tu perfil y progreso, seran eliminados permanentemente.')}
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-(--radius-input) bg-(--error)/10 border border-(--error)/20 text-(--error) text-sm text-center">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-(--radius-button) border border-(--border-subtle)
              text-(--text-secondary) hover:bg-(--bg-hover) transition-colors
              disabled:opacity-50"
          >
            {t('Cancelar')}
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-(--radius-button) font-bold transition-all
              bg-(--error) text-white
              hover:opacity-90
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('Eliminando...') : t('Confirmar')}
          </button>
        </div>
      </div>
    </div>
  )
}
