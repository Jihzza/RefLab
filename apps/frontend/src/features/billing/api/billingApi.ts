import { supabase } from '@/lib/supabaseClient'
import type { Subscription, PlanId } from '../types'

/**
 * Create a Stripe Checkout Session via the create-checkout-session Edge Function.
 * Returns the Stripe Checkout URL to redirect the user to.
 */
export async function createCheckoutSession(
  plan: Exclude<PlanId, 'free'>,
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
      body: JSON.stringify({ plan }),
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
 * Get the user's effective subscription from Supabase (RLS-protected).
 *
 * A user can have more than one Stripe subscription row. Prefer the most
 * recently updated row that still grants entitlement, matching get_user_plan;
 * only fall back to the latest terminal row so billing history remains
 * available after cancellation.
 */
export async function getSubscription(): Promise<{
  subscription: Subscription | null
  error: Error | null
}> {
  const { data: entitledSubscription, error: entitledError } = await supabase
    .from('stripe_subscriptions')
    .select('*')
    .in('status', ['active', 'trialing', 'past_due'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (entitledError) {
    return { subscription: null, error: new Error(entitledError.message) }
  }

  if (entitledSubscription) {
    return {
      subscription: entitledSubscription as Subscription,
      error: null,
    }
  }

  const { data: latestSubscription, error: latestError } = await supabase
    .from('stripe_subscriptions')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    return { subscription: null, error: new Error(latestError.message) }
  }

  return {
    subscription: latestSubscription as Subscription | null,
    error: null,
  }
}
