const AUTH_RETURN_TO_STORAGE_KEY = 'reflab-auth-return-to'
const AUTH_INTENT_MAX_AGE_MS = 30 * 60 * 1000

export const DEFAULT_AUTH_RETURN_TO = '/app/dashboard'

export type AuthLandingView = 'login' | 'signup'
export type AuthPlanId = 'free' | 'pro' | 'plus'

interface StoredAuthIntent {
  createdAt: number
  returnTo: string
}

function isSafeAppPath(candidate: string): boolean {
  const hasControlCharacter = Array.from(candidate).some((character) => {
    const code = character.charCodeAt(0)
    return code <= 31 || code === 127
  })

  if (
    candidate !== candidate.trim()
    || !candidate.startsWith('/')
    || candidate.startsWith('//')
    || candidate.includes('\\')
    || hasControlCharacter
  ) {
    return false
  }

  try {
    const base = new URL('https://reflab.local')
    const parsed = new URL(candidate, base)
    return parsed.origin === base.origin
      && (
        parsed.pathname === '/app'
        || parsed.pathname.startsWith('/app/')
        || parsed.pathname === '/admin'
        || parsed.pathname.startsWith('/admin/')
      )
  } catch {
    return false
  }
}

/** Only returns same-origin routes under the protected app/admin trees. */
export function sanitizeAuthReturnTo(
  candidate: string | null | undefined,
  fallback = DEFAULT_AUTH_RETURN_TO,
): string {
  const safeFallback = isSafeAppPath(fallback) ? fallback : DEFAULT_AUTH_RETURN_TO
  if (!candidate || !isSafeAppPath(candidate)) return safeFallback

  const parsed = new URL(candidate, 'https://reflab.local')
  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

export function parseAuthPlan(candidate: string | null | undefined): AuthPlanId | null {
  return candidate === 'free' || candidate === 'pro' || candidate === 'plus'
    ? candidate
    : null
}

export function getAuthPlanFromSearch(search: string): AuthPlanId | null {
  return parseAuthPlan(new URLSearchParams(search).get('plan'))
}

export function getAuthLandingView(search: string): AuthLandingView {
  return new URLSearchParams(search).get('auth') === 'signup' ? 'signup' : 'login'
}

export function persistAuthReturnTo(returnTo: string): string {
  const safeReturnTo = sanitizeAuthReturnTo(returnTo)

  if (typeof window === 'undefined') return safeReturnTo

  const intent: StoredAuthIntent = {
    createdAt: Date.now(),
    returnTo: safeReturnTo,
  }

  try {
    window.sessionStorage.setItem(AUTH_RETURN_TO_STORAGE_KEY, JSON.stringify(intent))
  } catch {
    // The query-string returnTo remains available when session storage is blocked.
  }

  return safeReturnTo
}

function readStoredAuthReturnTo(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(AUTH_RETURN_TO_STORAGE_KEY)
    if (!raw) return null

    const stored = JSON.parse(raw) as Partial<StoredAuthIntent>
    const isFresh = typeof stored.createdAt === 'number'
      && Date.now() - stored.createdAt >= 0
      && Date.now() - stored.createdAt <= AUTH_INTENT_MAX_AGE_MS

    if (!isFresh || typeof stored.returnTo !== 'string') {
      window.sessionStorage.removeItem(AUTH_RETURN_TO_STORAGE_KEY)
      return null
    }

    if (!isSafeAppPath(stored.returnTo)) {
      window.sessionStorage.removeItem(AUTH_RETURN_TO_STORAGE_KEY)
      return null
    }

    return sanitizeAuthReturnTo(stored.returnTo)
  } catch {
    return null
  }
}

/** Query intent wins over storage; both paths are validated before use. */
export function resolveAuthReturnTo(
  search: string,
  fallback = DEFAULT_AUTH_RETURN_TO,
): string {
  const queryReturnTo = new URLSearchParams(search).get('returnTo')
  if (queryReturnTo !== null) return sanitizeAuthReturnTo(queryReturnTo, fallback)
  return readStoredAuthReturnTo() ?? sanitizeAuthReturnTo(fallback)
}

export function clearAuthReturnTo(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(AUTH_RETURN_TO_STORAGE_KEY)
  } catch {
    // There is nothing else to clear when storage is unavailable.
  }
}

export function consumeAuthReturnTo(
  search: string,
  fallback = DEFAULT_AUTH_RETURN_TO,
): string {
  const returnTo = resolveAuthReturnTo(search, fallback)
  clearAuthReturnTo()
  return returnTo
}

export function buildAuthLandingUrl(
  view: AuthLandingView,
  returnTo: string,
  plan?: AuthPlanId | null,
): string {
  const safeReturnTo = sanitizeAuthReturnTo(returnTo)
  const search = new URLSearchParams({ auth: view, returnTo: safeReturnTo })
  const safePlan = parseAuthPlan(plan)
  if (safePlan) search.set('plan', safePlan)
  return `/?${search.toString()}#auth`
}

export function buildAuthCallbackUrl(returnTo?: string): string {
  const callbackUrl = new URL('/auth/callback', window.location.origin)
  if (returnTo) callbackUrl.searchParams.set('returnTo', sanitizeAuthReturnTo(returnTo))
  return callbackUrl.toString()
}

export function buildLegalAcceptanceUrl(returnTo: string): string {
  const search = new URLSearchParams({
    returnTo: sanitizeAuthReturnTo(returnTo),
  })
  return `/legal/accept?${search.toString()}`
}
