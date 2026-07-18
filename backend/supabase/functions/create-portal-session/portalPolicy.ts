const FREE_LAUNCH_PORTAL_FEATURES = new Set([
  'customer_update',
  'invoice_history',
  'payment_method_update',
  'subscription_cancel',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Free-only launch permits account and existing-subscription management, but
 * no portal feature that can buy, upgrade, or otherwise change a paid plan.
 * Unknown future Stripe features fail closed until they are reviewed.
 */
export function portalIsSafeForFreeLaunch(configuration: unknown) {
  if (!isRecord(configuration) || configuration.active !== true
    || !isRecord(configuration.features)) {
    return false
  }

  const subscriptionUpdate = configuration.features.subscription_update
  if (!isRecord(subscriptionUpdate) || subscriptionUpdate.enabled !== false) {
    return false
  }

  return Object.entries(configuration.features).every(([name, feature]) => {
    if (FREE_LAUNCH_PORTAL_FEATURES.has(name)) return true
    return isRecord(feature) && feature.enabled === false
  })
}
