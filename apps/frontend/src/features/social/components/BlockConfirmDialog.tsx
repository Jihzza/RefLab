import React from 'react'
import { ShieldX } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useTranslation } from 'react-i18next'

interface BlockConfirmDialogProps {
  username: string
  onConfirm: () => void
  onClose: () => void
}

/** Confirmation dialog before blocking a user. */
const BlockConfirmDialog: React.FC<BlockConfirmDialogProps> = ({
  username,
  onConfirm,
  onClose,
}) => {
  const { t } = useTranslation()
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-(--bg-base)/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="block-dialog-title"
          className="card-console w-full max-w-xs shadow-[var(--shadow-pop)] pointer-events-auto animate-scale-in"
        >
          {/* Body */}
          <div className="px-5 py-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-(--error)/12 flex items-center justify-center">
              <ShieldX className="h-6 w-6 text-(--error)" aria-hidden="true" />
            </div>
            <h2 id="block-dialog-title" className="text-lg font-bold text-(--text-primary) mb-2">
              {t('Block @{{username}}?', { username })}
            </h2>
            <p className="text-sm text-(--text-muted)">
              {t("They won't be able to see your posts and you won't see theirs.")}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 px-5 py-4 border-t border-(--border-subtle)">
            <Button variant="ghost" fullWidth onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button variant="danger" fullWidth onClick={onConfirm}>
              {t('Block')}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default BlockConfirmDialog
