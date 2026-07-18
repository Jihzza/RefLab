// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Subscription } from '@/features/billing/types'
import SubscriptionCard from './components/SubscriptionCard'
import CancelDialog from './components/CancelDialog'
import ChangePlanDialog from './components/ChangePlanDialog'
import { useInvoices } from './hooks/useInvoices'

const ACCOUNT_A = '11111111-1111-4111-8111-111111111111'
const ACCOUNT_B = '22222222-2222-4222-8222-222222222222'

const mocks = vi.hoisted(() => ({
  currentUserId: '11111111-1111-4111-8111-111111111111' as string | null,
  currentToken: 'token-a' as string | null,
  listInvoices: vi.fn(),
  createPortalSession: vi.fn(),
  cancelSubscription: vi.fn(),
  changeSubscriptionPlan: vi.fn(),
  navigateToExternalBillingUrl: vi.fn(),
}))

vi.mock('@/features/auth/components/useAuth', () => ({
  useAuth: () => ({
    user: mocks.currentUserId ? { id: mocks.currentUserId } : null,
    session: mocks.currentUserId && mocks.currentToken
      ? {
          access_token: mocks.currentToken,
          user: { id: mocks.currentUserId },
        }
      : null,
  }),
}))

vi.mock('./api/pricingApi', () => ({
  listInvoices: mocks.listInvoices,
  cancelSubscription: mocks.cancelSubscription,
  changeSubscriptionPlan: mocks.changeSubscriptionPlan,
}))

vi.mock('@/features/billing/api/billingApi', () => ({
  createPortalSession: mocks.createPortalSession,
  createCheckoutSession: vi.fn(),
}))

vi.mock('@/features/billing/utils/billingNavigation', () => ({
  navigateToExternalBillingUrl: mocks.navigateToExternalBillingUrl,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'pt-PT' },
  }),
}))

beforeEach(() => {
  mocks.currentUserId = ACCOUNT_A
  mocks.currentToken = 'token-a'
  mocks.listInvoices.mockReset()
  mocks.createPortalSession.mockReset()
  mocks.cancelSubscription.mockReset()
  mocks.changeSubscriptionPlan.mockReset()
  mocks.navigateToExternalBillingUrl.mockReset()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('billing UI account boundary', () => {
  it('does not expose account A invoices after switching to account B mid-fetch', async () => {
    const accountAResponse = deferred<{
      invoices: Array<{ id: string }>
      hasMore: boolean
      error: null
    }>()
    mocks.listInvoices.mockReturnValueOnce(accountAResponse.promise)

    const { rerender } = render(<InvoiceProbe />)
    fireEvent.click(screen.getByRole('button', { name: 'fetch invoices' }))

    expect(mocks.listInvoices).toHaveBeenCalledWith('token-a', ACCOUNT_A, 10)
    expect(screen.getByTestId('invoice-state').textContent).toContain('loading')

    mocks.currentUserId = ACCOUNT_B
    mocks.currentToken = 'token-b'
    rerender(<InvoiceProbe />)

    expect(screen.getByTestId('invoice-state').textContent).toContain('empty')
    expect(screen.getByTestId('invoice-state').textContent).not.toContain('invoice-a')

    await act(async () => {
      accountAResponse.resolve({
        invoices: [{ id: 'invoice-a' }],
        hasMore: false,
        error: null,
      })
      await accountAResponse.promise
    })

    expect(screen.getByTestId('invoice-state').textContent).toContain('empty')
    expect(screen.getByTestId('invoice-state').textContent).not.toContain('invoice-a')
  })

  it('does not redirect account B when account A portal creation resolves late', async () => {
    const portalResponse = deferred<{
      url: string
      error: null
    }>()
    mocks.createPortalSession.mockReturnValueOnce(portalResponse.promise)

    const subscription = subscriptionFor(ACCOUNT_A)
    const { rerender } = render(
      <SubscriptionCard
        subscription={subscription}
        planId="pro"
        onCancel={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Manage via Stripe' }))
    expect(mocks.createPortalSession).toHaveBeenCalledWith('token-a', ACCOUNT_A)

    mocks.currentUserId = ACCOUNT_B
    mocks.currentToken = 'token-b'
    rerender(
      <SubscriptionCard
        subscription={subscriptionFor(ACCOUNT_B)}
        planId="pro"
        onCancel={vi.fn()}
      />,
    )
    expect(
      (screen.getByRole('button', { name: 'Manage via Stripe' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false)

    await act(async () => {
      portalResponse.resolve({
        url: 'https://billing.stripe.com/p/session-a',
        error: null,
      })
      await portalResponse.promise
    })

    expect(mocks.navigateToExternalBillingUrl).not.toHaveBeenCalled()
  })

  it('does not continue or close an account A cancellation dialog as account B', async () => {
    const cancelResponse = deferred<{ success: true; error: null }>()
    mocks.cancelSubscription.mockReturnValueOnce(cancelResponse.promise)
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    const subscription = subscriptionFor(ACCOUNT_A)

    const { rerender } = render(
      <CancelDialog
        isOpen
        onClose={onClose}
        subscription={subscription}
        onSuccess={onSuccess}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Plan' }))
    expect(mocks.cancelSubscription).toHaveBeenCalledWith(
      'token-a',
      ACCOUNT_A,
      subscription.stripe_subscription_id,
    )

    mocks.currentUserId = ACCOUNT_B
    mocks.currentToken = 'token-b'
    rerender(
      <CancelDialog
        isOpen
        onClose={onClose}
        subscription={subscriptionFor(ACCOUNT_B)}
        onSuccess={onSuccess}
      />,
    )
    expect(
      (screen.getByRole('button', { name: 'Cancel Plan' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false)

    await act(async () => {
      cancelResponse.resolve({ success: true, error: null })
      await cancelResponse.promise
    })

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not continue or close an account A plan change dialog as account B', async () => {
    const changeResponse = deferred<{ success: true; error: null }>()
    mocks.changeSubscriptionPlan.mockReturnValueOnce(changeResponse.promise)
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    const subscription = subscriptionFor(ACCOUNT_A)

    const { rerender } = render(
      <ChangePlanDialog
        isOpen
        onClose={onClose}
        subscription={subscription}
        targetPlan="plus"
        onSuccess={onSuccess}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Switch to {{plan}}' }))
    expect(mocks.changeSubscriptionPlan).toHaveBeenCalledWith(
      'token-a',
      ACCOUNT_A,
      subscription.stripe_subscription_id,
      'plus',
    )

    mocks.currentUserId = ACCOUNT_B
    mocks.currentToken = 'token-b'
    rerender(
      <ChangePlanDialog
        isOpen
        onClose={onClose}
        subscription={subscriptionFor(ACCOUNT_B)}
        targetPlan="plus"
        onSuccess={onSuccess}
      />,
    )
    expect(
      (screen.getByRole('button', { name: 'Switch to {{plan}}' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false)

    await act(async () => {
      changeResponse.resolve({ success: true, error: null })
      await changeResponse.promise
    })

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})

function InvoiceProbe() {
  const { invoices, loading, error, fetchInvoices } = useInvoices()

  return (
    <>
      <button type="button" onClick={() => void fetchInvoices()}>
        fetch invoices
      </button>
      <div data-testid="invoice-state">
        {loading
          ? 'loading'
          : (error ?? (invoices.map((invoice) => invoice.id).join(',') || 'empty'))}
      </div>
    </>
  )
}

function subscriptionFor(userId: string): Subscription {
  return {
    user_id: userId,
    stripe_subscription_id: 'sub_account_a',
    price_id: 'price_pro',
    plan: 'pro',
    status: 'active',
    current_period_end: '2026-08-18T00:00:00.000Z',
    cancel_at_period_end: false,
    created_at: '2026-07-18T00:00:00.000Z',
    updated_at: '2026-07-18T00:00:00.000Z',
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}
