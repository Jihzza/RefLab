import { BillingContext } from '@/features/billing/components/BillingContext'
import type { Subscription } from '@/features/billing/types'
import PricingPage from '@/features/pricing/components/PricingPage'
import FixtureAuthProvider from './FixtureAuthProvider'
import FixtureShell from './FixtureShell'

const subscription: Subscription = {
  user_id: 'fixture-rafael',
  stripe_subscription_id: 'sub_fixture',
  price_id: 'price_pro_fixture',
  plan: 'pro',
  status: 'active',
  current_period_end: '2026-08-15T12:00:00.000Z',
  cancel_at_period_end: false,
  created_at: '2026-07-15T09:41:00.000Z',
  updated_at: '2026-07-15T09:41:00.000Z',
}

export default function PricingFixture() {
  return (
    <FixtureAuthProvider>
      <BillingContext.Provider
        value={{
          subscription,
          planId: 'pro',
          isLoading: false,
          error: null,
          refreshBilling: async () => undefined,
          isPro: true,
          isPlus: false,
        }}
      >
        <FixtureShell title="Planos e faturação">
          <PricingPage />
        </FixtureShell>
      </BillingContext.Provider>
    </FixtureAuthProvider>
  )
}
