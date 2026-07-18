import { isTrustedStripeUrl } from './stripeUrls'

export function navigateToExternalBillingUrl(url: string): boolean {
  if (!isTrustedStripeUrl(url)) return false
  window.location.assign(url)
  return true
}
