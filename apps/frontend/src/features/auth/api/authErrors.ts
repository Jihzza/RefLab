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
      return { message: 'Email ou palavra-passe inválidos.' }
    }
    if (msg.includes('Email not confirmed')) {
      return { message: 'Confirma o teu email antes de iniciares sessão.' }
    }
  }

  if (context === 'signup') {
    if (msg.includes('User already registered')) {
      // Do not turn the public registration form into an account-enumeration
      // oracle. Supabase may already obscure duplicate sign-ups depending on
      // Auth configuration, but the client must remain safe if it returns this
      // explicit error.
      return { message: 'Não foi possível concluir o registo. Verifica os dados ou tenta iniciar sessão.' }
    }
    if (msg.includes('Password')) {
      return { field: 'password', message: msg }
    }
  }

  if (context === 'update-password') {
    if (msg.includes('New password should be different')) {
      return { message: 'A nova palavra-passe deve ser diferente da atual.' }
    }
  }

  // Generic mappings (apply to any context)
  if (msg.includes('Auth session missing')) {
    return { message: 'A tua sessão expirou. Inicia sessão novamente.' }
  }
  if (msg.includes('rate limit')) {
    return { message: 'Demasiados pedidos. Tenta novamente mais tarde.' }
  }

  // Never expose unexpected provider, database or Edge Function details in a
  // public authentication surface. Operators retain the original error in the
  // provider logs used for incident diagnosis.
  return { message: 'Não foi possível concluir o pedido. Tenta novamente.' }
}
