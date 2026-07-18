import { portalIsSafeForFreeLaunch } from './portalPolicy.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function approvedManagementConfiguration() {
  return {
    active: true,
    features: {
      customer_update: { enabled: true },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true },
      subscription_update: { enabled: false },
    },
  }
}

Deno.test('free launch allows only reviewed account-management portal features', () => {
  assert(
    portalIsSafeForFreeLaunch(approvedManagementConfiguration()),
    'approved management-only configuration was rejected',
  )
})

Deno.test('free launch rejects subscription updates and missing explicit disablement', () => {
  const enabled = approvedManagementConfiguration()
  enabled.features.subscription_update.enabled = true
  assert(!portalIsSafeForFreeLaunch(enabled), 'subscription update was allowed')

  const missing = approvedManagementConfiguration()
  const features = missing.features as Record<string, unknown>
  delete features.subscription_update
  assert(!portalIsSafeForFreeLaunch(missing), 'missing subscription update state was allowed')
})

Deno.test('free launch fails closed on active unknown features', () => {
  const activeUnknown = approvedManagementConfiguration()
  const features = activeUnknown.features as Record<string, unknown>
  features.future_upsell = { enabled: true }
  assert(!portalIsSafeForFreeLaunch(activeUnknown), 'active unknown feature was allowed')

  features.future_upsell = { enabled: false }
  assert(
    portalIsSafeForFreeLaunch(activeUnknown),
    'explicitly disabled unknown feature should remain closed and safe',
  )
})

Deno.test('free launch rejects inactive and malformed portal configurations', () => {
  const inactive = approvedManagementConfiguration()
  inactive.active = false
  assert(!portalIsSafeForFreeLaunch(inactive), 'inactive configuration was allowed')
  assert(!portalIsSafeForFreeLaunch(null), 'malformed configuration was allowed')
})
