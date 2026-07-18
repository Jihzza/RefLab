import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.110.7";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { buildBillingCustomerCreateParams } from "../_shared/accountDeletionState.ts";
import { billingRequestMatchesAuthenticatedUser } from "../_shared/billingIdentity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Plan = "pro" | "plus";

const PAID_PLANS_ENABLED = Deno.env.get("PAID_PLANS_ENABLED") === "true";

const PLAN_PRICE_MAP: Record<Plan, string | undefined> = {
  pro: Deno.env.get("PLAN_PRO_PRICE_ID") ?? Deno.env.get("STRIPE_PRICE_PRO"),
  plus: Deno.env.get("PLAN_PLUS_PRICE_ID") ?? Deno.env.get("STRIPE_PRICE_PLUS"),
};

function priceConfigurationIsValid() {
  return Boolean(
    PLAN_PRICE_MAP.pro &&
      PLAN_PRICE_MAP.plus &&
      PLAN_PRICE_MAP.pro !== PLAN_PRICE_MAP.plus,
  );
}

function isLiveSubscription(status: string) {
  return status !== "canceled" && status !== "incomplete_expired";
}

function isMissingStripeResource(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const stripeError = error as { code?: string; statusCode?: number };
  return stripeError.code === "resource_missing" ||
    stripeError.statusCode === 404;
}

function getConfiguredSiteOrigin() {
  const configuredSiteUrl = Deno.env.get("SITE_URL");
  if (!configuredSiteUrl) return null;

  try {
    const url = new URL(configuredSiteUrl);
    const isLocalDevelopment = url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return url.protocol === "https:" || isLocalDevelopment ? url.origin : null;
  } catch {
    return null;
  }
}

async function hasLiveStripeSubscription(stripe: Stripe, customerId: string) {
  let startingAfter: string | undefined;

  do {
    const page = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    if (
      page.data.some((subscription: Stripe.Subscription) =>
        isLiveSubscription(subscription.status)
      )
    ) {
      return true;
    }
    if (!page.has_more) return false;

    startingAfter = page.data.at(-1)?.id;
    if (!startingAfter) {
      throw new Error("Stripe returned an invalid subscription page");
    }
  } while (startingAfter);

  return false;
}

async function accountAcceptsCheckout(
  supabaseAdmin: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabaseAdmin.rpc(
    "account_accepts_checkout",
    { uid: userId },
  );

  if (error) {
    throw new Error(`Failed to verify account state: ${error.message}`);
  }

  return data === true;
}

type BillingProvisioningIntent = {
  deletion_in_progress: boolean;
  existing_customer_id: string | null;
  intent_id: string | null;
  idempotency_key: string | null;
  customer_email: string | null;
  stripe_customer_id: string | null;
  created_at: string | null;
};

type BillingProvisioningCompletion = {
  deletion_in_progress: boolean;
  mapping_stored: boolean;
  stripe_customer_id: string;
};

function parseProvisioningIntent(value: unknown): BillingProvisioningIntent {
  if (!value || typeof value !== "object") {
    throw new Error("Billing provisioning RPC returned no result");
  }
  const candidate = value as Partial<BillingProvisioningIntent>;
  if (typeof candidate.deletion_in_progress !== "boolean") {
    throw new Error("Billing provisioning RPC returned an invalid result");
  }
  return candidate as BillingProvisioningIntent;
}

async function findCustomerForProvisioningIntent(
  stripe: Stripe,
  userId: string,
  intentId: string,
) {
  let page: string | undefined;
  do {
    const result = await stripe.customers.search({
      query:
        `metadata['supabase_user_id']:'${userId}' AND metadata['provisioning_intent_id']:'${intentId}'`,
      limit: 100,
      ...(page ? { page } : {}),
    });
    const customer = result.data.find((candidate: Stripe.Customer) =>
      candidate.metadata?.supabase_user_id === userId &&
      candidate.metadata?.provisioning_intent_id === intentId
    );
    if (customer) return customer;
    if (!result.has_more) return null;
    page = result.next_page ?? undefined;
    if (!page) {
      throw new Error("Stripe returned an invalid customer search page");
    }
  } while (page);

  return null;
}

async function provisionStripeCustomer(
  supabaseAdmin: SupabaseClient,
  stripe: Stripe,
  userId: string,
  email: string | undefined,
) {
  const { data, error } = await supabaseAdmin
    .rpc("begin_billing_customer_provisioning", {
      p_user_id: userId,
      p_customer_email: email ?? null,
    })
    .single();

  if (error) {
    throw new Error(
      `Failed to begin billing customer provisioning: ${error.message}`,
    );
  }
  const intent = parseProvisioningIntent(data);

  if (intent.deletion_in_progress) {
    return { deletionInProgress: true, customerId: null };
  }
  if (intent.existing_customer_id) {
    return {
      deletionInProgress: false,
      customerId: intent.existing_customer_id,
    };
  }
  if (!intent.intent_id || !intent.idempotency_key || !intent.created_at) {
    throw new Error("Billing provisioning RPC returned an incomplete intent");
  }

  let customer: Stripe.Customer | null = null;
  const intentAgeMs = Date.now() - new Date(intent.created_at).getTime();

  // Stripe may prune an idempotency key after 24 hours. Before replaying an
  // old intent, search its immutable metadata so key expiry cannot create a
  // duplicate customer. Search errors fail closed.
  if (!Number.isFinite(intentAgeMs)) {
    throw new Error("Billing provisioning intent has an invalid timestamp");
  }
  if (intent.stripe_customer_id) {
    const retrieved = await stripe.customers.retrieve(
      intent.stripe_customer_id,
    );
    if (!("deleted" in retrieved && retrieved.deleted)) customer = retrieved;
  } else if (intentAgeMs >= 23 * 60 * 60 * 1000) {
    customer = await findCustomerForProvisioningIntent(
      stripe,
      userId,
      intent.intent_id,
    );
  }

  if (!customer) {
    const createParams: Stripe.CustomerCreateParams =
      buildBillingCustomerCreateParams(
        userId,
        intent.intent_id,
        intent.customer_email,
      );
    customer = await stripe.customers.create(createParams, {
      idempotencyKey: intent.idempotency_key,
    });
  }

  const { data: completionData, error: completionError } = await supabaseAdmin
    .rpc("complete_billing_customer_provisioning", {
      p_user_id: userId,
      p_intent_id: intent.intent_id,
      p_stripe_customer_id: customer.id,
    })
    .single();

  if (completionError) {
    throw new Error(
      `Failed to complete billing customer provisioning: ${completionError.message}`,
    );
  }
  const completion = completionData as BillingProvisioningCompletion | null;
  if (!completion || typeof completion.deletion_in_progress !== "boolean") {
    throw new Error(
      "Billing provisioning completion returned an invalid result",
    );
  }

  if (completion.deletion_in_progress) {
    // The durable intent already lets the deletion worker recover this exact
    // customer. Best-effort immediate cleanup reduces exposure, but a cleanup
    // outage must not erase the deletion intent or remap the customer.
    try {
      await stripe.customers.del(customer.id);
    } catch (cleanupError) {
      if (!isMissingStripeResource(cleanupError)) {
        console.error(
          "create-checkout-session: deferred customer cleanup to deletion worker",
          cleanupError,
        );
      }
    }
    return { deletionInProgress: true, customerId: null };
  }
  if (
    !completion.mapping_stored || completion.stripe_customer_id !== customer.id
  ) {
    throw new Error(
      "Billing provisioning completion did not store the customer mapping",
    );
  }

  return { deletionInProgress: false, customerId: customer.id };
}

async function expireCheckoutIfOpen(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  if (session.status !== "open") return;

  try {
    await stripe.checkout.sessions.expire(session.id);
  } catch (error) {
    // Do not mask the account-state decision when another deletion request
    // or Stripe itself already closed the same idempotent session.
    const latest = await stripe.checkout.sessions.retrieve(session.id);
    if (latest.status === "open") throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Allow": "POST, OPTIONS",
        "Content-Type": "application/json",
      },
    });
  }

  if (!PAID_PLANS_ENABLED) {
    console.warn("create-checkout-session: paid plans are disabled");
    return new Response(
      JSON.stringify({ error: "Billing is temporarily unavailable" }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!stripeKey || !supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error(
        "create-checkout-session: billing environment is not configured",
      );
      return new Response(
        JSON.stringify({ error: "Billing is temporarily unavailable" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUser = createClient(
      supabaseUrl,
      anonKey,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabaseUser.auth
      .getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json().catch(() => null);
    if (!billingRequestMatchesAuthenticatedUser(body, user.id)) {
      return new Response(
        JSON.stringify({ error: "Billing identity mismatch" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const plan = body?.plan as Plan | undefined;
    if (!plan || !["pro", "plus"].includes(plan)) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan. Must be "pro" or "plus".' }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const stripePriceId = PLAN_PRICE_MAP[plan];
    if (!stripePriceId || !priceConfigurationIsValid()) {
      console.error(
        `create-checkout-session: price is not configured for ${plan}`,
      );
      return new Response(
        JSON.stringify({ error: "Billing is temporarily unavailable" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-04-10",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    if (!(await accountAcceptsCheckout(supabaseAdmin, user.id))) {
      return new Response(
        JSON.stringify({ error: "Account deletion is in progress" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: activeSubscription, error: activeSubscriptionError } =
      await supabaseAdmin
        .from("stripe_subscriptions")
        .select("stripe_subscription_id")
        .eq("user_id", user.id)
        .in("status", [
          "active",
          "trialing",
          "past_due",
          "unpaid",
          "incomplete",
          "paused",
        ])
        .limit(1)
        .maybeSingle();

    if (activeSubscriptionError) {
      throw new Error(
        `Failed to verify existing subscription: ${activeSubscriptionError.message}`,
      );
    }
    if (activeSubscription) {
      return new Response(
        JSON.stringify({ error: "An active subscription already exists" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const provisioning = await provisionStripeCustomer(
      supabaseAdmin,
      stripe,
      user.id,
      user.email,
    );
    if (provisioning.deletionInProgress || !provisioning.customerId) {
      return new Response(
        JSON.stringify({ error: "Account deletion is in progress" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const stripeCustomerId = provisioning.customerId;

    // Stripe is authoritative if a previous webhook delivery is delayed. This
    // prevents a second checkout from creating overlapping subscriptions.
    if (await hasLiveStripeSubscription(stripe, stripeCustomerId)) {
      return new Response(
        JSON.stringify({ error: "An active subscription already exists" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Never copy a caller-controlled Origin into Stripe redirect URLs. The
    // configured launch origin is the only allowed post-checkout destination.
    const origin = getConfiguredSiteOrigin();
    if (!origin) {
      console.error("create-checkout-session: SITE_URL is missing or invalid");
      return new Response(
        JSON.stringify({ error: "Billing is temporarily unavailable" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const checkoutSessions = await stripe.checkout.sessions.list({
      customer: stripeCustomerId,
      limit: 100,
    });

    // Recheck after the external customer/subscription lookups. Account
    // deletion sets this guard before it starts its own Stripe cleanup.
    if (!(await accountAcceptsCheckout(supabaseAdmin, user.id))) {
      return new Response(
        JSON.stringify({ error: "Account deletion is in progress" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const existingOpenSession = checkoutSessions.data.find(
      (candidate: Stripe.Checkout.Session) =>
        candidate.mode === "subscription" &&
        candidate.status === "open" &&
        candidate.metadata?.supabase_user_id === user.id,
    );
    if (existingOpenSession) {
      if (
        existingOpenSession.metadata?.plan === plan && existingOpenSession.url
      ) {
        return new Response(JSON.stringify({ url: existingOpenSession.url }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ error: "A checkout is already in progress" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // The latest prior session is the checkout generation. Concurrent callers
    // see the same generation and therefore use the same idempotency key; once
    // a session expires or completes, its ID permits a genuinely new checkout.
    const checkoutGeneration = checkoutSessions.data[0]?.id ?? "initial";
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: stripeCustomerId,
        client_reference_id: user.id,
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
      },
      {
        idempotencyKey: `reflab-checkout-${user.id}-${checkoutGeneration}`,
      },
    );

    // Close the last race: deletion can start between the preceding state
    // check and Stripe accepting the create request. Never hand that URL back
    // once the account is guarded (or its profile has already cascaded away).
    let accountStillAcceptsCheckout: boolean;
    try {
      accountStillAcceptsCheckout = await accountAcceptsCheckout(
        supabaseAdmin,
        user.id,
      );
    } catch (accountStateError) {
      await expireCheckoutIfOpen(stripe, session);
      throw accountStateError;
    }

    if (!accountStillAcceptsCheckout) {
      await expireCheckoutIfOpen(stripe, session);
      return new Response(
        JSON.stringify({ error: "Account deletion is in progress" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!session.url) {
      return new Response(
        JSON.stringify({ error: "Stripe did not return checkout url" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-checkout-session error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
