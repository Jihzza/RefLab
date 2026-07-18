// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Subscription } from '../types'
import { BillingProvider } from './BillingProvider'
import { useBilling } from './useBilling'

const ACCOUNT_A = 'billing-account-a'
const ACCOUNT_B = 'billing-account-b'

const mocks = vi.hoisted(() => ({
  currentUserId: 'billing-account-a' as string | null,
  getSubscription: vi.fn(),
  microtasks: [] as VoidFunction[],
}))

vi.mock('@/features/auth/components/useAuth', () => ({
  useAuth: () => ({
    user: mocks.currentUserId ? { id: mocks.currentUserId } : null,
    authStatus: mocks.currentUserId ? 'authenticated' : 'unauthenticated',
    legalAcceptanceStatus: 'accepted',
  }),
}))

vi.mock('../api/billingApi', () => ({
  getSubscription: mocks.getSubscription,
}))

beforeEach(() => {
  mocks.currentUserId = ACCOUNT_A
  mocks.getSubscription.mockReset()
  mocks.microtasks.length = 0
  vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((callback) => {
    mocks.microtasks.push(callback)
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('BillingProvider account ownership', () => {
  it('never exposes account A billing data while account B is active', async () => {
    const accountASubscription = subscriptionFor(
      ACCOUNT_A,
      'plus',
      'sub_account_a',
    )
    const accountBSubscription = subscriptionFor(
      ACCOUNT_B,
      'pro',
      'sub_account_b',
    )
    const accountBResponse = deferred<{
      subscription: Subscription
      error: null
    }>()

    mocks.getSubscription
      .mockResolvedValueOnce({ subscription: accountASubscription, error: null })
      .mockReturnValueOnce(accountBResponse.promise)

    const { rerender } = render(
      <BillingProvider>
        <BillingProbe />
      </BillingProvider>,
    )

    await runMicrotasksUntil(() => mocks.getSubscription.mock.calls.length === 1)
    await waitFor(() => {
      expectBillingState({
        plan: 'plus',
        owner: ACCOUNT_A,
        stripeId: 'sub_account_a',
        loading: false,
        error: 'none',
        pro: true,
        plus: true,
      })
    })

    mocks.currentUserId = ACCOUNT_B
    rerender(
      <BillingProvider>
        <BillingProbe />
      </BillingProvider>,
    )

    // B is already the active auth account, but B's queued fetch has not run.
    // Cached entitlements and Stripe metadata belonging to A must disappear in
    // this synchronous render, rather than surviving until the effect runs.
    expect(mocks.getSubscription).toHaveBeenCalledTimes(1)
    expectBillingState({
      plan: 'free',
      owner: 'none',
      stripeId: 'none',
      loading: false,
      error: 'none',
      pro: false,
      plus: false,
    })

    await runMicrotasksUntil(() => mocks.getSubscription.mock.calls.length === 2)

    // B's request is in flight and has not produced authoritative data yet.
    expect(mocks.getSubscription).toHaveBeenCalledTimes(2)
    expectBillingState({
      plan: 'free',
      owner: 'none',
      stripeId: 'none',
      loading: true,
      error: 'none',
      pro: false,
      plus: false,
    })

    await act(async () => {
      accountBResponse.resolve({ subscription: accountBSubscription, error: null })
      await accountBResponse.promise
    })

    await waitFor(() => {
      expectBillingState({
        plan: 'pro',
        owner: ACCOUNT_B,
        stripeId: 'sub_account_b',
        loading: false,
        error: 'none',
        pro: true,
        plus: false,
      })
    })
  })

  it('hides account A errors immediately and exposes only account B errors', async () => {
    const accountBResponse = deferred<{
      subscription: null
      error: Error
    }>()
    mocks.getSubscription
      .mockResolvedValueOnce({
        subscription: null,
        error: new Error('Account A billing failed'),
      })
      .mockReturnValueOnce(accountBResponse.promise)

    const { rerender } = render(
      <BillingProvider>
        <BillingProbe />
      </BillingProvider>,
    )

    await runMicrotasksUntil(() => mocks.getSubscription.mock.calls.length === 1)
    await waitFor(() => {
      expectBillingState({
        plan: 'free',
        owner: 'none',
        stripeId: 'none',
        loading: false,
        error: 'Account A billing failed',
        pro: false,
        plus: false,
      })
    })

    mocks.currentUserId = ACCOUNT_B
    rerender(
      <BillingProvider>
        <BillingProbe />
      </BillingProvider>,
    )

    expectBillingState({
      plan: 'free',
      owner: 'none',
      stripeId: 'none',
      loading: false,
      error: 'none',
      pro: false,
      plus: false,
    })

    await runMicrotasksUntil(() => mocks.getSubscription.mock.calls.length === 2)
    expectBillingState({
      plan: 'free',
      owner: 'none',
      stripeId: 'none',
      loading: true,
      error: 'none',
      pro: false,
      plus: false,
    })

    await act(async () => {
      accountBResponse.resolve({
        subscription: null,
        error: new Error('Account B billing failed'),
      })
      await accountBResponse.promise
    })

    await waitFor(() => {
      expectBillingState({
        plan: 'free',
        owner: 'none',
        stripeId: 'none',
        loading: false,
        error: 'Account B billing failed',
        pro: false,
        plus: false,
      })
    })
  })

  it('ignores an in-flight A refresh and makes a stale A refresh a no-op for B', async () => {
    const accountASubscription = subscriptionFor(
      ACCOUNT_A,
      'plus',
      'sub_account_a',
    )
    const accountBSubscription = subscriptionFor(
      ACCOUNT_B,
      'pro',
      'sub_account_b',
    )
    const lateAccountA = deferred<{
      subscription: Subscription
      error: Error
    }>()
    const accountBResponse = deferred<{
      subscription: Subscription
      error: null
    }>()
    let capturedRefresh: (() => Promise<void>) | undefined
    const captureRefresh = (refresh: () => Promise<void>) => {
      capturedRefresh = refresh
    }

    mocks.getSubscription
      .mockResolvedValueOnce({ subscription: accountASubscription, error: null })
      .mockReturnValueOnce(lateAccountA.promise)
      .mockReturnValueOnce(accountBResponse.promise)

    const { rerender } = render(
      <BillingProvider>
        <BillingProbe onRefresh={captureRefresh} />
      </BillingProvider>,
    )

    await runMicrotasksUntil(() => mocks.getSubscription.mock.calls.length === 1)
    await waitFor(() => {
      expectBillingState({
        plan: 'plus',
        owner: ACCOUNT_A,
        stripeId: 'sub_account_a',
        loading: false,
        error: 'none',
        pro: true,
        plus: true,
      })
    })
    if (!capturedRefresh) throw new Error('Account A refresh was not captured')
    const staleAccountARefresh = capturedRefresh

    let accountARefreshPromise: Promise<void> | undefined
    act(() => {
      accountARefreshPromise = staleAccountARefresh()
    })
    expect(mocks.getSubscription).toHaveBeenCalledTimes(2)
    expectBillingState({
      plan: 'plus',
      owner: ACCOUNT_A,
      stripeId: 'sub_account_a',
      loading: true,
      error: 'none',
      pro: true,
      plus: true,
    })

    mocks.currentUserId = ACCOUNT_B
    rerender(
      <BillingProvider>
        <BillingProbe onRefresh={captureRefresh} />
      </BillingProvider>,
    )

    expectBillingState({
      plan: 'free',
      owner: 'none',
      stripeId: 'none',
      loading: false,
      error: 'none',
      pro: false,
      plus: false,
    })

    await runMicrotasksUntil(() => mocks.getSubscription.mock.calls.length === 3)
    expectBillingState({
      plan: 'free',
      owner: 'none',
      stripeId: 'none',
      loading: true,
      error: 'none',
      pro: false,
      plus: false,
    })

    await act(async () => {
      lateAccountA.resolve({
        subscription: accountASubscription,
        error: new Error('Late account A billing failure'),
      })
      await accountARefreshPromise
    })

    expectBillingState({
      plan: 'free',
      owner: 'none',
      stripeId: 'none',
      loading: true,
      error: 'none',
      pro: false,
      plus: false,
    })

    await act(async () => {
      accountBResponse.resolve({ subscription: accountBSubscription, error: null })
      await accountBResponse.promise
    })

    await waitFor(() => {
      expectBillingState({
        plan: 'pro',
        owner: ACCOUNT_B,
        stripeId: 'sub_account_b',
        loading: false,
        error: 'none',
        pro: true,
        plus: false,
      })
    })

    await act(async () => {
      await staleAccountARefresh()
    })

    expect(mocks.getSubscription).toHaveBeenCalledTimes(3)
    expectBillingState({
      plan: 'pro',
      owner: ACCOUNT_B,
      stripeId: 'sub_account_b',
      loading: false,
      error: 'none',
      pro: true,
      plus: false,
    })
  })
})

function BillingProbe({
  onRefresh,
}: {
  onRefresh?: (refresh: () => Promise<void>) => void
}) {
  const billing = useBilling()

  useEffect(() => {
    onRefresh?.(billing.refreshBilling)
  }, [billing.refreshBilling, onRefresh])

  return (
    <output
      data-testid="billing-state"
      data-plan={billing.planId}
      data-owner={billing.subscription?.user_id ?? 'none'}
      data-stripe-id={billing.subscription?.stripe_subscription_id ?? 'none'}
      data-loading={String(billing.isLoading)}
      data-error={billing.error ?? 'none'}
      data-pro={String(billing.isPro)}
      data-plus={String(billing.isPlus)}
    />
  )
}

function expectBillingState(expected: {
  plan: 'free' | 'pro' | 'plus'
  owner: string
  stripeId: string
  loading: boolean
  error: string
  pro: boolean
  plus: boolean
}) {
  const state = screen.getByTestId('billing-state')
  expect(state.getAttribute('data-plan')).toBe(expected.plan)
  expect(state.getAttribute('data-owner')).toBe(expected.owner)
  expect(state.getAttribute('data-stripe-id')).toBe(expected.stripeId)
  expect(state.getAttribute('data-loading')).toBe(String(expected.loading))
  expect(state.getAttribute('data-error')).toBe(expected.error)
  expect(state.getAttribute('data-pro')).toBe(String(expected.pro))
  expect(state.getAttribute('data-plus')).toBe(String(expected.plus))
}

async function runMicrotasksUntil(predicate: () => boolean) {
  for (let attempt = 0; attempt < 20 && !predicate(); attempt += 1) {
    const callback = mocks.microtasks.shift()
    expect(callback).toBeTypeOf('function')

    await act(async () => {
      callback?.()
      await Promise.resolve()
    })
  }

  expect(predicate()).toBe(true)
}

function subscriptionFor(
  userId: string,
  plan: 'pro' | 'plus',
  stripeSubscriptionId: string,
): Subscription {
  return {
    user_id: userId,
    stripe_subscription_id: stripeSubscriptionId,
    price_id: `price_${plan}`,
    plan,
    status: 'active',
    current_period_end: '2026-08-18T00:00:00.000Z',
    cancel_at_period_end: false,
    created_at: '2026-07-18T00:00:00.000Z',
    updated_at: '2026-07-18T00:00:00.000Z',
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}
