import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
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
  const [confirmation, setConfirmation] = useState('')
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

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
    if (loading) return
    setError('')
    setConfirmation('')
    onClose()
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      title={<span className="inline-flex items-center gap-2 text-(--mc-color-danger)"><Trash2 className="size-5" aria-hidden="true" />{t('Eliminar Cuenta')}</span>}
      description={t('Esta accion es permanente y no se puede deshacer. Todos tus datos, incluyendo tu perfil y progreso, seran eliminados permanentemente.')}
      dialogRole="alertdialog"
      size="sm"
      initialFocusRef={cancelButtonRef}
      closeOnEscape={!loading}
      closeOnOverlayClick={!loading}
      showCloseButton={!loading}
      footer={(
        <div className="grid w-full grid-cols-2 gap-3">
          <Button ref={cancelButtonRef} variant="secondary" onClick={handleClose} disabled={loading}>
            {t('Cancelar')}
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={confirmation !== 'DELETE'}
            loading={loading}
            loadingText={t('Eliminando...')}
          >
            {t('Confirmar')}
          </Button>
        </div>
      )}
    >
      <p className="mb-4 rounded-(--mc-radius-input) border border-(--mc-color-warning)/30 bg-(--mc-color-warning)/10 p-3 text-sm leading-6 text-(--mc-color-text-secondary)">
        {t('Any active subscription will be cancelled immediately before deletion.')}
      </p>
      <Input
        label={t('Type {{phrase}} to confirm', { phrase: 'DELETE' })}
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        disabled={loading}
        autoComplete="off"
        spellCheck={false}
        placeholder="DELETE"
      />
      {error && (
        <div className="mt-4 rounded-(--mc-radius-input) border border-(--mc-color-danger)/30 bg-(--mc-color-danger)/10 p-3 text-sm text-(--mc-color-danger)" role="alert">
          {error}
        </div>
      )}
    </Dialog>
  )
}
