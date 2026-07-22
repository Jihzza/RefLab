/**
 * Paid plans are opt-in for launch. Any value other than the exact string
 * "true" keeps purchase and plan-change actions unavailable.
 */
export const PAID_PLANS_ENABLED = import.meta.env.VITE_PAID_PLANS_ENABLED === 'true'
