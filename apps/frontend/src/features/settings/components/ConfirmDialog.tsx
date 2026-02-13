import { useState } from 'react'

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
  const [typedPhrase, setTypedPhrase] = useState('')

  if (!isOpen) return null

  const phraseMatches = !confirmPhrase || typedPhrase === confirmPhrase
  const confirmDisabled = loading || !phraseMatches

  const variantStyles = {
    danger: {
      titleColor: 'text-(--error)',
      buttonBg: 'bg-(--error) text-white hover:opacity-90',
    },
    warning: {
      titleColor: 'text-(--warning)',
      buttonBg: 'bg-(--warning) text-(--bg-primary) hover:opacity-90',
    },
  }

  const styles = variantStyles[variant]

  const handleClose = () => {
    setTypedPhrase('')
    onClose()
  }

  const handleConfirm = async () => {
    await onConfirm()
    setTypedPhrase('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="relative bg-(--bg-surface) rounded-(--radius-card) shadow-xl p-6 max-w-sm w-full mx-4 border border-(--border-subtle)"
      >
        <h2
          id="confirm-dialog-title"
          className={`text-lg font-semibold mb-2 ${styles.titleColor}`}
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
            <label className="block text-xs text-(--text-muted) mb-1.5">
              Type <span className="font-mono font-semibold text-(--text-primary)">
                {confirmPhrase}
              </span> to confirm
            </label>
            <input
              type="text"
              value={typedPhrase}
              onChange={(e) => setTypedPhrase(e.target.value)}
              disabled={loading}
              autoComplete="off"
              placeholder={confirmPhrase}
              className="w-full px-3 py-2 text-sm outline-none transition-all
                bg-(--bg-surface-2)
                border border-(--border-subtle)
                rounded-(--radius-input)
                text-(--text-primary)
                placeholder-(--text-muted)
                focus:border-(--brand-yellow)
                focus:ring-1 focus:ring-(--brand-yellow)
                disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-(--radius-button) border border-(--border-subtle)
              text-(--text-secondary) hover:bg-(--bg-hover) transition-colors
              disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className={`flex-1 py-2.5 px-4 rounded-(--radius-button) font-bold transition-all
              ${styles.buttonBg}
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
