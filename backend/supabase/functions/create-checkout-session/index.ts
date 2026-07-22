import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.8'
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Plan = 'pro' | 'plus'

const PLAN_PRICE_MAP: Record<Plan, string | undefined> = {
  pro: Deno.env.get('PLAN_PRO_PRICE_ID') ?? Deno.env.get('STRIPE_PRICE_PRO'),
  plus: Deno.env.get('PLAN_PLUS_PRICE_ID') ?? Deno.env.get('STRIPE_PRICE_PLUS'),
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    if (Deno.env.get('PAID_PLANS_ENABLED') !== 'true') {
      return new Response(JSON.stringify({ error: 'Paid plans are not available yet' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), {
        status: 500,
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

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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
    const plan = body?.plan as Plan | undefined
    if (!plan || !['pro', 'plus'].includes(plan)) {
      return new Response(JSON.stringify({ error: 'Invalid plan. Must be "pro" or "plus".' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripePriceId = PLAN_PRICE_MAP[plan]
    if (!stripePriceId) {
      return new Response(JSON.stringify({ error: `Missing price config for plan: ${plan}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-04-10',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: deletionJob, error: deletionJobError } = await supabaseAdmin
      .from('account_deletion_jobs')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (deletionJobError) {
      throw new Error(`Failed to check account deletion state: ${deletionJobError.message}`)
    }

    if (deletionJob) {
      return new Response(JSON.stringify({ error: 'Account deletion is in progress' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: existingSubscription, error: existingSubscriptionError } = await supabaseAdmin
      .from('stripe_subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due', 'unpaid'])
      .limit(1)
      .maybeSingle()

    if (existingSubscriptionError) {
      throw new Error(`Failed to check current subscription: ${existingSubscriptionError.message}`)
    }

    if (existingSubscription) {
      return new Response(JSON.stringify({ error: 'An active subscription already exists' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: existingCustomer, error: existingCustomerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingCustomerError) {
      throw new Error(`Failed to load Stripe customer: ${existingCustomerError.message}`)
    }

    let stripeCustomerId = existingCustomer?.stripe_customer_id ?? ''
    const checkoutLifetimeSeconds = 60 * 60
    const checkoutWindow = Math.floor(Date.now() / (checkoutLifetimeSeconds * 1000))

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      }, {
        idempotencyKey: `reflab-customer-${user.id}`,
      })
      stripeCustomerId = customer.id

      const { error: customerUpsertError } = await supabaseAdmin
        .from('stripe_customers')
        .upsert({ user_id: user.id, stripe_customer_id: stripeCustomerId }, { onConflict: 'user_id' })

      if (customerUpsertError) {
        throw new Error(`Failed to store Stripe customer: ${customerUpsertError.message}`)
      }
    }

    const origin = (Deno.env.get('SITE_URL') ?? 'https://reflab.netlify.app').replace(/\/$/, '')

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${origin}/app/pricing?checkout=success`,
      cancel_url: `${origin}/app/pricing`,
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan,
        },
      },
      expires_at: Math.floor(Date.now() / 1000) + checkoutLifetimeSeconds,
    }, {
      idempotencyKey: `reflab-checkout-${user.id}-${plan}-${checkoutWindow}`,
    })

    if (!session.url) {
      return new Response(JSON.stringify({ error: 'Stripe did not return checkout url' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('create-checkout-session error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
