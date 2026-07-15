import { useState } from 'react'
import { AlertTriangle, ArrowRightLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Dialog } from '@/components/ui'
import type { Subscription } from '@/features/billing/types'
import { changeSubscriptionPlan } from '../api/pricingApi'

const PLAN_INFO: Record<'pro' | 'plus', { name: string; price: string }> = {
  pro: { name: 'Pro', price: '€4.99/month' },
  plus: { name: 'Plus', price: '€9.99/month' },
}

interface ChangePlanDialogProps {
  isOpen: boolean
  onClose: () => void
  subscription: Subscription
  targetPlan: 'pro' | 'plus'
  onSuccess: () => void | Promise<void>
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
  const target = PLAN_INFO[targetPlan]

  const closeDialog = () => {
    if (loading) return
    setError(null)
    onClose()
  }

  const handleConfirm = async () => {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const { error: changeError } = await changeSubscriptionPlan(
        subscription.stripe_subscription_id,
        targetPlan,
      )
      if (changeError) throw changeError
      await onSuccess()
      setLoading(false)
      onClose()
    } catch (changeError) {
      console.error('Failed to change subscription plan:', changeError)
      setError(
        changeError instanceof Error
          ? changeError.message
          : t('Failed to change plan. Please try again.'),
      )
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeDialog()
      }}
      title={t('Switch to {{plan}}', { plan: target.name })}
      description={t('Your plan will be updated to {{plan}} at {{price}}. The new price will apply starting from your next billing cycle. No proration charges will be applied.', {
        plan: target.name,
        price: target.price,
      })}
      size="sm"
      showCloseButton={false}
      closeOnEscape={!loading}
      closeOnOverlayClick={!loading}
      footer={
        <>
          <Button variant="secondary" onClick={closeDialog} disabled={loading} className="flex-1">
            {t('Cancel')}
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            loading={loading}
            loadingText={t('Switching...')}
            leadingIcon={<ArrowRightLeft className="size-4" />}
            className="flex-1"
          >
            {t('Switch to {{plan}}', { plan: target.name })}
          </Button>
        </>
      }
    >
      {error && (
        <div
          className="flex items-start gap-2.5 rounded-(--mc-radius-button) border border-(--mc-color-danger)/40 bg-(--mc-color-danger)/8 px-4 py-3 text-sm text-(--mc-color-danger)"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0">{error}</span>
        </div>
      )}
    </Dialog>
  )
}
