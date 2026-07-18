import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.7'
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { billingRequestMatchesAuthenticatedUser } from '../_shared/billingIdentity.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUBSCRIPTION_ID_PATTERN = /^sub_[A-Za-z0-9]+$/

function getId(value: string | Stripe.Customer | null | undefined) {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

function isClosedSubscription(status: string) {
  return status === 'canceled' || status === 'incomplete_expired'
}

function toIso(seconds: number | null | undefined) {
  return seconds ? new Date(seconds * 1000).toISOString() : null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Allow': 'POST, OPTIONS',
        'Content-Type': 'application/json',
      },
    })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!stripeKey || !supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('cancel-subscription: billing environment is not configured')
      return new Response(JSON.stringify({ error: 'Billing is temporarily unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify user identity
    const supabaseUser = createClient(
      supabaseUrl,
      anonKey,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => null)
    if (!billingRequestMatchesAuthenticatedUser(body, user.id)) {
      return new Response(JSON.stringify({ error: 'Billing identity mismatch' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const subscriptionId = body?.subscription_id
    if (typeof subscriptionId !== 'string'
      || !SUBSCRIPTION_ID_PATTERN.test(subscriptionId)
      || subscriptionId.length > 255) {
      return new Response(JSON.stringify({ error: 'Invalid subscription_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify ownership: subscription must belong to this user
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
    )

    const { data: sub, error: subError } = await supabaseAdmin
      .from('stripe_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle()

    if (subError) {
      throw new Error(`Failed to verify subscription ownership: ${subError.message}`)
    }

    // Use one not-found response for absent and foreign IDs so the endpoint
    // does not become a subscription ownership oracle.
    if (!sub || sub.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Subscription not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (customerError) {
      throw new Error(`Failed to verify billing customer: ${customerError.message}`)
    }
    if (!customer?.stripe_customer_id) {
      throw new Error('Subscription owner has no Stripe customer mapping')
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-04-10',
      httpClient: Stripe.createFetchHttpClient(),
    })
    const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId)
    if (getId(currentSubscription.customer) !== customer.stripe_customer_id) {
      throw new Error('Stripe subscription customer does not match its owner')
    }
    if (currentSubscription.metadata?.supabase_user_id
      && currentSubscription.metadata.supabase_user_id !== user.id) {
      throw new Error('Stripe subscription metadata does not match its owner')
    }

    const subscription = isClosedSubscription(currentSubscription.status)
      ? currentSubscription
      : await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      })

    // Persist Stripe's returned state for immediate UI convergence. The signed
    // subscription.updated webhook remains authoritative and idempotent.
    const { error: updateError } = await supabaseAdmin
      .from('stripe_subscriptions')
      .update({
        status: subscription.status,
        current_period_end: toIso(subscription.current_period_end),
        cancel_at_period_end: subscription.cancel_at_period_end,
      })
      .eq('stripe_subscription_id', subscriptionId)

    if (updateError) {
      throw new Error(`Failed to persist canceled subscription: ${updateError.message}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('cancel-subscription error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
