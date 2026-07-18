import { LEGAL_DOCUMENT_VERSIONS } from '../config'

export type PendingLegalAcceptanceSource =
  | 'email_signup'
  | 'google_signup'

interface PendingLegalAcceptance {
  termsVersion: string
  privacyVersion: string
  source: PendingLegalAcceptanceSource
  createdAt: number
}

const STORAGE_KEY = 'reflab:legal-acceptance-intent:v1'
const MAX_AGE_MS = 30 * 60 * 1000

export function persistPendingLegalAcceptance(
  source: PendingLegalAcceptance['source'],
): void {
  if (typeof window === 'undefined') return

  const pending: PendingLegalAcceptance = {
    termsVersion: LEGAL_DOCUMENT_VERSIONS.terms,
    privacyVersion: LEGAL_DOCUMENT_VERSIONS.privacy,
    source,
    createdAt: Date.now(),
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending))
  } catch {
    // The post-auth consent gate remains the fail-closed fallback when browser
    // storage is unavailable.
  }
}

export function readPendingLegalAcceptance(): PendingLegalAcceptance | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const pending = JSON.parse(raw) as Partial<PendingLegalAcceptance>
    const age = typeof pending.createdAt === 'number'
      ? Date.now() - pending.createdAt
      : Number.POSITIVE_INFINITY
    const isCurrent = pending.termsVersion === LEGAL_DOCUMENT_VERSIONS.terms
      && pending.privacyVersion === LEGAL_DOCUMENT_VERSIONS.privacy
    const hasValidSource = pending.source === 'email_signup'
      || pending.source === 'google_signup'

    if (age < 0 || age > MAX_AGE_MS || !isCurrent || !hasValidSource) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return null
    }

    return pending as PendingLegalAcceptance
  } catch {
    clearPendingLegalAcceptance()
    return null
  }
}

export function clearPendingLegalAcceptance(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // No additional cleanup path exists when sessionStorage is unavailable.
  }
}
