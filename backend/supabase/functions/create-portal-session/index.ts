import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.7'
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { portalIsSafeForFreeLaunch } from './portalPolicy.ts'
import { billingRequestMatchesAuthenticatedUser } from '../_shared/billingIdentity.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PAID_PLANS_ENABLED = Deno.env.get('PAID_PLANS_ENABLED') === 'true'
const PORTAL_CONFIGURATION_ID_PATTERN = /^bpc_[A-Za-z0-9]+$/

function getConfiguredSiteOrigin() {
  const configuredSiteUrl = Deno.env.get('SITE_URL')
  if (!configuredSiteUrl) return null

  try {
    const url = new URL(configuredSiteUrl)
    const isLocalDevelopment = url.protocol === 'http:'
      && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    return url.protocol === 'https:' || isLocalDevelopment ? url.origin : null
  } catch {
    return null
  }
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
    const portalConfigurationId = Deno.env.get('STRIPE_PORTAL_CONFIGURATION_ID')
    if (!stripeKey || !supabaseUrl || !anonKey || !serviceRoleKey
      || !portalConfigurationId
      || !PORTAL_CONFIGURATION_ID_PATTERN.test(portalConfigurationId)) {
      console.error('create-portal-session: billing environment is not configured')
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

    const { data: customer, error: customerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (customerError) {
      throw new Error(`Failed to load billing customer: ${customerError.message}`)
    }

    if (!customer?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No billing account found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const origin = getConfiguredSiteOrigin()
    if (!origin) {
      console.error('create-portal-session: SITE_URL is missing or invalid')
      return new Response(JSON.stringify({ error: 'Billing is temporarily unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-04-10',
      httpClient: Stripe.createFetchHttpClient(),
    })

    let portalConfiguration: Stripe.BillingPortal.Configuration
    try {
      portalConfiguration = await stripe.billingPortal.configurations.retrieve(
        portalConfigurationId,
      )
    } catch (error) {
      console.error('create-portal-session: failed to retrieve portal configuration', error)
      return new Response(JSON.stringify({ error: 'Billing is temporarily unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (portalConfiguration.active !== true
      || (!PAID_PLANS_ENABLED && !portalIsSafeForFreeLaunch(portalConfiguration))) {
      console.error('create-portal-session: portal configuration is not approved for this launch mode')
      return new Response(JSON.stringify({ error: 'Billing is temporarily unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      configuration: portalConfiguration.id,
      return_url: `${origin}/app/pricing`,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('create-portal-session error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
