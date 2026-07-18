// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { postBillingFunction } from './billingFunctionClient'

const USER_ID = '11111111-1111-4111-8111-111111111111'

const mocks = vi.hoisted(() => ({
  configuration: {
    url: 'https://staging-project.supabase.co',
    anonKey: 'staging-anon-key',
    productionBackendIsolated: false,
    authStorageKey: 'sb-staging-auth-token',
  },
}))

vi.mock('@/lib/supabaseClient', () => ({
  get supabaseBrowserConfiguration() {
    return mocks.configuration
  },
}))

beforeEach(() => {
  mocks.configuration.url = 'https://staging-project.supabase.co'
  mocks.configuration.anonKey = 'staging-anon-key'
  mocks.configuration.productionBackendIsolated = false
  vi.restoreAllMocks()
})

describe('billing function preview and identity boundary', () => {
  it('never calls any backend when a deploy preview isolated production', async () => {
    mocks.configuration.url = 'https://preview-backend-disabled.invalid'
    mocks.configuration.anonKey = 'preview-backend-disabled'
    mocks.configuration.productionBackendIsolated = true
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const result = await postBillingFunction(
      'create-portal-session',
      { accessToken: 'token-a', expectedUserId: USER_ID },
    )

    expect(result.data).toBeNull()
    expect(result.error?.message).toContain('deploy previews')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('uses the resolved backend and binds the captured token to expected_user_id', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await postBillingFunction<{ success: boolean }>(
      'cancel-subscription',
      { accessToken: 'captured-token-a', expectedUserId: USER_ID },
      {
        subscription_id: 'sub_owned_by_a',
        expected_user_id: 'caller-cannot-override-owner',
      },
    )

    expect(result).toEqual({ data: { success: true }, error: null })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe(
      'https://staging-project.supabase.co/functions/v1/cancel-subscription',
    )
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer captured-token-a',
      apikey: 'staging-anon-key',
    })
    expect(JSON.parse(String(init?.body))).toEqual({
      subscription_id: 'sub_owned_by_a',
      expected_user_id: USER_ID,
    })
  })

  it('fails closed before fetch for an invalid captured owner', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await postBillingFunction(
      'list-invoices',
      { accessToken: 'token-a', expectedUserId: 'not-a-supabase-user-id' },
    )

    expect(result.error?.message).toBe('No active session')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
