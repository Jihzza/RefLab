import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Dialog, Input } from '@/components/ui'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmLabel?: string
  confirmPhrase?: string
  variant?: 'danger' | 'warning'
  loading?: boolean
  error?: string | null
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  confirmPhrase,
  variant = 'danger',
  loading = false,
  error,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  const [typedPhrase, setTypedPhrase] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const phraseInputRef = useRef<HTMLInputElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const confirmingRef = useRef(false)

  const busy = loading || isConfirming
  const phraseMatches = !confirmPhrase || typedPhrase === confirmPhrase
  const resolvedConfirmLabel = confirmLabel ?? t('Confirm')
  const toneClassName = variant === 'danger'
    ? 'text-(--mc-color-danger)'
    : 'text-(--mc-color-warning)'

  useEffect(() => {
    if (!isOpen) {
      confirmingRef.current = false
      setTypedPhrase('')
      setIsConfirming(false)
    }
  }, [isOpen])

  const handleClose = () => {
    if (loading || confirmingRef.current) return
    setTypedPhrase('')
    onClose()
  }

  const handleConfirm = async () => {
    if (loading || confirmingRef.current || !phraseMatches) return
    confirmingRef.current = true
    setIsConfirming(true)
    try {
      await onConfirm()
      setTypedPhrase('')
    } finally {
      confirmingRef.current = false
      setIsConfirming(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      title={<span className={toneClassName}>{title}</span>}
      description={description}
      dialogRole="alertdialog"
      size="sm"
      closeLabel={t('Close')}
      showCloseButton={!busy}
      closeOnEscape={!busy}
      closeOnOverlayClick={!busy}
      initialFocusRef={confirmPhrase ? phraseInputRef : cancelButtonRef}
      bodyClassName={confirmPhrase || error ? 'p-5' : 'p-0'}
      footer={(
        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row">
          <Button
            ref={cancelButtonRef}
            variant="secondary"
            onClick={handleClose}
            disabled={busy}
            fullWidth
          >
            {t('Cancel')}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={() => void handleConfirm()}
            disabled={!phraseMatches || busy}
            loading={busy}
            loadingText={t('Processing...')}
            fullWidth
          >
            {resolvedConfirmLabel}
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        {error && (
          <div
            className="flex items-start gap-2.5 rounded-(--mc-radius-button) border border-(--mc-color-danger)/35 bg-(--mc-color-danger)/8 px-3.5 py-3 text-sm text-(--mc-color-danger)"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}

        {confirmPhrase && (
          <Input
            ref={phraseInputRef}
            type="text"
            value={typedPhrase}
            onChange={(event) => setTypedPhrase(event.target.value)}
            disabled={busy}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            label={t('Type {{phrase}} to confirm', { phrase: confirmPhrase })}
            placeholder={confirmPhrase}
          />
        )}
      </div>
    </Dialog>
  )
}
