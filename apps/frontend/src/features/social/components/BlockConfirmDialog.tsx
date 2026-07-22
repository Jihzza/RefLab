import { Ban } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Dialog } from '@/components/ui'

interface BlockConfirmDialogProps {
  username: string
  onConfirm: () => void
  onClose: () => void
}

export default function BlockConfirmDialog({ username, onConfirm, onClose }: BlockConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      dialogRole="alertdialog"
      title={t('Block @{{username}}?', { username })}
      description={t("They won't be able to see your posts and you won't see theirs.")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
          <Button variant="danger" leadingIcon={<Ban className="size-4" />} onClick={onConfirm}>
            {t('Block')}
          </Button>
        </>
      }
    >
      <div className="rounded-(--mc-radius-input) border border-(--mc-color-danger)/30 bg-(--mc-color-danger)/10 p-4 text-sm leading-6 text-(--mc-color-text-secondary)">
        {t('You can unblock this person later from your profile settings.')}
      </div>
    </Dialog>
  )
}
