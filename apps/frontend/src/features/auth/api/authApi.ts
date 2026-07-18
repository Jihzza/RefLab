import type { User } from '@supabase/supabase-js'
import {
  supabase,
  supabaseBrowserConfiguration,
  withSupabaseAuthStorageLock,
} from '@/lib/supabaseClient'
import { buildAuthCallbackUrl } from '../utils/authNavigation'

export type PersistedAuthSessionStatus =
  | 'updated'
  | 'cleared'
  | 'absent'
  | 'different'
  | 'unavailable'

interface PersistedAuthSession {
  access_token: string
  user: User
  [key: string]: unknown
}

interface TokenBoundUserUpdateResult {
  user: User | null
  error: Error | null
  persistedSessionStatus: PersistedAuthSessionStatus
}

interface TokenBoundSignOutResult {
  error: Error | null
  persistedSessionStatus: PersistedAuthSessionStatus
}

function authEndpoint(path: string): string {
  return `${supabaseBrowserConfiguration.url.replace(/\/$/, '')}/auth/v1${path}`
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'apikey': supabaseBrowserConfiguration.anonKey,
    'Content-Type': 'application/json;charset=UTF-8',
    'X-Supabase-Api-Version': '2024-01-01',
  }
}

function decodeJwtSubject(accessToken: string): string | null {
  const parts = accessToken.split('.')
  if (parts.length !== 3 || !parts[1]) return null

  try {
    const normalizedPayload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')
    const payload = JSON.parse(atob(normalizedPayload)) as { sub?: unknown }
    return typeof payload.sub === 'string' && payload.sub.length > 0
      ? payload.sub
      : null
  } catch {
    return null
  }
}

function validateTokenOwner(accessToken: string, expectedUserId: string): Error | null {
  if (!accessToken || !expectedUserId) return new Error('No active session')
  const tokenSubject = decodeJwtSubject(accessToken)
  if (!tokenSubject || tokenSubject !== expectedUserId) {
    return new Error('The captured access token does not belong to the expected account.')
  }
  return null
}

function parsePersistedSession(rawValue: string): PersistedAuthSession | null {
  try {
    const value = JSON.parse(rawValue) as Partial<PersistedAuthSession> | null
    if (
      !value
      || typeof value.access_token !== 'string'
      || typeof value.user?.id !== 'string'
    ) return null
    return value as PersistedAuthSession
  } catch {
    return null
  }
}

function storedSessionMatches(
  session: PersistedAuthSession,
  accessToken: string,
  expectedUserId: string,
): boolean {
  return session.access_token === accessToken
    && session.user.id === expectedUserId
}

async function updatePersistedUserIfSessionMatches(
  accessToken: string,
  expectedUserId: string,
  updatedUser: User,
): Promise<PersistedAuthSessionStatus> {
  if (typeof window === 'undefined') return 'absent'

  try {
    return await withSupabaseAuthStorageLock(() => {
      const storageKey = supabaseBrowserConfiguration.authStorageKey
      const rawValue = window.localStorage.getItem(storageKey)
      if (rawValue === null) return 'absent'
      const session = parsePersistedSession(rawValue)
      if (!session || !storedSessionMatches(session, accessToken, expectedUserId)) {
        return 'different'
      }

      // A newer auth write wins. Never overwrite it with a late A response.
      if (window.localStorage.getItem(storageKey) !== rawValue) return 'different'
      window.localStorage.setItem(storageKey, JSON.stringify({
        ...session,
        user: updatedUser,
      }))
      return 'updated'
    })
  } catch {
    return 'unavailable'
  }
}

async function clearPersistedSessionIfMatches(
  accessToken: string,
  expectedUserId: string,
): Promise<PersistedAuthSessionStatus> {
  if (typeof window === 'undefined') return 'absent'

  try {
    return await withSupabaseAuthStorageLock(() => {
      const storageKey = supabaseBrowserConfiguration.authStorageKey
      const rawValue = window.localStorage.getItem(storageKey)
      if (rawValue === null) return 'absent'
      const session = parsePersistedSession(rawValue)
      if (!session || !storedSessionMatches(session, accessToken, expectedUserId)) {
        return 'different'
      }

      // Compare again immediately before deletion. If B replaced A while the
      // network request was in flight, B's session and auxiliary state survive.
      if (window.localStorage.getItem(storageKey) !== rawValue) return 'different'
      window.localStorage.removeItem(storageKey)
      if (window.localStorage.getItem(storageKey) !== null) return 'different'

      // These keys are shared with the configured Auth client. They are only
      // removed after the matching primary A session was actually removed.
      window.localStorage.removeItem(`${storageKey}-code-verifier`)
      window.localStorage.removeItem(`${storageKey}-user`)
      return 'cleared'
    })
  } catch {
    return 'unavailable'
  }
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => null) as {
    msg?: unknown
    message?: unknown
    error_description?: unknown
    error?: unknown
  } | null
  const serverMessage = body && [
    body.msg,
    body.message,
    body.error_description,
    body.error,
  ].find(value => typeof value === 'string')
  return new Error(
    typeof serverMessage === 'string'
      ? serverMessage
      : `${fallback} (${response.status})`,
  )
}

function userFromResponseBody(body: unknown): User | null {
  if (!body || typeof body !== 'object') return null
  const record = body as Record<string, unknown>
  const candidate = record.user && typeof record.user === 'object'
    ? record.user as Record<string, unknown>
    : record
  return typeof candidate.id === 'string' ? candidate as unknown as User : null
}

async function updateTokenBoundUser(
  accessToken: string,
  expectedUserId: string,
  updates: Record<string, unknown>,
): Promise<TokenBoundUserUpdateResult> {
  const ownerError = validateTokenOwner(accessToken, expectedUserId)
  if (ownerError) {
    return { user: null, error: ownerError, persistedSessionStatus: 'different' }
  }

  let response: Response
  try {
    response = await fetch(authEndpoint('/user'), {
      method: 'PUT',
      headers: authHeaders(accessToken),
      body: JSON.stringify(updates),
    })
  } catch {
    return {
      user: null,
      error: new Error('The account update could not reach the authentication server.'),
      persistedSessionStatus: 'absent',
    }
  }

  if (!response.ok) {
    return {
      user: null,
      error: await responseError(response, 'Failed to update the account'),
      persistedSessionStatus: 'absent',
    }
  }

  const body = await response.json().catch(() => null)
  const updatedUser = userFromResponseBody(body)
  if (!updatedUser) {
    return {
      user: null,
      error: new Error('The authentication server returned an invalid user.'),
      persistedSessionStatus: 'absent',
    }
  }
  if (updatedUser.id !== expectedUserId) {
    return {
      user: null,
      error: new Error('The authentication server returned a different account.'),
      persistedSessionStatus: 'different',
    }
  }

  const persistedSessionStatus = await updatePersistedUserIfSessionMatches(
    accessToken,
    expectedUserId,
    updatedUser,
  )
  return { user: updatedUser, error: null, persistedSessionStatus }
}

export type AccountDeletionRequestErrorCode =
  | 'reauthentication_required'
  | 'confirmation_mismatch'
  | 'account_not_found_or_session_invalid'
  | 'account_identity_mismatch'
  | 'auth_verification_unavailable'
  | 'reauthentication_check_unavailable'
  | 'deletion_status_check_unavailable'
  | 'deletion_enqueue_ambiguous'
  | 'deletion_session_revocation_ambiguous'
  | 'request_ambiguous'
  | 'request_cancelled'
  | 'unexpected_response'

export class AccountDeletionRequestError extends Error {
  readonly code: AccountDeletionRequestErrorCode
  readonly status: number | null

  constructor(
    message: string,
    code: AccountDeletionRequestErrorCode,
    status: number | null,
  ) {
    super(message)
    this.name = 'AccountDeletionRequestError'
    this.code = code
    this.status = status
  }
}

export function accountDeletionRequiresReauthentication(error: Error): boolean {
  return error instanceof AccountDeletionRequestError
    && (
      error.code === 'reauthentication_required'
      || error.code === 'account_not_found_or_session_invalid'
      || error.code === 'account_identity_mismatch'
    )
}

export function accountDeletionRequestCanRetry(error: Error): boolean {
  return error instanceof AccountDeletionRequestError
    && (
      error.code === 'request_ambiguous'
      || error.code === 'deletion_enqueue_ambiguous'
      || error.code === 'deletion_session_revocation_ambiguous'
    )
}

export function accountDeletionWasDefinitivelyRejected(error: Error): boolean {
  return error instanceof AccountDeletionRequestError
    && (
      error.code === 'reauthentication_required'
      || error.code === 'confirmation_mismatch'
      || error.code === 'account_not_found_or_session_invalid'
      || error.code === 'account_identity_mismatch'
      || error.code === 'auth_verification_unavailable'
      || error.code === 'reauthentication_check_unavailable'
      || error.code === 'deletion_status_check_unavailable'
      || (
        error.code === 'unexpected_response'
        && error.status !== null
        && error.status >= 400
        && error.status < 500
      )
    )
}

export function accountDeletionRequestWasCancelled(error: Error): boolean {
  return error instanceof AccountDeletionRequestError
    && error.code === 'request_cancelled'
}

/**
 * Sign in with email and password
 *
 * Supabase will:
 * 1. Verify the credentials against auth.users table
 * 2. Return a session with access_token and refresh_token
 * 3. Automatically store the session in localStorage (because we set persistSession: true)
 */
export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

/**
 * Sign up with email and password
 *
 * Supabase will:
 * 1. Create a new user in auth.users table
 * 2. Send a confirmation email (if enabled in Supabase dashboard)
 * 3. Return the user object (session may be null until email is confirmed)
 */
export async function signUpWithPassword(email: string, password: string, returnTo?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Where to redirect after email confirmation
      // This URL must be in your Supabase "Redirect URLs" list
      emailRedirectTo: buildAuthCallbackUrl(returnTo),
    },
  })

  return { data, error }
}

/**
 * Sign in with Google OAuth
 *
 * This will:
 * 1. Redirect the user to Google's login page
 * 2. User authenticates with Google
 * 3. Google redirects back to your site with tokens in the URL
 * 4. Supabase client automatically parses the tokens (detectSessionInUrl: true)
 */
export async function signInWithGoogle(returnTo?: string) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Where Google should redirect after successful auth
      // This lands on the OAuth callback page which handles the code exchange
      redirectTo: buildAuthCallbackUrl(returnTo),
    },
  })

  return { data, error }
}

/**
 * Revoke exactly the captured session without asking the shared Supabase Auth
 * client which account is current after an async lock/network boundary.
 */
export async function signOut(
  accessToken: string,
  expectedUserId: string,
): Promise<TokenBoundSignOutResult> {
  const ownerError = validateTokenOwner(accessToken, expectedUserId)
  let remoteError: Error | null = ownerError

  if (!ownerError) {
    try {
      const response = await fetch(authEndpoint('/logout?scope=local'), {
        method: 'POST',
        headers: authHeaders(accessToken),
      })
      // Match auth-js: an already invalid/deleted session is locally signed
      // out, while unexpected server failures are still reported to the UI.
      if (
        !response.ok
        && response.status !== 401
        && response.status !== 403
        && response.status !== 404
      ) {
        remoteError = await responseError(response, 'Failed to sign out')
      }
    } catch {
      remoteError = new Error('Sign-out could not reach the authentication server.')
    }
  }

  const persistedSessionStatus = await clearPersistedSessionIfMatches(
    accessToken,
    expectedUserId,
  )
  if (persistedSessionStatus === 'unavailable' && !remoteError) {
    remoteError = new Error('The local session could not be cleared safely.')
  }

  return { error: remoteError, persistedSessionStatus }
}

/**
 * Send a password reset email
 *
 * Supabase will:
 * 1. Send an email with a reset link
 * 2. The link contains a token and redirects to your reset-password page
 * 3. The token is valid for a limited time (configurable in Supabase)
 */
export async function resetPasswordForEmail(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    // Where the reset link in the email should redirect to
    // This URL must be in your Supabase "Redirect URLs" list
    redirectTo: `${window.location.origin}/reset-password`,
  })

  return { data, error }
}

/**
 * Update the user's password (used on the reset-password page)
 *
 * This only works when the user has a valid session
 * (they get one when they click the reset link in the email)
 */
export async function updateUserPassword(
  accessToken: string,
  expectedUserId: string,
  newPassword: string,
) {
  return updateTokenBoundUser(accessToken, expectedUserId, {
    password: newPassword,
  })
}

/**
 * Get the current session
 *
 * Useful for checking if user is logged in without subscribing to changes
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  return { session: data.session, error }
}

/**
 * Subscribe to auth state changes
 *
 * This is the main way to track auth state in real-time.
 * Events include:
 * - INITIAL_SESSION: fired once when the listener is set up
 * - SIGNED_IN: user just logged in
 * - SIGNED_OUT: user just logged out
 * - TOKEN_REFRESHED: access token was automatically refreshed
 * - USER_UPDATED: user data changed (e.g., password reset)
 * - PASSWORD_RECOVERY: user arrived via a password reset link
 *
 * Returns an unsubscribe function to clean up the listener
 */
export function onAuthStateChange(
  callback: (event: string, session: import('@supabase/supabase-js').Session | null) => void
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)

  // Return the unsubscribe function for cleanup in useEffect
  return subscription.unsubscribe
}

/**
 * Manually exchange an auth code for a session (PKCE flow)
 *
 * Normally detectSessionInUrl handles this automatically,
 * but this serves as a manual fallback for the callback page.
 */
export async function exchangeCodeForSession(code: string) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  return { session: data.session, error }
}

/**
 * Update the current user's metadata (stored in auth.users.raw_user_meta_data)
 */
export async function updateUserMetadata(
  accessToken: string,
  expectedUserId: string,
  updates: Record<string, unknown>,
) {
  return updateTokenBoundUser(accessToken, expectedUserId, { data: updates })
}

/**
 * Delete the current user's account via the delete-account Edge Function
 */
export async function deleteAccountRequest(
  accessToken: string,
  expectedUserId: string,
) {
  const ownerError = validateTokenOwner(accessToken, expectedUserId)
  if (ownerError) {
    return {
      error: new AccountDeletionRequestError(
        ownerError.message,
        accessToken && expectedUserId
          ? 'account_identity_mismatch'
          : 'account_not_found_or_session_invalid',
        null,
      ),
    }
  }

  let response: Response
  try {
    response = await fetch(
      `${supabaseBrowserConfiguration.url.replace(/\/$/, '')}/functions/v1/delete-account`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseBrowserConfiguration.anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmation: 'DELETE',
          expected_user_id: expectedUserId,
        }),
      },
    )
  } catch {
    return {
      error: new AccountDeletionRequestError(
        'Account deletion was requested, but the server response could not be confirmed.',
        'request_ambiguous',
        null,
      ),
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as {
      error?: unknown
      code?: unknown
    }
    const code = typeof body.code === 'string'
      && [
        'reauthentication_required',
        'confirmation_mismatch',
        'account_not_found_or_session_invalid',
        'account_identity_mismatch',
        'auth_verification_unavailable',
        'reauthentication_check_unavailable',
        'deletion_status_check_unavailable',
        'deletion_enqueue_ambiguous',
        'deletion_session_revocation_ambiguous',
      ].includes(body.code)
      ? body.code as AccountDeletionRequestErrorCode
      : response.status >= 500
        ? 'deletion_enqueue_ambiguous'
        : 'unexpected_response'
    const message = typeof body.error === 'string'
      ? body.error
      : `Failed to delete account (${response.status})`
    return { error: new AccountDeletionRequestError(message, code, response.status) }
  }

  return { error: null }
}
