const PRODUCTION_SUPABASE_HOST = 'iqebkyjcoqggwhausgje.supabase.co'
const DISABLED_PREVIEW_URL = 'https://preview-backend-disabled.invalid'
const DISABLED_PREVIEW_KEY = 'preview-backend-disabled'

export interface BrowserSupabaseConfiguration {
  url: string
  anonKey: string
  productionBackendIsolated: boolean
}

/**
 * Match the default browser storage namespace used by supabase-js. The client
 * also receives this value explicitly, so direct token-bound Auth helpers and
 * the SDK can never drift onto different session keys.
 */
export function buildSupabaseAuthStorageKey(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase()
  const projectNamespace = hostname.split('.')[0]
  if (!projectNamespace) {
    throw new Error('The Supabase URL does not contain a storage namespace.')
  }
  return `sb-${projectNamespace}-auth-token`
}

function isRefLabNetlifyPreview(hostname: string): boolean {
  return /--reflab\.netlify\.app$/i.test(normalizeDnsHostname(hostname))
}

/**
 * Browsers and DNS treat a single trailing dot as the absolute form of the
 * same hostname. Remove it before security-boundary comparisons so an FQDN
 * spelling cannot bypass preview isolation.
 */
function normalizeDnsHostname(hostname: string): string {
  const lowerCaseHostname = hostname.toLowerCase()
  return lowerCaseHostname.endsWith('.') ? lowerCaseHostname.slice(0, -1) : lowerCaseHostname
}

/**
 * A public Netlify preview must never authenticate against the production
 * project. Netlify context variables provide the primary isolation; this
 * runtime guard keeps that boundary intact if those external settings drift.
 */
export function isolateProductionBackendFromPreview(
  pageHostname: string,
  url: string,
  anonKey: string,
): BrowserSupabaseConfiguration {
  if (!isRefLabNetlifyPreview(pageHostname)) {
    return { url, anonKey, productionBackendIsolated: false }
  }

  let backendHostname = ''
  try {
    backendHostname = normalizeDnsHostname(new URL(url).hostname)
  } catch {
    return { url, anonKey, productionBackendIsolated: false }
  }

  if (backendHostname !== PRODUCTION_SUPABASE_HOST) {
    return { url, anonKey, productionBackendIsolated: false }
  }

  return {
    url: DISABLED_PREVIEW_URL,
    anonKey: DISABLED_PREVIEW_KEY,
    productionBackendIsolated: true,
  }
}
