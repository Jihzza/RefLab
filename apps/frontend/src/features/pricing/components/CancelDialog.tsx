import { useRef, useState } from 'react'
import { cancelSubscription } from '../api/pricingApi'
import type { Subscription } from '@/features/billing/types'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'

interface CancelDialogProps {
  isOpen: boolean
  onClose: () => void
  subscription: Subscription
  onSuccess: () => void
}

export default function CancelDialog({ isOpen, onClose, subscription, onSuccess }: CancelDialogProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const keepButtonRef = useRef<HTMLButtonElement>(null)

  const endDate = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('pt-PT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'fim do período de faturação'

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)

    const { error: cancelError } = await cancelSubscription(subscription.stripe_subscription_id)

    if (cancelError) {
      setError(cancelError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onSuccess()
    onClose()
  }

  const handleClose = () => {
    if (loading) return
    setError(null)
    onClose()
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      title={<span className="text-(--mc-color-warning)">{t('Cancel Subscription')}</span>}
      description={t("Your subscription will remain active until {{date}}. After that, billing will stop and your account will continue on the Free plan.", { date: endDate })}
      dialogRole="alertdialog"
      size="sm"
      initialFocusRef={keepButtonRef}
      closeOnEscape={!loading}
      closeOnOverlayClick={!loading}
      showCloseButton={!loading}
      bodyClassName={error ? undefined : 'hidden'}
      footer={(
        <div className="grid w-full grid-cols-2 gap-3">
          <Button ref={keepButtonRef} variant="secondary" onClick={handleClose} disabled={loading}>
            {t('Keep Subscription')}
          </Button>
          <Button onClick={handleConfirm} loading={loading} loadingText={t('Canceling...')}>
            {t('Cancel Plan')}
          </Button>
        </div>
      )}
    >
      {error && (
        <div className="rounded-(--mc-radius-input) border border-(--mc-color-danger)/30 bg-(--mc-color-danger)/10 p-3 text-sm text-(--mc-color-danger)" role="alert">
          {error}
        </div>
      )}
    </Dialog>
  )
}
