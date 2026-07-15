import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { mapAuthError } from '../api/authErrors'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { Button, Dialog } from '@/components/ui'

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
    <Dialog
      open={isOpen}
      onOpenChange={open => {
        if (!open && !loading) handleClose()
      }}
      title={t('Eliminar Cuenta')}
      description={t('Esta accion es permanente y no se puede deshacer. Todos tus datos, incluyendo tu perfil y progreso, seran eliminados permanentemente.')}
      dialogRole="alertdialog"
      size="sm"
      showCloseButton={false}
      closeOnEscape={!loading}
      closeOnOverlayClick={!loading}
      footer={(
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
            className="flex-1"
          >
            {t('Cancelar')}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            loading={loading}
            loadingText={t('Eliminando...')}
            className="flex-1"
          >
            {t('Confirmar')}
          </Button>
        </>
      )}
    >
      <div className="flex flex-col items-center py-1 text-center">
        <span className="flex size-14 items-center justify-center rounded-full border border-(--mc-color-danger)/40 bg-(--mc-color-danger)/10 text-(--mc-color-danger)">
          <AlertTriangle className="size-7" aria-hidden="true" />
        </span>
        {error && (
          <div role="alert" className="mt-5 w-full rounded-(--mc-radius-input) border border-(--mc-color-danger)/45 bg-(--mc-color-danger)/10 px-3 py-2.5 text-sm leading-5 text-(--mc-color-danger)">
            {error}
          </div>
        )}
      </div>
    </Dialog>
  )
}
