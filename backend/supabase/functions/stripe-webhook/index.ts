import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@17?target=deno'

// Price ID → plan mapping (built from env vars)
function getPlanFromPriceId(priceId: string): { planId: string; billingInterval: string } | null {
  const map: Record<string, { planId: string; billingInterval: string }> = {}

  const proMonthly = Deno.env.get('STRIPE_PRICE_PRO_MONTHLY')
  const proYearly = Deno.env.get('STRIPE_PRICE_PRO_YEARLY')
  const entMonthly = Deno.env.get('STRIPE_PRICE_ENTERPRISE_MONTHLY')
  const entYearly = Deno.env.get('STRIPE_PRICE_ENTERPRISE_YEARLY')

  if (proMonthly) map[proMonthly] = { planId: 'pro', billingInterval: 'monthly' }
  if (proYearly) map[proYearly] = { planId: 'pro', billingInterval: 'yearly' }
  if (entMonthly) map[entMonthly] = { planId: 'enterprise', billingInterval: 'monthly' }
  if (entYearly) map[entYearly] = { planId: 'enterprise', billingInterval: 'yearly' }

  return map[priceId] ?? null
}

serve(async (req) => {
  // Webhook does NOT require CORS or JWT — Stripe calls this endpoint directly
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-04-10',
    })

    // 1. Read raw body for signature verification
    const rawBody = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2. Verify webhook signature
    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 3. Service-role client for DB operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // 4. Idempotency check
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('id', event.id)
      .single()

    if (existingEvent) {
      // Already processed — return 200 to prevent Stripe retries
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 5. Log the event for debugging
    await supabase.from('webhook_events').insert({
      id: event.id,
      type: event.type,
      payload: event.data.object,
    })

    // 6. Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription' || !session.subscription || !session.customer) break

        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer.id
        const userId = session.metadata?.supabase_user_id
          ?? (session as Record<string, unknown>).subscription_data?.metadata?.supabase_user_id

        if (!userId) {
          console.error('No supabase_user_id in session metadata')
          break
        }

        // Upsert customer mapping
        await supabase.from('customers').upsert({
          id: userId,
          stripe_customer_id: customerId,
        })

        // Retrieve the full subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0]?.price.id ?? ''
        const planInfo = getPlanFromPriceId(priceId)

        await supabase.from('subscriptions').upsert({
          id: subscription.id,
          user_id: userId,
          stripe_customer_id: customerId,
          status: subscription.status,
          plan_id: planInfo?.planId ?? subscription.metadata?.plan_id ?? 'pro',
          billing_interval: planInfo?.billingInterval ?? subscription.metadata?.billing_interval ?? 'monthly',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
          ended_at: subscription.ended_at
            ? new Date(subscription.ended_at * 1000).toISOString()
            : null,
          stripe_price_id: priceId,
          amount: subscription.items.data[0]?.price.unit_amount ?? 0,
          currency: subscription.currency,
        })
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

        // Look up user via customers table
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!customer) {
          console.error(`No customer found for stripe_customer_id: ${customerId}`)
          break
        }

        const priceId = subscription.items.data[0]?.price.id ?? ''
        const planInfo = getPlanFromPriceId(priceId)

        await supabase.from('subscriptions').upsert({
          id: subscription.id,
          user_id: customer.id,
          stripe_customer_id: customerId,
          status: subscription.status,
          plan_id: planInfo?.planId ?? subscription.metadata?.plan_id ?? 'pro',
          billing_interval: planInfo?.billingInterval ?? subscription.metadata?.billing_interval ?? 'monthly',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
          ended_at: subscription.ended_at
            ? new Date(subscription.ended_at * 1000).toISOString()
            : null,
          stripe_price_id: priceId,
          amount: subscription.items.data[0]?.price.unit_amount ?? 0,
          currency: subscription.currency,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            ended_at: new Date((subscription.ended_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
            canceled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : new Date().toISOString(),
          })
          .eq('id', subscription.id)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : (invoice.customer as Stripe.Customer)?.id ?? ''

        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!customer) break

        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : (invoice.subscription as Stripe.Subscription)?.id ?? null

        await supabase.from('invoices').upsert({
          id: invoice.id,
          user_id: customer.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: invoice.status ?? 'paid',
          amount_due: invoice.amount_due,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency,
          invoice_url: invoice.hosted_invoice_url ?? null,
          invoice_pdf: invoice.invoice_pdf ?? null,
          period_start: invoice.period_start
            ? new Date(invoice.period_start * 1000).toISOString()
            : null,
          period_end: invoice.period_end
            ? new Date(invoice.period_end * 1000).toISOString()
            : null,
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : (invoice.customer as Stripe.Customer)?.id ?? ''

        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!customer) break

        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : (invoice.subscription as Stripe.Subscription)?.id ?? null

        await supabase.from('invoices').upsert({
          id: invoice.id,
          user_id: customer.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: invoice.status ?? 'open',
          amount_due: invoice.amount_due,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency,
          invoice_url: invoice.hosted_invoice_url ?? null,
          invoice_pdf: invoice.invoice_pdf ?? null,
          period_start: invoice.period_start
            ? new Date(invoice.period_start * 1000).toISOString()
            : null,
          period_end: invoice.period_end
            ? new Date(invoice.period_end * 1000).toISOString()
            : null,
        })

        // Create a notification for the user about the failed payment
        await supabase.from('notifications').insert({
          user_id: customer.id,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: 'Your latest payment could not be processed. Please update your payment method to avoid service interruption.',
        })
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
