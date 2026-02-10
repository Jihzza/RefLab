import { supabase } from '@/lib/supabaseClient'
import type { Subscription, Invoice, PlanId, BillingInterval } from '../types'

/**
 * Create a Stripe Checkout Session via the create-checkout-session Edge Function.
 * Returns the Stripe Checkout URL to redirect the user to.
 */
export async function createCheckoutSession(
  planId: Exclude<PlanId, 'free'>,
  billingInterval: BillingInterval
): Promise<{ url: string | null; error: Error | null }> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { url: null, error: new Error('No active session') }
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const response = await fetch(
    `${supabaseUrl}/functions/v1/create-checkout-session`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ planId, billingInterval }),
    }
  )

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    return { url: null, error: new Error(body.error || `Checkout failed (${response.status})`) }
  }

  const { url } = await response.json()
  return { url, error: null }
}

/**
 * Create a Stripe Customer Portal Session via the create-portal-session Edge Function.
 * Returns the Portal URL to redirect the user to.
 */
export async function createPortalSession(): Promise<{ url: string | null; error: Error | null }> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { url: null, error: new Error('No active session') }
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const response = await fetch(
    `${supabaseUrl}/functions/v1/create-portal-session`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    return { url: null, error: new Error(body.error || `Portal session failed (${response.status})`) }
  }

  const { url } = await response.json()
  return { url, error: null }
}

/**
 * Get the user's active subscription from Supabase (RLS-protected).
 * Returns the most recent active/trialing/past_due subscription.
 */
export async function getSubscription(): Promise<{
  subscription: Subscription | null
  error: Error | null
}> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { subscription: null, error: new Error(error.message) }
  }

  return { subscription: data as Subscription | null, error: null }
}

/**
 * Get the user's invoices from Supabase (RLS-protected).
 */
export async function getInvoices(limit = 10): Promise<{
  invoices: Invoice[]
  error: Error | null
}> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { invoices: [], error: new Error(error.message) }
  }

  return { invoices: (data ?? []) as Invoice[], error: null }
}
