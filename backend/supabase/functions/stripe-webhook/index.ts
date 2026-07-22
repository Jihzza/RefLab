import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.110.8'
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'

type Plan = 'pro' | 'plus'

const TERMINAL_SUBSCRIPTION_STATUSES = new Set([
  'canceled',
  'incomplete_expired',
])

const PRICE_TO_PLAN: Record<string, Plan> = {
  ...(Deno.env.get('PLAN_PRO_PRICE_ID') ? { [Deno.env.get('PLAN_PRO_PRICE_ID') as string]: 'pro' } : {}),
  ...(Deno.env.get('PLAN_PLUS_PRICE_ID') ? { [Deno.env.get('PLAN_PLUS_PRICE_ID') as string]: 'plus' } : {}),
  ...(Deno.env.get('STRIPE_PRICE_PRO') ? { [Deno.env.get('STRIPE_PRICE_PRO') as string]: 'pro' } : {}),
  ...(Deno.env.get('STRIPE_PRICE_PLUS') ? { [Deno.env.get('STRIPE_PRICE_PLUS') as string]: 'plus' } : {}),
}

function toIso(seconds: number | null | undefined): string | null {
  if (!seconds) return null
  return new Date(seconds * 1000).toISOString()
}

function getId(value: string | Stripe.Customer | Stripe.Subscription | Stripe.Price | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

async function hasAccountDeletionTombstone(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('account_deletion_jobs')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to check account deletion tombstone: ${error.message}`)
  }

  return data !== null
}

async function cancelSubscriptionForDeletingUser(
  stripe: Stripe,
  subscription: Stripe.Subscription,
) {
  if (TERMINAL_SUBSCRIPTION_STATUSES.has(subscription.status)) return
  await stripe.subscriptions.cancel(subscription.id)
}

async function upsertSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
  userId: string,
): Promise<void> {
  const priceId = subscription.items.data[0]?.price?.id ?? ''
  const metadataPlan = subscription.metadata?.plan === 'pro'
    || subscription.metadata?.plan === 'plus'
    ? subscription.metadata.plan
    : undefined
  const plan = PRICE_TO_PLAN[priceId] ?? metadataPlan

  if (!plan) {
    throw new Error(`Subscription ${subscription.id} uses an unknown RefLab price`)
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

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!stripeSecretKey || !webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Stripe environment is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Idempotency: rows in this table represent fully processed events. The
    // record is deliberately written only after the handler below succeeds so
    // Stripe can safely retry a transient failure.
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
          throw new Error('Subscription checkout completed without required RefLab metadata')
        }

        if (await hasAccountDeletionTombstone(supabase, userId)) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          await cancelSubscriptionForDeletingUser(stripe, subscription)
          break
        }

        const { error: customerError } = await supabase
          .from('stripe_customers')
          .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: 'user_id' })

        if (customerError) {
          throw new Error(`Failed to upsert stripe_customers: ${customerError.message}`)
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        await upsertSubscription(supabase, subscription, userId)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const eventSubscription = event.data.object as Stripe.Subscription
        // Stripe does not guarantee webhook delivery order. Re-reading the
        // object prevents an older delivery from overwriting newer state.
        const subscription = await stripe.subscriptions.retrieve(eventSubscription.id)
        const customerId = getId(subscription.customer)
        if (!customerId) {
          throw new Error('Subscription event is missing its Stripe customer')
        }

        const { data: customer, error: customerError } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()

        if (customerError) {
          throw new Error(`Failed to fetch stripe customer: ${customerError.message}`)
        }

        const userId = customer?.user_id ?? subscription.metadata?.supabase_user_id
        if (!userId) {
          throw new Error('Subscription event cannot be mapped to a RefLab user')
        }

        if (await hasAccountDeletionTombstone(supabase, userId)) {
          await cancelSubscriptionForDeletingUser(stripe, subscription)
          break
        }

        if (!customer?.user_id) {
          const { error: upsertCustomerError } = await supabase
            .from('stripe_customers')
            .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: 'user_id' })

          if (upsertCustomerError) {
            throw new Error(`Failed to upsert stripe customer: ${upsertCustomerError.message}`)
          }
        }

        await upsertSubscription(supabase, subscription, userId)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = getId(subscription.customer)
        if (!customerId) {
          throw new Error('Deleted subscription is missing its Stripe customer')
        }

        const { data: customer, error: customerError } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()

        if (customerError) {
          throw new Error(`Failed to fetch deleted subscription customer: ${customerError.message}`)
        }

        const userId = customer?.user_id ?? subscription.metadata?.supabase_user_id
        if (!userId) {
          throw new Error('Deleted subscription cannot be mapped to a RefLab user')
        }

        if (await hasAccountDeletionTombstone(supabase, userId)) break

        if (!customer?.user_id) {
          const { error: upsertCustomerError } = await supabase
            .from('stripe_customers')
            .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: 'user_id' })

          if (upsertCustomerError) {
            throw new Error(`Failed to store deleted subscription customer: ${upsertCustomerError.message}`)
          }
        }

        await upsertSubscription(supabase, subscription, userId)
        break
      }

      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = getId(invoice.subscription)
        // Stripe can emit one-off invoices that do not represent a RefLab
        // subscription. Those are intentionally acknowledged and ignored.
        if (!subscriptionId) break

        const customerId = getId(invoice.customer)
        if (!customerId) {
          throw new Error('Subscription invoice is missing its Stripe customer')
        }

        const { data: customer, error: customerError } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()

        if (customerError) {
          throw new Error(`Failed to fetch invoice customer mapping: ${customerError.message}`)
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const userId = customer?.user_id ?? subscription.metadata?.supabase_user_id
        if (!userId) {
          throw new Error('Subscription invoice cannot be mapped to a RefLab user')
        }

        if (await hasAccountDeletionTombstone(supabase, userId)) {
          await cancelSubscriptionForDeletingUser(stripe, subscription)
          break
        }

        if (!customer?.user_id) {
          const { error: upsertCustomerError } = await supabase
            .from('stripe_customers')
            .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: 'user_id' })

          if (upsertCustomerError) {
            throw new Error(`Failed to store invoice customer mapping: ${upsertCustomerError.message}`)
          }
        }

        await upsertSubscription(supabase, subscription, userId)
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
        processed_at: new Date().toISOString(),
        payload: event.data.object,
      })

    // A concurrent delivery may have completed the same idempotent work first.
    if (insertEventError && insertEventError.code !== '23505') {
      throw new Error(`Failed to store processed webhook event: ${insertEventError.message}`)
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
