import { useState } from 'react'
import { cancelSubscription } from '../api/pricingApi'
import type { Subscription } from '@/features/billing/types'
import { useTranslation } from 'react-i18next'

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

  if (!isOpen) return null

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cancel-dialog-title"
        aria-describedby="cancel-dialog-description"
        className="relative bg-(--bg-surface) rounded-(--radius-card) shadow-xl p-6 max-w-sm w-full mx-4 border border-(--border-subtle)"
      >
        <h2
          id="cancel-dialog-title"
          className="text-lg font-semibold mb-2 text-(--warning)"
        >
          {t('Cancel Subscription')}
        </h2>

        <p
          id="cancel-dialog-description"
          className="text-(--text-secondary) text-sm mb-4"
        >
          {t("Your subscription will remain active until {{date}}. After that, you'll be downgraded to the Free plan and lose access to premium features.", { date: endDate })}
        </p>

        {error && (
          <div
            className="bg-(--error)/10 border border-(--error)/20 text-(--error) text-sm px-3 py-2 rounded-lg mb-4"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-(--radius-button) border border-(--border-subtle) text-(--text-secondary) hover:bg-(--bg-hover) transition-colors disabled:opacity-50"
          >
            {t('Keep Subscription')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-(--radius-button) font-bold bg-(--warning) text-(--bg-primary) hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('Canceling...') : t('Cancel Plan')}
          </button>
        </div>
      </div>
    </div>
  )
}
