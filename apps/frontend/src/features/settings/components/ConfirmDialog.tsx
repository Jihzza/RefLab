import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
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

  if (!isOpen) return null

  const phraseMatches = !confirmPhrase || typedPhrase === confirmPhrase
  const confirmDisabled = loading || !phraseMatches

  const titleColor = variant === 'danger' ? 'text-(--error)' : 'text-(--warning)'
  const accentBar = variant === 'danger' ? 'bg-(--error)' : 'bg-(--warning)'

  const handleClose = () => {
    setTypedPhrase('')
    onClose()
  }

  const handleConfirm = async () => {
    await onConfirm()
    setTypedPhrase('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="relative card-console overflow-hidden shadow-[var(--shadow-pop)] max-w-sm w-full mx-4 animate-scale-in"
      >
        <span className={`block h-1 w-full ${accentBar}`} aria-hidden="true" />
        <div className="p-6">
          <h2
            id="confirm-dialog-title"
            className={`text-lg font-bold mb-2 ${titleColor}`}
          >
            {title}
          </h2>
          <p
            id="confirm-dialog-description"
            className="text-(--text-secondary) text-sm mb-4"
          >
            {description}
          </p>

          {confirmPhrase && (
            <div className="mb-4">
              <Input
                label={t('Type {{phrase}} to confirm', { phrase: confirmPhrase })}
                type="text"
                value={typedPhrase}
                onChange={(e) => setTypedPhrase(e.target.value)}
                disabled={loading}
                autoComplete="off"
                placeholder={confirmPhrase}
              />
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={handleClose}
              disabled={loading}
            >
              {t('Cancel')}
            </Button>
            {variant === 'danger' ? (
              <Button
                variant="danger"
                fullWidth
                loading={loading}
                disabled={confirmDisabled}
                onClick={handleConfirm}
              >
                {loading ? t('Processing...') : confirmLabel}
              </Button>
            ) : (
              <Button
                variant="primary"
                fullWidth
                loading={loading}
                disabled={confirmDisabled}
                onClick={handleConfirm}
                className="!text-(--bg-primary)"
                style={{ backgroundImage: 'none', backgroundColor: 'var(--warning)' }}
              >
                {loading ? t('Processing...') : confirmLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
