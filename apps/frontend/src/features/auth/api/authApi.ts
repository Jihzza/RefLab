import { supabase } from '@/lib/supabaseClient'

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
export async function signUpWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Where to redirect after email confirmation
      // This URL must be in your Supabase "Redirect URLs" list
      emailRedirectTo: `${window.location.origin}/auth/callback`,
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
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Where Google should redirect after successful auth
      // This lands on the OAuth callback page which handles the code exchange
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  return { data, error }
}

/**
 * Sign out the current user
 *
 * Supabase will:
 * 1. Invalidate the session on the server
 * 2. Clear the session from localStorage
 * 3. The onAuthStateChange listener will fire with event 'SIGNED_OUT'
 */
export async function signOut(scope: 'global' | 'local' | 'others' = 'local') {
  const { error } = await supabase.auth.signOut({ scope })
  return { error }
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
export async function updateUserPassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  return { data, error }
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
export async function updateUserMetadata(updates: Record<string, unknown>) {
  const { data, error } = await supabase.auth.updateUser({ data: updates })
  return { user: data.user, error }
}

/**
 * Delete the current user's account via the delete-account Edge Function
 */
export async function deleteAccountRequest() {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { error: new Error('No active session') }
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const response = await fetch(
    `${supabaseUrl}/functions/v1/delete-account`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    return { error: new Error(body.error || `Failed to delete account (${response.status})`) }
  }

  return { error: null }
}
