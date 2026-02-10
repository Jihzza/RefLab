export type PlanId = 'free' | 'pro' | 'enterprise'
export type BillingInterval = 'monthly' | 'yearly'

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
  id: string
  user_id: string
  stripe_customer_id: string
  status: SubscriptionStatus
  plan_id: PlanId
  billing_interval: BillingInterval
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  canceled_at: string | null
  ended_at: string | null
  stripe_price_id: string
  amount: number // EUR cents
  currency: string
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string | null
  status: string
  amount_due: number // EUR cents
  amount_paid: number // EUR cents
  currency: string
  invoice_url: string | null
  invoice_pdf: string | null
  period_start: string | null
  period_end: string | null
  created_at: string
  updated_at: string
}

export interface BillingContextType {
  subscription: Subscription | null
  invoices: Invoice[]
  planId: PlanId
  isLoading: boolean
  error: string | null
  refreshBilling: () => Promise<void>
  isPro: boolean
  isEnterprise: boolean
}
