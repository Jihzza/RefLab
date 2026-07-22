import { useRef, useState } from 'react'
import { changeSubscriptionPlan } from '../api/pricingApi'
import { PAID_PLANS_ENABLED } from '../config'
import type { Subscription } from '@/features/billing/types'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'

/** Plan display info */
const PLAN_INFO: Record<'pro' | 'plus', { name: string; price: string }> = {
  pro: { name: 'Pro', price: '€4.99/month' },
  plus: { name: 'Plus', price: '€9.99/month' },
}

interface ChangePlanDialogProps {
  isOpen: boolean
  onClose: () => void
  subscription: Subscription
  targetPlan: 'pro' | 'plus'
  onSuccess: () => void
}

export default function ChangePlanDialog({
  isOpen,
  onClose,
  subscription,
  targetPlan,
  onSuccess,
}: ChangePlanDialogProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  if (!isOpen || !PAID_PLANS_ENABLED) return null

  const target = PLAN_INFO[targetPlan]

  const handleConfirm = async () => {
    if (!PAID_PLANS_ENABLED) return

    setLoading(true)
    setError(null)

    const { error: changeError } = await changeSubscriptionPlan(
      subscription.stripe_subscription_id,
      targetPlan,
    )

    if (changeError) {
      setError(changeError.message)
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
      title={t('Switch to {{plan}}', { plan: target.name })}
      description={t('Your plan will be updated to {{plan}} at {{price}}. The new price will apply starting from your next billing cycle. No proration charges will be applied.', {
        plan: target.name,
        price: target.price,
      })}
      dialogRole="alertdialog"
      size="sm"
      initialFocusRef={cancelButtonRef}
      closeOnEscape={!loading}
      closeOnOverlayClick={!loading}
      showCloseButton={!loading}
      bodyClassName={error ? undefined : 'hidden'}
      footer={(
        <div className="grid w-full grid-cols-2 gap-3">
          <Button ref={cancelButtonRef} variant="secondary" onClick={handleClose} disabled={loading}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleConfirm} loading={loading} loadingText={t('Switching...')}>
            {t('Switch to {{plan}}', { plan: target.name })}
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
