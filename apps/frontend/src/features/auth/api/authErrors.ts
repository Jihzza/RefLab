export type AuthErrorContext = 'login' | 'signup' | 'reset' | 'update-password' | 'oauth' | 'delete-account'

export interface MappedAuthError {
  field?: 'email' | 'password' | 'confirmPassword'
  message: string
}

/**
 * Maps raw Supabase auth errors to user-friendly messages.
 *
 * Centralizes all error mapping that was previously scattered
 * across LoginForm, SignupForm, ForgotPassword, etc.
 */
export function mapAuthError(error: Error, context?: AuthErrorContext): MappedAuthError {
  const msg = error.message

  // Context-specific mappings
  if (context === 'login') {
    if (msg.includes('Invalid login credentials')) {
      return { message: 'Invalid email or password' }
    }
    if (msg.includes('Email not confirmed')) {
      return { message: 'Please confirm your email before logging in' }
    }
  }

  if (context === 'signup') {
    if (msg.includes('User already registered')) {
      return { field: 'email', message: 'An account with this email already exists' }
    }
    if (msg.includes('Password')) {
      return { field: 'password', message: msg }
    }
  }

  if (context === 'update-password') {
    if (msg.includes('New password should be different')) {
      return { message: 'New password must be different from your current password' }
    }
  }

  // Generic mappings (apply to any context)
  if (msg.includes('Auth session missing')) {
    return { message: 'Your session has expired. Please sign in again.' }
  }
  if (msg.includes('rate limit')) {
    return { message: 'Too many requests. Please try again later.' }
  }

  // Fallback: pass through raw message
  return { message: msg }
}
