import { createClient, navigatorLock } from '@supabase/supabase-js'
import {
  buildSupabaseAuthStorageKey,
  isolateProductionBackendFromPreview,
} from './supabaseConfig'

// Vite exposes browser configuration through import.meta.env. Local development
// normally reads .env.local; Netlify supplies the same values at build time.
const isLocalVisualLab = import.meta.env.DEV
  && typeof window !== 'undefined'
  && window.location.pathname.endsWith('/visual-lab.html')
const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
  || (isLocalVisualLab ? 'http://127.0.0.1:54321' : '')
const configuredSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  || (isLocalVisualLab ? 'visual-lab-placeholder' : '')
const isolatedBrowserConfiguration = isolateProductionBackendFromPreview(
  typeof window === 'undefined' ? '' : window.location.hostname,
  configuredSupabaseUrl,
  configuredSupabaseAnonKey,
)
const supabaseUrl = isolatedBrowserConfiguration.url
const supabaseAnonKey = isolatedBrowserConfiguration.anonKey

// Fail at module initialisation instead of running the real app against an
// accidental or partially configured backend.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local'
  )
}

/**
 * Resolved browser configuration after the Netlify-preview isolation fence.
 * Direct REST helpers must consume this object instead of raw Vite variables,
 * otherwise a preview could bypass the backend selected for the SDK client.
 */
export const supabaseBrowserConfiguration = Object.freeze({
  ...isolatedBrowserConfiguration,
  authStorageKey: buildSupabaseAuthStorageKey(supabaseUrl),
})

const AUTH_STORAGE_LOCK_TIMEOUT_MS = 5_000
const browserAuthStorageLock = typeof navigator !== 'undefined' && navigator.locks
  ? navigatorLock
  : null

/**
 * Serialize compare-and-set session mutations with this Supabase client's Auth
 * storage operations whenever the Web Locks API is available. The synchronous
 * localStorage compare remains the compatibility fallback in older browsers.
 */
export async function withSupabaseAuthStorageLock<Result>(
  operation: () => Result | Promise<Result>,
): Promise<Result> {
  if (!browserAuthStorageLock) return operation()
  return browserAuthStorageLock(
    `lock:${supabaseBrowserConfiguration.authStorageKey}`,
    AUTH_STORAGE_LOCK_TIMEOUT_MS,
    async () => operation(),
  )
}

// Create a single Supabase client instance for the entire app
// This client handles authentication, database queries, realtime subscriptions
// and user-facing Storage access.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Where to store the session (localStorage persists across browser sessions)
    persistSession: !isLocalVisualLab,

    // Automatically refresh the token before it expires
    autoRefreshToken: !isLocalVisualLab,

    // Detect session from URL (needed for OAuth redirects and email confirmations)
    detectSessionInUrl: !isLocalVisualLab,

    // Keep token-bound Auth storage CAS helpers aligned with this client.
    storageKey: supabaseBrowserConfiguration.authStorageKey,
    lock: browserAuthStorageLock ?? undefined,
    lockAcquireTimeout: AUTH_STORAGE_LOCK_TIMEOUT_MS,

    // Use PKCE (Proof Key for Code Exchange) for all auth flows
    // This replaces the implicit flow: URLs use ?code=... instead of #access_token=...
    flowType: 'pkce',
  },
})
