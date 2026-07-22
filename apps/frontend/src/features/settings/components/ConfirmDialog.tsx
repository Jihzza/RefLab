import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  /** Button label for the confirm action */
  confirmLabel?: string
  /** If set, user must type this exact phrase to enable the confirm button */
  confirmPhrase?: string
  /** Controls color scheme: 'danger' = red, 'warning' = yellow */
  variant?: 'danger' | 'warning'
  loading?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmPhrase,
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  const [typedPhrase, setTypedPhrase] = useState('')
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  const phraseMatches = !confirmPhrase || typedPhrase === confirmPhrase
  const confirmDisabled = loading || !phraseMatches

  const handleClose = () => {
    if (loading) return
    setTypedPhrase('')
    onClose()
  }

  const handleConfirm = async () => {
    await onConfirm()
    setTypedPhrase('')
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      title={<span className={variant === 'danger' ? 'text-(--mc-color-danger)' : 'text-(--mc-color-warning)'}>{title}</span>}
      description={description}
      dialogRole="alertdialog"
      size="sm"
      initialFocusRef={cancelButtonRef}
      closeOnEscape={!loading}
      closeOnOverlayClick={!loading}
      showCloseButton={!loading}
      bodyClassName={confirmPhrase ? undefined : 'hidden'}
      footer={(
        <div className="grid w-full grid-cols-2 gap-3">
          <Button ref={cancelButtonRef} variant="secondary" onClick={handleClose} disabled={loading}>
            {t('Cancel')}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={confirmDisabled}
            loading={loading}
            loadingText={t('Processing...')}
          >
            {confirmLabel}
          </Button>
        </div>
      )}
    >
      {confirmPhrase && (
        <Input
          label={t('Type {{phrase}} to confirm', { phrase: confirmPhrase })}
          type="text"
          value={typedPhrase}
          onChange={(event) => setTypedPhrase(event.target.value)}
          disabled={loading}
          autoComplete="off"
          placeholder={confirmPhrase}
          spellCheck={false}
        />
      )}
    </Dialog>
  )
}
