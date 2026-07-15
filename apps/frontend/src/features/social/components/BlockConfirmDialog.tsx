import { useRef } from 'react'
import { Ban } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'

interface BlockConfirmDialogProps {
  username: string
  onConfirm: () => void
  onClose: () => void
}

/** Destructive confirmation using the shared focus and Escape behavior. */
export default function BlockConfirmDialog({
  username,
  onConfirm,
  onClose,
}: BlockConfirmDialogProps) {
  const { t } = useTranslation()
  const cancelRef = useRef<HTMLButtonElement>(null)

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={t('Block @{{username}}?', { username })}
      description={t("They won't be able to see your posts and you won't see theirs.")}
      dialogRole="alertdialog"
      initialFocusRef={cancelRef}
      size="sm"
      showCloseButton={false}
      overlayClassName="backdrop-blur-sm"
      footer={(
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button
            variant="danger"
            leadingIcon={<Ban className="size-4" />}
            onClick={onConfirm}
          >
            {t('Block')}
          </Button>
        </>
      )}
    >
      <div className="flex items-start gap-3 rounded-(--mc-radius-input) border border-(--mc-color-danger)/30 bg-(--mc-color-danger)/10 p-4 text-sm leading-6 text-(--mc-color-text-secondary)">
        <Ban className="mt-0.5 size-5 shrink-0 text-(--mc-color-danger)" aria-hidden="true" />
        <span>@{username}</span>
      </div>
    </Dialog>
  )
}
