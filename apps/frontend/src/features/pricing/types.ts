import type { PlanId } from '@/features/billing/types'

/** Plan definition for display in the plans section */
export interface PlanConfig {
  id: PlanId
  name: string
  price: string
  pricePerMonth: number
  period: string
  benefits: string[]
  isHighlighted?: boolean
}

/** Stripe invoice returned by the list-invoices edge function */
export interface Invoice {
  id: string
  number: string | null
  amount_paid: number
  currency: string
  status: string
  created: number
  hosted_invoice_url: string | null
  invoice_pdf: string | null
}
