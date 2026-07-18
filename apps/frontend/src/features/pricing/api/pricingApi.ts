import { PAID_PLANS_ENABLED } from '@/features/billing/config'
import { postBillingFunction } from '@/features/billing/api/billingFunctionClient'
import type { Invoice } from '../types'

/**
 * Cancel a subscription at the end of the current billing period.
 */
export async function cancelSubscription(
  accessToken: string,
  expectedUserId: string,
  subscriptionId: string,
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await postBillingFunction<{ success?: unknown }>(
    'cancel-subscription',
    { accessToken, expectedUserId },
    { subscription_id: subscriptionId },
  )
  return { success: !error, error }
}

/**
 * Change the plan on a subscription. The new price applies at the next billing cycle (no proration).
 */
export async function changeSubscriptionPlan(
  accessToken: string,
  expectedUserId: string,
  subscriptionId: string,
  newPlan: 'pro' | 'plus',
): Promise<{ success: boolean; error: Error | null }> {
  if (!PAID_PLANS_ENABLED) {
    return { success: false, error: new Error('Billing is temporarily unavailable') }
  }

  const { error } = await postBillingFunction<{ success?: unknown }>(
    'change-subscription-plan',
    { accessToken, expectedUserId },
    { subscription_id: subscriptionId, new_plan: newPlan },
  )
  return { success: !error, error }
}

/**
 * Fetch invoice history from Stripe via edge function.
 */
export async function listInvoices(
  accessToken: string,
  expectedUserId: string,
  limit = 10,
): Promise<{ invoices: Invoice[]; hasMore: boolean; error: Error | null }> {
  const { data, error } = await postBillingFunction<{
    invoices?: unknown
    has_more?: unknown
  }>(
    'list-invoices',
    { accessToken, expectedUserId },
    { limit },
  )
  if (error) return { invoices: [], hasMore: false, error }
  return {
    invoices: Array.isArray(data?.invoices) ? data.invoices as Invoice[] : [],
    hasMore: data?.has_more === true,
    error: null,
  }
}
