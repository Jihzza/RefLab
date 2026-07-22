import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2.110.8'
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'

const RECENT_SIGN_IN_WINDOW_MS = 15 * 60 * 1000
const MAX_CLOCK_SKEW_MS = 60 * 1000
const STORAGE_PAGE_SIZE = 100
const MAX_STORAGE_DEPTH = 32
const MAX_STORAGE_LIST_PASSES = 1_000
const AUTH_DELETE_MAX_ATTEMPTS = 3
const AUTH_DELETE_RETRY_BASE_MS = 250
const MAX_STRIPE_CHECKOUT_CLEANUP_PASSES = 100
const MAX_STRIPE_SEARCH_PASSES = 100
const DELETION_LEASE_SECONDS = 15 * 60

const USER_MEDIA_BUCKETS = [
  'profile-media',
  'post-media',
  'message-media',
] as const

const TERMINAL_SUBSCRIPTION_STATUSES = new Set([
  'canceled',
  'incomplete_expired',
])

type DeletionJobStatus =
  | 'requested'
  | 'billing_cancelled'
  | 'media_deleted'
  | 'auth_deleted'
  | 'completed'
  | 'failed'

interface DeletionJobClaim {
  status: DeletionJobStatus
  attempts: number
  claim_token: string | null
  claim_expires_at: string | null
  acquired: boolean
}

const DELETION_STATUS_RANK: Record<DeletionJobStatus, number> = {
  failed: 0,
  requested: 0,
  billing_cancelled: 1,
  media_deleted: 2,
  auth_deleted: 3,
  completed: 4,
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

class SafeOperationError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'SafeOperationError'
  }
}

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  })
}

function requireEnvironmentVariable(name: string) {
  const value = Deno.env.get(name)
  if (!value) {
    console.error(`Account deletion is missing required configuration: ${name}`)
    throw new SafeOperationError(
      503,
      'ACCOUNT_DELETION_UNAVAILABLE',
      'Account deletion is temporarily unavailable. Your account was not deleted.',
    )
  }

  return value
}

function hasRecentSignIn(lastSignInAt: string | undefined) {
  if (!lastSignInAt) return false

  const signedInAt = Date.parse(lastSignInAt)
  if (!Number.isFinite(signedInAt)) return false

  const signInAge = Date.now() - signedInAt
  return signInAge >= -MAX_CLOCK_SKEW_MS && signInAge <= RECENT_SIGN_IN_WINDOW_MS
}

function hasReachedDeletionStatus(
  current: DeletionJobStatus,
  target: DeletionJobStatus,
) {
  return DELETION_STATUS_RANK[current] >= DELETION_STATUS_RANK[target]
}

async function claimDeletionJob(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<DeletionJobClaim> {
  const { data, error } = await supabaseAdmin
    .rpc('claim_account_deletion_job', {
      p_user_id: userId,
      p_lease_seconds: DELETION_LEASE_SECONDS,
    })
    .single()

  if (error || !data) {
    console.error(
      'Could not atomically claim the account deletion job:',
      error?.message ?? 'No job returned',
    )
    throw new SafeOperationError(
      503,
      'ACCOUNT_DELETION_QUEUE_UNAVAILABLE',
      'Account deletion is temporarily unavailable. No deletion steps were started.',
    )
  }

  return data as DeletionJobClaim
}

async function advanceDeletionJob(
  supabaseAdmin: SupabaseClient,
  userId: string,
  claimToken: string,
  status: DeletionJobStatus,
) {
  const { data, error } = await supabaseAdmin
    .rpc('advance_account_deletion_job', {
      p_user_id: userId,
      p_claim_token: claimToken,
      p_next_status: status,
      p_lease_seconds: DELETION_LEASE_SECONDS,
    })
    .single()

  if (error || !data) {
    console.error(
      `Could not persist account deletion status ${status}:`,
      error?.message ?? 'No job returned',
    )
    throw new SafeOperationError(
      503,
      'ACCOUNT_DELETION_QUEUE_UNAVAILABLE',
      'Account deletion could not safely persist its progress. Please try again.',
    )
  }

  const currentStatus = (data as { status: DeletionJobStatus }).status
  if (!hasReachedDeletionStatus(currentStatus, status)) {
    console.error(`Account deletion job did not reach ${status}; current status is ${currentStatus}`)
    throw new SafeOperationError(
      503,
      'ACCOUNT_DELETION_QUEUE_UNAVAILABLE',
      'Account deletion could not safely persist its progress. Please try again.',
    )
  }

  return currentStatus
}

async function recordDeletionJobError(
  supabaseAdmin: SupabaseClient,
  userId: string,
  claimToken: string,
  error: unknown,
) {
  const message = (error instanceof Error ? error.message : 'Unknown deletion error')
    .slice(0, 2_000)
  const { error: updateError } = await supabaseAdmin
    .rpc('record_account_deletion_job_failure', {
      p_user_id: userId,
      p_claim_token: claimToken,
      p_last_error: message,
    })

  if (updateError) {
    console.error('Could not persist the account deletion error:', updateError.message)
  }
}

function isMissingAuthUserError(error: { status?: number; message?: string }) {
  return error.status === 404 || /user.*not found/i.test(error.message ?? '')
}

async function deleteAuthUserWithRetry(
  supabaseAdmin: SupabaseClient,
  userId: string,
) {
  let lastError: { status?: number; message?: string } | null = null

  for (let attempt = 1; attempt <= AUTH_DELETE_MAX_ATTEMPTS; attempt += 1) {
    // Close the multi-session TOCTOU window as far as the Auth/Storage APIs
    // permit: every Auth attempt is immediately preceded by a fresh recursive
    // cleanup. The database policy installed with the launch migration also
    // rejects new uploads once a deletion job is pending.
    await deleteUserMedia(supabaseAdmin, userId)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (!error || isMissingAuthUserError(error)) return

    lastError = error
    if (attempt < AUTH_DELETE_MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(
        resolve,
        AUTH_DELETE_RETRY_BASE_MS * 2 ** (attempt - 1),
      ))
    }
  }

  console.error(
    'Failed to delete the authenticated user after retries:',
    lastError?.message ?? 'Unknown Auth error',
  )
  throw new SafeOperationError(
    503,
    'ACCOUNT_DELETION_IN_PROGRESS',
    'Your media and billing were removed, but account deletion is still pending. Please try again.',
  )
}

async function listOpenStripeSubscriptions(stripe: Stripe, customerId: string) {
  const subscriptions: Stripe.Subscription[] = []
  let startingAfter: string | undefined

  do {
    const page = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    subscriptions.push(
      ...page.data.filter(
        (subscription: Stripe.Subscription) =>
          !TERMINAL_SUBSCRIPTION_STATUSES.has(subscription.status),
      ),
    )

    if (!page.has_more) break

    const lastSubscription = page.data.at(-1)
    if (!lastSubscription) {
      throw new Error('Stripe returned an invalid pagination response')
    }
    startingAfter = lastSubscription.id
  } while (true)

  return subscriptions
}

async function searchStripeCustomersForUser(stripe: Stripe, userId: string) {
  const customerIds = new Set<string>()
  let pageToken: string | undefined

  for (let pass = 0; pass < MAX_STRIPE_SEARCH_PASSES; pass += 1) {
    const page = await stripe.customers.search({
      query: `metadata['supabase_user_id']:'${userId}'`,
      limit: 100,
      ...(pageToken ? { page: pageToken } : {}),
    })

    for (const customer of page.data) customerIds.add(customer.id)
    if (!page.has_more) return customerIds
    if (!page.next_page) throw new Error('Stripe customer search returned invalid pagination')
    pageToken = page.next_page
  }

  throw new Error('Stripe customer search exceeded its safety limit')
}

async function searchStripeSubscriptionsForUser(stripe: Stripe, userId: string) {
  const subscriptions = new Map<string, Stripe.Subscription>()
  let pageToken: string | undefined

  for (let pass = 0; pass < MAX_STRIPE_SEARCH_PASSES; pass += 1) {
    const page = await stripe.subscriptions.search({
      query: `metadata['supabase_user_id']:'${userId}'`,
      limit: 100,
      ...(pageToken ? { page: pageToken } : {}),
    })

    for (const subscription of page.data) {
      subscriptions.set(subscription.id, subscription)
    }
    if (!page.has_more) return subscriptions
    if (!page.next_page) throw new Error('Stripe subscription search returned invalid pagination')
    pageToken = page.next_page
  }

  throw new Error('Stripe subscription search exceeded its safety limit')
}

function isMissingStripeResource(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; statusCode?: number }
  return candidate.code === 'resource_missing' || candidate.statusCode === 404
}

function getStripeResourceId(value: string | { id: string } | null | undefined) {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

async function expireOpenCheckoutSessions(stripe: Stripe, customerId: string) {
  for (let pass = 0; pass < MAX_STRIPE_CHECKOUT_CLEANUP_PASSES; pass += 1) {
    const page = await stripe.checkout.sessions.list({
      customer: customerId,
      status: 'open',
      limit: 100,
    })

    if (page.data.length === 0) return

    for (const session of page.data) {
      try {
        await stripe.checkout.sessions.expire(session.id)
      } catch (error) {
        // A Checkout Session can complete or expire between list() and
        // expire(). Re-read it: a non-open state no longer needs expiry and
        // any resulting subscription is reconciled immediately afterwards.
        const currentSession = await stripe.checkout.sessions.retrieve(session.id)
        if (currentSession.status === 'open') throw error
      }
    }
  }

  throw new Error('Stripe Checkout cleanup exceeded its safety limit')
}

async function cancelStripeSubscriptions(
  supabaseAdmin: SupabaseClient,
  userId: string,
) {
  const { data: customer, error: customerError } = await supabaseAdmin
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (customerError) {
    console.error('Could not verify the Stripe customer mapping:', customerError.message)
    throw new SafeOperationError(
      503,
      'BILLING_VERIFICATION_FAILED',
      'We could not verify your billing status. Your account was not deleted.',
    )
  }

  const { data: localSubscriptions, error: subscriptionsError } = await supabaseAdmin
    .from('stripe_subscriptions')
    .select('stripe_subscription_id, status')
    .eq('user_id', userId)

  if (subscriptionsError) {
    console.error('Could not verify the local subscription state:', subscriptionsError.message)
    throw new SafeOperationError(
      503,
      'BILLING_VERIFICATION_FAILED',
      'We could not verify your billing status. Your account was not deleted.',
    )
  }

  const stripe = new Stripe(requireEnvironmentVariable('STRIPE_SECRET_KEY'), {
    apiVersion: '2024-04-10',
  })

  try {
    // Reconcile every source of identity, not only the local customer row.
    // Historical webhook drift must never allow a real Stripe subscription to
    // survive Auth deletion. All RefLab-created customers and subscriptions
    // carry the authenticated user id in metadata.
    const customerIds = await searchStripeCustomersForUser(stripe, userId)
    const subscriptions = await searchStripeSubscriptionsForUser(stripe, userId)

    if (customer?.stripe_customer_id) customerIds.add(customer.stripe_customer_id)

    for (const localSubscription of localSubscriptions ?? []) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          localSubscription.stripe_subscription_id,
        )
        subscriptions.set(subscription.id, subscription)
      } catch (error) {
        if (!isMissingStripeResource(error)) throw error
      }
    }

    for (const subscription of subscriptions.values()) {
      const subscriptionCustomerId = getStripeResourceId(subscription.customer)
      if (subscriptionCustomerId) customerIds.add(subscriptionCustomerId)
    }

    // Prevent an already-created Checkout Session from starting a new
    // subscription after the deletion workflow has reconciled billing.
    for (const customerId of customerIds) {
      await expireOpenCheckoutSessions(stripe, customerId)
      const customerSubscriptions = await listOpenStripeSubscriptions(stripe, customerId)
      for (const subscription of customerSubscriptions) {
        subscriptions.set(subscription.id, subscription)
      }
    }

    for (const subscription of subscriptions.values()) {
      if (TERMINAL_SUBSCRIPTION_STATUSES.has(subscription.status)) continue
      await stripe.subscriptions.cancel(subscription.id)
    }

    // Re-read Stripe directly by every known customer after cancellation. The
    // account is never deleted if Stripe cannot prove that no billable
    // subscription or open Checkout Session remains.
    for (const customerId of customerIds) {
      await expireOpenCheckoutSessions(stripe, customerId)
      const remainingSubscriptions = await listOpenStripeSubscriptions(stripe, customerId)
      if (remainingSubscriptions.length > 0) {
        throw new Error('Stripe still reports a non-terminal subscription')
      }
    }
  } catch (error) {
    console.error(
      'Stripe subscription cleanup failed:',
      error instanceof Error ? error.message : 'Unknown Stripe error',
    )
    throw new SafeOperationError(
      502,
      'SUBSCRIPTION_CANCELLATION_FAILED',
      'We could not cancel your subscription. Your account was not deleted.',
    )
  }
}

async function deleteStorageDirectory(
  supabaseAdmin: SupabaseClient,
  bucket: string,
  directory: string,
  depth = 0,
): Promise<number> {
  if (depth > MAX_STORAGE_DEPTH) {
    throw new SafeOperationError(
      500,
      'MEDIA_CLEANUP_FAILED',
      'We could not safely remove all of your media. Your account was not deleted.',
    )
  }

  const storage = supabaseAdmin.storage.from(bucket)
  let deletedObjects = 0

  for (let pass = 0; pass < MAX_STORAGE_LIST_PASSES; pass += 1) {
    // Always read from offset zero because each successful pass removes rows.
    // This avoids skipping objects as the directory becomes smaller.
    const { data: entries, error: listError } = await storage.list(directory, {
      limit: STORAGE_PAGE_SIZE,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    })

    if (listError) {
      console.error(`Could not list user media in ${bucket}:`, listError.message)
      throw new SafeOperationError(
        503,
        'MEDIA_CLEANUP_FAILED',
        'We could not safely remove all of your media. Your account was not deleted.',
      )
    }

    if (!entries || entries.length === 0) return deletedObjects

    const filePaths: string[] = []
    let deletedThisPass = 0

    for (const entry of entries) {
      const objectPath = `${directory}/${entry.name}`
      if (entry.id === null) {
        deletedThisPass += await deleteStorageDirectory(
          supabaseAdmin,
          bucket,
          objectPath,
          depth + 1,
        )
      } else {
        filePaths.push(objectPath)
      }
    }

    if (filePaths.length > 0) {
      const { error: removeError } = await storage.remove(filePaths)
      if (removeError) {
        console.error(`Could not remove user media from ${bucket}:`, removeError.message)
        throw new SafeOperationError(
          503,
          'MEDIA_CLEANUP_FAILED',
          'We could not safely remove all of your media. Your account was not deleted.',
        )
      }
      deletedThisPass += filePaths.length
    }

    if (deletedThisPass === 0) {
      console.error(`Storage cleanup made no progress in ${bucket}`)
      throw new SafeOperationError(
        503,
        'MEDIA_CLEANUP_FAILED',
        'We could not safely remove all of your media. Your account was not deleted.',
      )
    }

    deletedObjects += deletedThisPass
  }

  console.error(`Storage cleanup exceeded its safety limit in ${bucket}`)
  throw new SafeOperationError(
    503,
    'MEDIA_CLEANUP_FAILED',
    'We could not safely remove all of your media. Your account was not deleted.',
  )
}

async function deleteUserMedia(supabaseAdmin: SupabaseClient, userId: string) {
  for (const bucket of USER_MEDIA_BUCKETS) {
    await deleteStorageDirectory(supabaseAdmin, bucket, userId)
  }
}

serve(async (req) => {
  let deletionAdmin: SupabaseClient | null = null
  let deletionUserId: string | null = null
  let deletionClaimToken: string | null = null

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      405,
      { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' },
      { Allow: 'POST, OPTIONS' },
    )
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse(401, {
        error: 'Missing or invalid authorization header',
        code: 'INVALID_AUTHORIZATION',
      })
    }

    const supabaseUrl = requireEnvironmentVariable('SUPABASE_URL')
    const supabaseAnonKey = requireEnvironmentVariable('SUPABASE_ANON_KEY')

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // getUser performs a server round-trip, so the identity is verified rather
    // than trusted from locally decoded JWT claims.
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return jsonResponse(401, {
        error: 'Invalid or expired session',
        code: 'INVALID_SESSION',
      })
    }

    if (!hasRecentSignIn(user.last_sign_in_at)) {
      return jsonResponse(403, {
        error: 'Please sign in again before deleting your account.',
        code: 'REAUTHENTICATION_REQUIRED',
        max_age_seconds: RECENT_SIGN_IN_WINDOW_MS / 1000,
      })
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      requireEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )
    deletionAdmin = supabaseAdmin
    deletionUserId = user.id

    // Supabase Auth refuses to delete a user who still owns Storage objects.
    // This durable saga therefore checkpoints every destructive step, removes
    // media before Auth, and can safely resume after a transient failure.
    const deletionClaim = await claimDeletionJob(supabaseAdmin, user.id)
    let jobStatus = deletionClaim.status

    if (jobStatus === 'completed') {
      return jsonResponse(200, { message: 'Account deleted successfully' })
    }

    if (!deletionClaim.acquired || !deletionClaim.claim_token) {
      throw new SafeOperationError(
        409,
        'ACCOUNT_DELETION_ALREADY_IN_PROGRESS',
        'Another account deletion request is already in progress. Please wait and try again.',
      )
    }

    const claimToken = deletionClaim.claim_token
    deletionClaimToken = claimToken

    if (!hasReachedDeletionStatus(jobStatus, 'billing_cancelled')) {
      await cancelStripeSubscriptions(supabaseAdmin, user.id)
      await advanceDeletionJob(supabaseAdmin, user.id, claimToken, 'billing_cancelled')
      jobStatus = 'billing_cancelled'
    }

    if (!hasReachedDeletionStatus(jobStatus, 'media_deleted')) {
      await deleteUserMedia(supabaseAdmin, user.id)
      await advanceDeletionJob(supabaseAdmin, user.id, claimToken, 'media_deleted')
      jobStatus = 'media_deleted'
    }

    if (!hasReachedDeletionStatus(jobStatus, 'auth_deleted')) {
      // Close the small window in which an already-open Checkout Session could
      // have created a subscription after the first billing checkpoint.
      await cancelStripeSubscriptions(supabaseAdmin, user.id)
      await deleteAuthUserWithRetry(supabaseAdmin, user.id)

      try {
        await advanceDeletionJob(supabaseAdmin, user.id, claimToken, 'auth_deleted')
        await advanceDeletionJob(supabaseAdmin, user.id, claimToken, 'completed')
      } catch (jobError) {
        // The identity is already gone. Return success-with-pending-operations
        // instead of telling the browser to retry with a token that can no
        // longer authenticate; the durable row remains visible to operators.
        console.error(
          'Account was deleted but its job could not be marked completed:',
          jobError instanceof Error ? jobError.message : 'Unknown job error',
        )
        await recordDeletionJobError(supabaseAdmin, user.id, claimToken, jobError)
        deletionAdmin = null
        deletionUserId = null
        deletionClaimToken = null
        return jsonResponse(202, {
          message: 'Account deleted successfully. Operational reconciliation remains pending.',
          code: 'ACCOUNT_DELETED_RECONCILIATION_PENDING',
          cleanup_pending: true,
        })
      }
    } else if (jobStatus === 'auth_deleted') {
      await advanceDeletionJob(supabaseAdmin, user.id, claimToken, 'completed')
    }

    deletionAdmin = null
    deletionUserId = null
    deletionClaimToken = null

    return jsonResponse(200, { message: 'Account deleted successfully' })
  } catch (error) {
    if (deletionAdmin && deletionUserId && deletionClaimToken) {
      await recordDeletionJobError(
        deletionAdmin,
        deletionUserId,
        deletionClaimToken,
        error,
      )
    }

    if (error instanceof SafeOperationError) {
      return jsonResponse(error.status, {
        error: error.message,
        code: error.code,
      })
    }

    console.error(
      'Unexpected account deletion error:',
      error instanceof Error ? error.message : 'Unknown error',
    )
    return jsonResponse(500, {
      error: 'Internal server error. Your account was not deleted.',
      code: 'INTERNAL_ERROR',
    })
  }
})
