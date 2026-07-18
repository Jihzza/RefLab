import type { Session, User } from '@supabase/supabase-js'
import type { Profile } from './api/profilesApi'

// Auth status states
export type AuthStatus = 'checking_session' | 'authenticated' | 'unauthenticated' | 'error'

// Current Terms/Privacy gate. A session is not enough to enter /app until the
// server confirms acceptance of the exact configured document versions.
export type LegalAcceptanceStatus = 'loading' | 'required' | 'accepted' | 'error'

// Profile/onboarding status states
// - loading: fetching profile data
// - incomplete: username not customized OR name not set
// - complete: profile fully set up
export type ProfileStatus = 'loading' | 'incomplete' | 'complete'

// The shape of our auth context - what any component can access via useAuth()
export interface AuthContextType {
  // The current user object (null if not logged in)
  user: User | null

  // The current session (null if not logged in)
  session: Session | null

  // The current user's profile from profiles table
  profile: Profile | null

  // Auth status (replaces simple loading boolean)
  authStatus: AuthStatus

  // Profile onboarding status
  profileStatus: ProfileStatus

  // Versioned Terms/Privacy acceptance gate
  legalAcceptanceStatus: LegalAcceptanceStatus

  // True while we're checking for existing session (convenience getter)
  loading: boolean

  // True if session expired mid-use (for modal display)
  sessionExpired: boolean

  // True when PASSWORD_RECOVERY event fires (user arrived via reset link)
  recoveryMode: boolean

  // Monotonic owner-bound epoch for PASSWORD_RECOVERY events. Public recovery
  // forms use it to discard secrets and async state from an older reset flow.
  recoveryEpoch: number

  // A local deletion tombstone exists but the durable server job has not yet
  // been acknowledged. Writes stay locally blocked and the user can retry.
  accountDeletionPending: boolean

  // Clears PASSWORD_RECOVERY state after a successful password update
  clearRecoveryMode: () => void

  // Dismiss the session expired modal
  dismissSessionExpired: () => void

  // Refresh profile data (after username is set)
  refreshProfile: () => Promise<void>

  // Re-check server acceptance and record the current versions from the
  // explicit authenticated consent gate.
  refreshLegalAcceptance: () => Promise<void>
  acceptLegalDocuments: () => Promise<{ error: Error | null }>

  // Auth actions
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, returnTo?: string) => Promise<{ error: Error | null }>
  signInWithGoogle: (returnTo?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>
  updateUser: (updates: Partial<Pick<Profile, 'username' | 'name' | 'photo_url'>>) => Promise<{ error: Error | null }>
  updateUserMetadata: (updates: Partial<User["user_metadata"]>) => Promise<{ error: Error | null }>
  deleteAccount: () => Promise<{ error: Error | null }>
}

// Types for auth form state (used by LoginForm, SignupForm, etc.)
export interface AuthFormState {
  email: string
  password: string
  confirmPassword?: string // Only for signup
}

// Types for form errors (field-specific errors as you requested)
export interface AuthFormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  legal?: string
  general?: string // For errors not tied to a specific field
}
