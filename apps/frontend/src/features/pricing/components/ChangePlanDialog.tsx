import { useState } from 'react'
import { changeSubscriptionPlan } from '../api/pricingApi'
import type { Subscription } from '@/features/billing/types'
import { useTranslation } from 'react-i18next'

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

  if (!isOpen) return null

  const target = PLAN_INFO[targetPlan]

  const handleConfirm = async () => {
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
        aria-labelledby="change-plan-dialog-title"
        aria-describedby="change-plan-dialog-description"
        className="relative bg-(--bg-surface) rounded-(--radius-card) shadow-xl p-6 max-w-sm w-full mx-4 border border-(--border-subtle)"
      >
        <h2
          id="change-plan-dialog-title"
          className="text-lg font-semibold mb-2 text-(--text-primary)"
        >
          {t('Switch to {{plan}}', { plan: target.name })}
        </h2>

        <p
          id="change-plan-dialog-description"
          className="text-(--text-secondary) text-sm mb-4"
        >
          {t('Your plan will be updated to {{plan}} at {{price}}. The new price will apply starting from your next billing cycle. No proration charges will be applied.', {
            plan: target.name,
            price: target.price,
          })}
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
            {t('Cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-(--radius-button) font-bold bg-(--brand-yellow) text-(--bg-primary) hover:bg-(--brand-yellow-soft) transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('Switching...') : t('Switch to {{plan}}', { plan: target.name })}
          </button>
        </div>
      </div>
    </div>
  )
}
