import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.110.7'
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'

type Plan = 'pro' | 'plus'

const PRO_PRICE_IDS = new Set([
  Deno.env.get('PLAN_PRO_PRICE_ID'),
  Deno.env.get('STRIPE_PRICE_PRO'),
].filter((value): value is string => Boolean(value)))
const PLUS_PRICE_IDS = new Set([
  Deno.env.get('PLAN_PLUS_PRICE_ID'),
  Deno.env.get('STRIPE_PRICE_PLUS'),
].filter((value): value is string => Boolean(value)))
const PRICE_CONFIGURATION_IS_VALID = PRO_PRICE_IDS.size > 0
  && PLUS_PRICE_IDS.size > 0
  && [...PRO_PRICE_IDS].every((priceId) => !PLUS_PRICE_IDS.has(priceId))

const PRICE_TO_PLAN: Record<string, Plan> = PRICE_CONFIGURATION_IS_VALID
  ? Object.fromEntries([
    ...[...PRO_PRICE_IDS].map((priceId) => [priceId, 'pro' as const]),
    ...[...PLUS_PRICE_IDS].map((priceId) => [priceId, 'plus' as const]),
  ])
  : {}

function toIso(seconds: number | null | undefined): string | null {
  if (!seconds) return null
  return new Date(seconds * 1000).toISOString()
}

function getId(value: string | Stripe.Customer | Stripe.Subscription | Stripe.Price | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

async function upsertSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
  userId: string,
): Promise<void> {
  if (subscription.items.has_more
    || subscription.items.data.length !== 1
    || subscription.items.data[0]?.quantity !== 1) {
    throw new Error('Unexpected Stripe subscription item configuration')
  }

  const priceId = subscription.items.data[0]?.price?.id ?? ''
  const plan = PRICE_TO_PLAN[priceId]
  if (!plan) {
    throw new Error(`Unknown Stripe price: ${priceId || '<missing>'}`)
  }

  const { error } = await supabase
    .from('stripe_subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      price_id: priceId,
      plan,
      status: subscription.status,
      current_period_end: toIso(subscription.current_period_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
    }, { onConflict: 'stripe_subscription_id' })

  if (error) {
    throw new Error(`Failed to upsert stripe_subscriptions: ${error.message}`)
  }
}

async function bindCustomerToUser(
  supabase: SupabaseClient,
  customerId: string,
  userId: string,
): Promise<void> {
  const [customerOwnerResult, userCustomerResult] = await Promise.all([
    supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle(),
    supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (customerOwnerResult.error) {
    throw new Error(
      `Failed to verify Stripe customer ownership: ${customerOwnerResult.error.message}`,
    )
  }
  if (userCustomerResult.error) {
    throw new Error(
      `Failed to verify the user's Stripe customer: ${userCustomerResult.error.message}`,
    )
  }
  if (customerOwnerResult.data?.user_id
    && customerOwnerResult.data.user_id !== userId) {
    throw new Error('Stripe customer ownership mismatch')
  }
  if (userCustomerResult.data?.stripe_customer_id
    && userCustomerResult.data.stripe_customer_id !== customerId) {
    throw new Error('User is already bound to a different Stripe customer')
  }

  const { error: upsertError } = await supabase
    .from('stripe_customers')
    .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: 'user_id' })

  if (upsertError) {
    throw new Error(`Failed to bind Stripe customer: ${upsertError.message}`)
  }
}

async function resolveSubscriptionUserId(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const customerId = getId(subscription.customer)
  if (!customerId) throw new Error('Stripe subscription is missing a customer')

  const { data: customer, error: customerError } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (customerError) {
    throw new Error(`Failed to fetch Stripe customer: ${customerError.message}`)
  }

  const metadataUserId = subscription.metadata?.supabase_user_id
  if (customer?.user_id && metadataUserId && customer.user_id !== metadataUserId) {
    throw new Error('Stripe subscription ownership mismatch')
  }

  const userId = customer?.user_id ?? metadataUserId
  if (!userId) throw new Error('Stripe subscription is missing an owner')

  if (!customer?.user_id) {
    // Account deletion cascades the local customer mapping before Stripe may
    // deliver its final subscription.deleted event. A missing app profile is
    // the expected terminal state: acknowledge without resurrecting billing
    // rows that reference a deleted auth identity.
    if (!(await appProfileExists(supabase, userId))) return null

    await bindCustomerToUser(supabase, customerId, userId)
  }

  return userId
}

function subscriptionFingerprint(subscription: Stripe.Subscription) {
  return [
    subscription.status,
    subscription.items.data[0]?.price?.id ?? '',
    subscription.current_period_end ?? '',
    subscription.cancel_at_period_end,
  ].join('|')
}

async function appProfileExists(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to verify Stripe event owner: ${error.message}`)
  }

  return Boolean(profile)
}

async function syncCurrentSubscription(
  stripe: Stripe,
  supabase: SupabaseClient,
  subscriptionId: string,
): Promise<void> {
  const firstSnapshot = await stripe.subscriptions.retrieve(subscriptionId)
  const firstUserId = await resolveSubscriptionUserId(supabase, firstSnapshot)
  if (!firstUserId) return
  await upsertSubscription(supabase, firstSnapshot, firstUserId)

  // Reconcile once after the write. If an older and a newer Stripe event race,
  // the last handler to finish writes Stripe's current state rather than its
  // stale event payload. A failed reconciliation is not marked complete and
  // is therefore retried by Stripe.
  const currentSnapshot = await stripe.subscriptions.retrieve(subscriptionId)
  if (subscriptionFingerprint(currentSnapshot) !== subscriptionFingerprint(firstSnapshot)) {
    const currentUserId = await resolveSubscriptionUserId(supabase, currentSnapshot)
    if (!currentUserId) return
    await upsertSubscription(supabase, currentSnapshot, currentUserId)
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Allow': 'POST', 'Content-Type': 'application/json' },
    })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey
      || !PRICE_CONFIGURATION_IS_VALID) {
      console.error('stripe-webhook: Stripe environment is not configured')
      return new Response(
        JSON.stringify({ error: 'Webhook handler unavailable' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-04-10',
      httpClient: Stripe.createFetchHttpClient(),
    })
    const rawBody = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret)
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
    )

    // A row represents an event that finished successfully. Do not persist the
    // event before handling it: Stripe retries failed deliveries, and an early
    // insert would make the retry look complete even though its side effects
    // never ran.
    const { data: existingEvent, error: existingError } = await supabase
      .from('stripe_webhook_events')
      .select('event_id')
      .eq('event_id', event.id)
      .maybeSingle()

    if (existingError) {
      throw new Error(`Failed to check webhook idempotency: ${existingError.message}`)
    }

    if (existingEvent) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const userId = session.metadata?.supabase_user_id
        const customerId = getId(session.customer)
        const subscriptionId = getId(session.subscription)

        if (!userId || !customerId || !subscriptionId) {
          throw new Error('Subscription checkout is missing ownership metadata')
        }
        if (session.client_reference_id !== userId) {
          throw new Error('Checkout ownership metadata mismatch')
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        if (getId(subscription.customer) !== customerId) {
          throw new Error('Checkout subscription customer mismatch')
        }
        if (subscription.metadata?.supabase_user_id !== userId) {
          throw new Error('Checkout subscription owner mismatch')
        }
        if (!(await appProfileExists(supabase, userId))) break
        await bindCustomerToUser(supabase, customerId, userId)
        await syncCurrentSubscription(stripe, supabase, subscriptionId)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await syncCurrentSubscription(stripe, supabase, subscription.id)
        break
      }

      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = getId(invoice.subscription)
        if (!subscriptionId) break

        await syncCurrentSubscription(stripe, supabase, subscriptionId)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    const { error: insertEventError } = await supabase
      .from('stripe_webhook_events')
      .insert({
        event_id: event.id,
        type: event.type,
        created: toIso(event.created) ?? new Date().toISOString(),
      })

    // Two concurrent deliveries can both finish the idempotent upserts above.
    // Whichever records completion second sees the unique key and can still
    // acknowledge the event safely.
    if (insertEventError && insertEventError.code !== '23505') {
      throw new Error(`Failed to store completed webhook event: ${insertEventError.message}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
