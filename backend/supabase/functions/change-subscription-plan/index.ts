import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.7'
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { billingRequestMatchesAuthenticatedUser } from '../_shared/billingIdentity.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Plan = 'pro' | 'plus'

const PAID_PLANS_ENABLED = Deno.env.get('PAID_PLANS_ENABLED') === 'true'

const SUBSCRIPTION_ID_PATTERN = /^sub_[A-Za-z0-9]+$/

const PLAN_PRICE_MAP: Record<Plan, string | undefined> = {
  pro: Deno.env.get('PLAN_PRO_PRICE_ID') ?? Deno.env.get('STRIPE_PRICE_PRO'),
  plus: Deno.env.get('PLAN_PLUS_PRICE_ID') ?? Deno.env.get('STRIPE_PRICE_PLUS'),
}

function priceConfigurationIsValid() {
  return Boolean(
    PLAN_PRICE_MAP.pro
    && PLAN_PRICE_MAP.plus
    && PLAN_PRICE_MAP.pro !== PLAN_PRICE_MAP.plus,
  )
}

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

  if (!PAID_PLANS_ENABLED) {
    console.warn('change-subscription-plan: paid plans are disabled')
    return new Response(JSON.stringify({ error: 'Billing is temporarily unavailable' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!stripeKey || !supabaseUrl || !anonKey || !serviceRoleKey
      || !priceConfigurationIsValid()) {
      console.error('change-subscription-plan: billing environment is not configured')
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

    const body = await req.json().catch(() => null) as {
      subscription_id?: unknown
      new_plan?: unknown
      expected_user_id?: unknown
    } | null
    if (!billingRequestMatchesAuthenticatedUser(body, user.id)) {
      return new Response(JSON.stringify({ error: 'Billing identity mismatch' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const subscriptionId = body?.subscription_id
    const requestedPlan = body?.new_plan

    if (typeof subscriptionId !== 'string'
      || !SUBSCRIPTION_ID_PATTERN.test(subscriptionId)
      || subscriptionId.length > 255) {
      return new Response(JSON.stringify({ error: 'Invalid subscription_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (requestedPlan !== 'pro' && requestedPlan !== 'plus') {
      return new Response(JSON.stringify({ error: 'Invalid plan. Must be "pro" or "plus".' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const newPlan: Plan = requestedPlan
    const newPriceId = PLAN_PRICE_MAP[newPlan]
    if (!newPriceId) {
      console.error(`change-subscription-plan: price is not configured for ${newPlan}`)
      return new Response(JSON.stringify({ error: 'Billing is temporarily unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify ownership
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
    )

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('deletion_started_at')
      .eq('id', user.id)
      .maybeSingle()
    if (profileError) {
      throw new Error(`Failed to verify account state: ${profileError.message}`)
    }
    if (!profile || profile.deletion_started_at !== null) {
      return new Response(JSON.stringify({ error: 'Account deletion is in progress' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: sub, error: subError } = await supabaseAdmin
      .from('stripe_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle()

    if (subError) {
      throw new Error(`Failed to verify subscription ownership: ${subError.message}`)
    }

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
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    if (getId(subscription.customer) !== customer.stripe_customer_id) {
      throw new Error('Stripe subscription customer does not match its owner')
    }
    if (subscription.metadata?.supabase_user_id
      && subscription.metadata.supabase_user_id !== user.id) {
      throw new Error('Stripe subscription metadata does not match its owner')
    }
    if (isClosedSubscription(subscription.status)) {
      return new Response(JSON.stringify({ error: 'Subscription is no longer active' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (subscription.cancel_at_period_end) {
      return new Response(
        JSON.stringify({ error: 'Reactivate the subscription before changing plan' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // RefLab plans are one-price subscriptions. Refuse to guess which item to
    // mutate if Stripe contains add-ons or more items than the retrieve page.
    if (subscription.items.has_more || subscription.items.data.length !== 1) {
      return new Response(
        JSON.stringify({ error: 'Subscription configuration requires support' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const item = subscription.items.data[0]
    const currentPriceId = item?.price?.id
    if (!item?.id || !currentPriceId) {
      throw new Error('Stripe subscription item is incomplete')
    }
    if (item.quantity !== 1) {
      return new Response(
        JSON.stringify({ error: 'Subscription configuration requires support' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const knownPriceIds = new Set(Object.values(PLAN_PRICE_MAP))
    if (!knownPriceIds.has(currentPriceId)) {
      return new Response(
        JSON.stringify({ error: 'Subscription configuration requires support' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const updatedSubscription = currentPriceId === newPriceId
      ? subscription
      : await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: item.id, price: newPriceId }],
        proration_behavior: 'none',
      })

    const updatedItem = updatedSubscription.items.data[0]
    if (updatedSubscription.items.has_more
      || updatedSubscription.items.data.length !== 1
      || updatedItem?.price?.id !== newPriceId
      || updatedItem.quantity !== 1) {
      throw new Error('Stripe returned an unexpected subscription configuration')
    }

    // Apply the authoritative Stripe response immediately; the signed webhook
    // converges the same fields if this response or DB write is interrupted.
    const { error: updateError } = await supabaseAdmin
      .from('stripe_subscriptions')
      .update({
        price_id: newPriceId,
        plan: newPlan,
        status: updatedSubscription.status,
        current_period_end: toIso(updatedSubscription.current_period_end),
        cancel_at_period_end: updatedSubscription.cancel_at_period_end,
      })
      .eq('stripe_subscription_id', subscriptionId)

    if (updateError) {
      throw new Error(`Failed to persist changed subscription: ${updateError.message}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('change-subscription-plan error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
