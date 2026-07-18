import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Dialog } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import { useBillingRequestIdentity } from '@/features/billing/hooks/useBillingRequestIdentity'
import type { Subscription } from '@/features/billing/types'
import { cancelSubscription } from '../api/pricingApi'

interface CancelDialogProps {
  isOpen: boolean
  onClose: () => void
  subscription: Subscription
  onSuccess: () => void | Promise<void>
}

export default function CancelDialog({
  isOpen,
  onClose,
  subscription,
  onSuccess,
}: CancelDialogProps) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const captureBillingIdentity = useBillingRequestIdentity()
  const [stateOwnerId, setStateOwnerId] = useState<string | null>(null)
  const [loadingState, setLoadingState] = useState(false)
  const [errorState, setErrorState] = useState<string | null>(null)
  const ownsActionState = stateOwnerId === user?.id
  const loading = ownsActionState ? loadingState : false
  const error = ownsActionState ? errorState : null

  const endDate = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString(i18n.language || 'pt-PT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : t('the end of the billing period')

  const closeDialog = () => {
    if (loading) return
    setStateOwnerId(user?.id ?? null)
    setErrorState(null)
    onClose()
  }

  const handleConfirm = async () => {
    if (loading) return
    const identity = captureBillingIdentity()
    if (!identity || subscription.user_id !== identity.expectedUserId) {
      setStateOwnerId(user?.id ?? null)
      setErrorState(t('Your session has expired. Please sign in again.'))
      return
    }
    setStateOwnerId(identity.expectedUserId)
    setLoadingState(true)
    setErrorState(null)

    try {
      const { error: cancelError } = await cancelSubscription(
        identity.accessToken,
        identity.expectedUserId,
        subscription.stripe_subscription_id,
      )
      if (!identity.isCurrent()) return
      if (cancelError) throw cancelError
      await onSuccess()
      if (!identity.isCurrent()) return
      setLoadingState(false)
      onClose()
    } catch (cancelError) {
      if (!identity.isCurrent()) return
      console.error('Failed to cancel subscription:', cancelError)
      setErrorState(
        cancelError instanceof Error
          ? cancelError.message
          : t('Failed to cancel subscription. Please try again.'),
      )
      setLoadingState(false)
    }
  }

  if (subscription.user_id !== user?.id) return null

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeDialog()
      }}
      title={t('Cancel Subscription')}
      description={t('Your subscription will remain active until {{date}}. After that, your account will move to the Free plan.', { date: endDate })}
      size="sm"
      dialogRole="alertdialog"
      showCloseButton={false}
      closeOnEscape={!loading}
      closeOnOverlayClick={!loading}
      footer={
        <>
          <Button variant="secondary" onClick={closeDialog} disabled={loading} className="flex-1">
            {t('Keep Subscription')}
          </Button>
          <Button
            variant="danger"
            onClick={() => void handleConfirm()}
            loading={loading}
            loadingText={t('Canceling...')}
            className="flex-1"
          >
            {t('Cancel Plan')}
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
