import { describe, expect, it } from 'vitest'
import { isTrustedStripeUrl } from './stripeUrls'

describe('isTrustedStripeUrl', () => {
  it.each([
    'https://checkout.stripe.com/c/pay/cs_test_123',
    'https://billing.stripe.com/p/session/test_123',
    'https://stripe.com/example',
  ])('accepts Stripe HTTPS URL %s', (value) => {
    expect(isTrustedStripeUrl(value)).toBe(true)
  })

  it.each([
    'http://checkout.stripe.com/test',
    'https://evilstripe.com/test',
    'https://stripe.com.evil.example/test',
    'https://user:password@stripe.com/test',
    'https://stripe.com:444/test',
    'not a URL',
    null,
  ])('rejects untrusted value %s', (value) => {
    expect(isTrustedStripeUrl(value)).toBe(false)
  })
})
