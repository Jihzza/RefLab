import { supabase } from '@/lib/supabaseClient'
import { PAID_PLANS_ENABLED } from '../config'
import type { Subscription, PlanId } from '../types'
import { isTrustedStripeUrl } from '../utils/stripeUrls'
import {
  postBillingFunction,
  type BillingRequestIdentity,
} from './billingFunctionClient'

/**
 * Create a Stripe Checkout Session via the create-checkout-session Edge Function.
 * Returns the Stripe Checkout URL to redirect the user to.
 */
export async function createCheckoutSession(
  accessToken: string,
  expectedUserId: string,
  plan: Exclude<PlanId, 'free'>,
): Promise<{ url: string | null; error: Error | null }> {
  if (!PAID_PLANS_ENABLED) {
    return { url: null, error: new Error('Billing is temporarily unavailable') }
  }

  const { data, error } = await postBillingFunction<{ url?: unknown }>(
    'create-checkout-session',
    { accessToken, expectedUserId },
    { plan },
  )
  if (error) return { url: null, error }
  if (!isTrustedStripeUrl(data?.url)) {
    return { url: null, error: new Error('Checkout returned an invalid destination') }
  }
  return { url: data.url, error: null }
}

/**
 * Create a Stripe Customer Portal Session via the create-portal-session Edge Function.
 * Returns the Portal URL to redirect the user to.
 */
export async function createPortalSession(
  accessToken: string,
  expectedUserId: string,
): Promise<{ url: string | null; error: Error | null }> {
  const identity: BillingRequestIdentity = { accessToken, expectedUserId }
  const { data, error } = await postBillingFunction<{ url?: unknown }>(
    'create-portal-session',
    identity,
  )
  if (error) return { url: null, error }
  if (!isTrustedStripeUrl(data?.url)) {
    return { url: null, error: new Error('Portal returned an invalid destination') }
  }
  return { url: data.url, error: null }
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
