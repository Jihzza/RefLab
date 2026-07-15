import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClockAlert } from 'lucide-react'
import { Button, Dialog } from '@/components/ui'

interface SessionExpiredModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SessionExpiredModal({ isOpen, onClose }: SessionExpiredModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleLogin = () => {
    onClose()
    navigate('/')
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {}}
      title={t('Session Expired')}
      description={t('Your session has expired. Please log in again to continue.')}
      dialogRole="alertdialog"
      size="sm"
      showCloseButton={false}
      closeOnEscape={false}
      closeOnOverlayClick={false}
      footer={(
        <Button type="button" fullWidth onClick={handleLogin}>
          {t('Log In')}
        </Button>
      )}
    >
      <div className="flex justify-center py-2">
        <span className="flex size-14 items-center justify-center rounded-full border border-(--mc-color-accent)/35 bg-(--mc-color-accent)/10 text-(--mc-color-accent)">
          <ClockAlert className="size-7" aria-hidden="true" />
        </span>
      </div>
    </Dialog>
  )
}
