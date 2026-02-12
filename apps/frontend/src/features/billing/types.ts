export type PlanId = 'free' | 'pro' | 'plus'

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'unpaid'
  | 'paused'

export interface Subscription {
  user_id: string
  stripe_subscription_id: string
  price_id: string
  plan: Exclude<PlanId, 'free'>
  status: SubscriptionStatus
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface BillingContextType {
  subscription: Subscription | null
  planId: PlanId
  isLoading: boolean
  error: string | null
  refreshBilling: () => Promise<void>
  isPro: boolean
  isPlus: boolean
}
