/**
 * Commercial launch gate.
 *
 * Paid acquisition is deliberately opt-in. A missing value, mixed casing, or
 * any value other than the exact string "true" keeps paid plans unavailable.
 */
export const PAID_PLANS_ENABLED = import.meta.env.VITE_PAID_PLANS_ENABLED === 'true'
