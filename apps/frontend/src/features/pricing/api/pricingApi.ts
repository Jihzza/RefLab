import { supabase } from '@/lib/supabaseClient'
import type { Invoice } from '../types'

/**
 * Cancel a subscription at the end of the current billing period.
 */
export async function cancelSubscription(
  subscriptionId: string,
): Promise<{ success: boolean; error: Error | null }> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, error: new Error('No active session') }
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const response = await fetch(
    `${supabaseUrl}/functions/v1/cancel-subscription`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription_id: subscriptionId }),
    }
  )

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    return { success: false, error: new Error(body.error || `Cancel failed (${response.status})`) }
  }

  return { success: true, error: null }
}

/**
 * Change the plan on a subscription. The new price applies at the next billing cycle (no proration).
 */
export async function changeSubscriptionPlan(
  subscriptionId: string,
  newPlan: 'pro' | 'plus',
): Promise<{ success: boolean; error: Error | null }> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, error: new Error('No active session') }
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const response = await fetch(
    `${supabaseUrl}/functions/v1/change-subscription-plan`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription_id: subscriptionId, new_plan: newPlan }),
    }
  )

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    return { success: false, error: new Error(body.error || `Plan change failed (${response.status})`) }
  }

  return { success: true, error: null }
}

/**
 * Fetch invoice history from Stripe via edge function.
 */
export async function listInvoices(
  limit = 10,
): Promise<{ invoices: Invoice[]; hasMore: boolean; error: Error | null }> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { invoices: [], hasMore: false, error: new Error('No active session') }
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const response = await fetch(
    `${supabaseUrl}/functions/v1/list-invoices`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ limit }),
    }
  )

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    return { invoices: [], hasMore: false, error: new Error(body.error || `Failed to fetch invoices (${response.status})`) }
  }

  const data = await response.json()
  return { invoices: data.invoices ?? [], hasMore: data.has_more ?? false, error: null }
}
