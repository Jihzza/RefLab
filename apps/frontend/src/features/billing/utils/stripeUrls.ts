/**
 * Accept only HTTPS URLs hosted by Stripe itself before leaving RefLab.
 *
 * Checkout, Billing Portal and hosted invoice links use different Stripe
 * subdomains, so the boundary is the registrable `stripe.com` domain rather
 * than one hard-coded host. Credentials and non-default ports are rejected.
 */
export function isTrustedStripeUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false

  try {
    const parsed = new URL(value)
    const hostname = parsed.hostname.toLowerCase()
    return parsed.protocol === 'https:'
      && !parsed.username
      && !parsed.password
      && parsed.port === ''
      && (hostname === 'stripe.com' || hostname.endsWith('.stripe.com'))
  } catch {
    return false
  }
}
