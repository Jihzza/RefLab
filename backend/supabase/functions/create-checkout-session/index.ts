import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@17?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Map plan + interval to Stripe Price ID from env vars
const PRICE_MAP: Record<string, string | undefined> = {
  'pro_monthly': Deno.env.get('STRIPE_PRICE_PRO_MONTHLY'),
  'pro_yearly': Deno.env.get('STRIPE_PRICE_PRO_YEARLY'),
  'enterprise_monthly': Deno.env.get('STRIPE_PRICE_ENTERPRISE_MONTHLY'),
  'enterprise_yearly': Deno.env.get('STRIPE_PRICE_ENTERPRISE_YEARLY'),
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify the user's identity from their JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse and validate request body
    const { planId, billingInterval } = await req.json()

    if (!planId || !['pro', 'enterprise'].includes(planId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid planId. Must be "pro" or "enterprise".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!billingInterval || !['monthly', 'yearly'].includes(billingInterval)) {
      return new Response(
        JSON.stringify({ error: 'Invalid billingInterval. Must be "monthly" or "yearly".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Map to Stripe Price ID
    const priceKey = `${planId}_${billingInterval}`
    const stripePriceId = PRICE_MAP[priceKey]

    if (!stripePriceId) {
      console.error(`Missing env var for price key: ${priceKey}`)
      return new Response(
        JSON.stringify({ error: 'Price configuration not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-04-10',
    })

    // 5. Find or create Stripe Customer
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let stripeCustomerId: string

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      stripeCustomerId = customer.id

      // Store the mapping
      await supabaseAdmin
        .from('customers')
        .insert({ id: user.id, stripe_customer_id: stripeCustomerId })
    }

    // 6. Get the origin from the request headers for redirect URLs
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || ''

    // 7. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${origin}/app/billing?checkout=success`,
      cancel_url: `${origin}/app/billing/pricing`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_id: planId,
          billing_interval: billingInterval,
        },
      },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
