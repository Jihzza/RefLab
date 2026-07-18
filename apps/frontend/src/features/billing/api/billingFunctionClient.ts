import { supabaseBrowserConfiguration } from '@/lib/supabaseClient'

export interface BillingRequestIdentity {
  accessToken: string
  expectedUserId: string
}

interface BillingFunctionResult<T> {
  data: T | null
  error: Error | null
}

type BillingFunctionName =
  | 'create-checkout-session'
  | 'create-portal-session'
  | 'cancel-subscription'
  | 'change-subscription-plan'
  | 'list-invoices'

const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Invoke a billing Edge Function with one immutable authenticated identity.
 * The SDK's resolved browser configuration is authoritative so a Netlify
 * preview cannot bypass the production-backend isolation fence.
 */
export async function postBillingFunction<T>(
  functionName: BillingFunctionName,
  identity: BillingRequestIdentity,
  body: Record<string, unknown> = {},
): Promise<BillingFunctionResult<T>> {
  if (supabaseBrowserConfiguration.productionBackendIsolated) {
    return {
      data: null,
      error: new Error('Billing is unavailable in deploy previews'),
    }
  }

  if (
    !identity.accessToken
    || !USER_ID_PATTERN.test(identity.expectedUserId)
  ) {
    return { data: null, error: new Error('No active session') }
  }

  let response: Response
  try {
    response = await fetch(
      `${supabaseBrowserConfiguration.url}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${identity.accessToken}`,
          apikey: supabaseBrowserConfiguration.anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...body,
          expected_user_id: identity.expectedUserId,
        }),
      },
    )
  } catch (caughtError) {
    return {
      data: null,
      error: caughtError instanceof Error
        ? caughtError
        : new Error('Billing request failed'),
    }
  }

  const responseBody = await response.json().catch(() => null) as (
    Record<string, unknown> | null
  )

  if (!response.ok) {
    return {
      data: null,
      error: new Error(
        typeof responseBody?.error === 'string'
          ? responseBody.error
          : `Billing request failed (${response.status})`,
      ),
    }
  }

  return { data: responseBody as T, error: null }
}
