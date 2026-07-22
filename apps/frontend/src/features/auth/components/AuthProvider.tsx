import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { AuthContextType, AuthStatus, ProfileStatus } from '../types'
import type { Profile } from '../api/profilesApi'
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle as signInWithGoogleApi,
  signOut as signOutApi,
  resetPasswordForEmail,
  updateUserPassword,
  updateUserMetadata as updateUserMetadataApi,
  deleteAccountRequest,
  onAuthStateChange,
  getSession,
} from '../api/authApi'
import { getProfile, updateLastLogin, isProfileComplete, updateProfile } from '../api/profilesApi'
import SessionExpiredModal from './SessionExpiredModal'
import { AuthContext } from './AuthContext'

interface AuthProviderProps {
  children: ReactNode
}

interface AuthIdentitySnapshot {
  generation: number
  userId: string
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Core auth state
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  // Status states
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking_session')
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('loading')

  // Session expiry modal state
  const [sessionExpired, setSessionExpired] = useState(false)

  // Recovery mode: set when PASSWORD_RECOVERY event fires (user arrived via reset link)
  const [recoveryMode, setRecoveryMode] = useState(false)

  // Refs to track state inside event listeners without causing re-renders/stale closures
  const manualSignOutGenerationRef = useRef<number | null>(null)
  const previousUserRef = useRef<User | null>(null)

  // Every authenticated identity transition invalidates work started by the
  // previous identity. The generation is important when the same user signs
  // out and signs back in while an older request is still in flight.
  const authGenerationRef = useRef(0)
  const activeUserIdRef = useRef<string | null>(null)

  const transitionIdentity = useCallback((nextUserId: string | null) => {
    if (activeUserIdRef.current === nextUserId) return false

    activeUserIdRef.current = nextUserId
    authGenerationRef.current += 1

    // Never render profile data from the previous identity while the next
    // profile is being loaded.
    setProfile(null)
    setProfileStatus('loading')
    return true
  }, [])

  const captureIdentity = useCallback((userId: string): AuthIdentitySnapshot | null => {
    if (activeUserIdRef.current !== userId) return null

    return {
      generation: authGenerationRef.current,
      userId,
    }
  }, [])

  const isCurrentIdentity = useCallback((snapshot: AuthIdentitySnapshot) => (
    activeUserIdRef.current === snapshot.userId &&
    authGenerationRef.current === snapshot.generation
  ), [])

  const clearLocalAuthState = useCallback(() => {
    transitionIdentity(null)
    setUser(null)
    setSession(null)
    setProfile(null)
    setAuthStatus('unauthenticated')
    setProfileStatus('loading')
    setRecoveryMode(false)
    previousUserRef.current = null
  }, [transitionIdentity])

  // Fetch profile for a user — called from a separate effect, NOT from onAuthStateChange
  const fetchProfile = useCallback(async (identity: AuthIdentitySnapshot) => {
    if (!isCurrentIdentity(identity)) return

    setProfileStatus('loading')

    try {
      const { profile: fetchedProfile, error } = await getProfile(identity.userId)

      if (!isCurrentIdentity(identity)) return

      if (error) {
        console.error('Failed to fetch profile:', error)
        setProfile(null)
        setProfileStatus('incomplete')
        return
      }

      setProfile(fetchedProfile)

      if (fetchedProfile && isProfileComplete(fetchedProfile)) {
        setProfileStatus('complete')
      } else {
        setProfileStatus('incomplete')
      }
    } catch (err) {
      if (!isCurrentIdentity(identity)) return

      console.error('fetchProfile threw:', err)
      setProfile(null)
      setProfileStatus('incomplete')
    }
  }, [isCurrentIdentity])

  // Refresh profile (callable from outside)
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return

    const identity = captureIdentity(user.id)
    if (identity) await fetchProfile(identity)
  }, [user, captureIdentity, fetchProfile])

  // Dismiss session expired modal
  const dismissSessionExpired = useCallback(() => {
    setSessionExpired(false)
  }, [])

  // Effect 1: Bootstrap session + subscribe to auth state changes
  // Only runs once on mount — no dependency on fetchProfile
  useEffect(() => {
    let disposed = false
    const bootstrapGeneration = authGenerationRef.current

    // 1. Check for existing session on mount
    void getSession()
      .then(({ session: initialSession, error }) => {
        // An auth event may have already established a newer identity while
        // getSession was resolving. Never let the bootstrap overwrite it.
        if (disposed || authGenerationRef.current !== bootstrapGeneration) return

        if (error) {
          setAuthStatus('error')
          return
        }

        const initialUser = initialSession?.user ?? null
        transitionIdentity(initialUser?.id ?? null)
        setSession(initialSession)
        setUser(initialUser)
        previousUserRef.current = initialUser
        setAuthStatus(initialUser ? 'authenticated' : 'unauthenticated')
      })
      .catch((error: unknown) => {
        if (disposed || authGenerationRef.current !== bootstrapGeneration) return
        console.error('Failed to restore auth session:', error)
        setAuthStatus('error')
      })

    // 2. Subscribe to auth state changes
    // IMPORTANT: Do NOT make Supabase DB queries inside this callback —
    // it causes a deadlock because the client holds an internal lock during auth processing.
    const unsubscribe = onAuthStateChange((event, nextSession) => {
      if (disposed) return

      const currentUser = nextSession?.user ?? null
      const previousUser = previousUserRef.current
      const eventGeneration = authGenerationRef.current
      const wasManualSignOut = manualSignOutGenerationRef.current === eventGeneration

      transitionIdentity(currentUser?.id ?? null)
      setSession(nextSession)
      setUser(currentUser)

      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        if (currentUser) {
          setAuthStatus('authenticated')
          previousUserRef.current = currentUser
        } else if (event === 'INITIAL_SESSION') {
          setAuthStatus('unauthenticated')
        }
      }

      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
        if (currentUser) {
          setAuthStatus('authenticated')
        }
      }

      if (event === 'SIGNED_OUT') {
        if (wasManualSignOut) {
          manualSignOutGenerationRef.current = null
        }

        if (previousUser && !wasManualSignOut) {
          setSessionExpired(true)
        }

        clearLocalAuthState()
      }
    })

    return () => {
      disposed = true
      authGenerationRef.current += 1
      unsubscribe()
    }
  }, [clearLocalAuthState, transitionIdentity])

  // Effect 2: Fetch profile whenever the user changes (separate from auth listener)
  // This avoids the Supabase deadlock by running the DB query outside onAuthStateChange.
  const previousProfileIdentityRef = useRef<AuthIdentitySnapshot | null>(null)
  useEffect(() => {
    const userId = user?.id ?? null

    if (!userId) {
      previousProfileIdentityRef.current = null
      return
    }

    const identity = captureIdentity(userId)
    if (!identity) return

    const previousIdentity = previousProfileIdentityRef.current
    if (
      previousIdentity?.userId === identity.userId &&
      previousIdentity.generation === identity.generation
    ) {
      return
    }

    previousProfileIdentityRef.current = identity
    void fetchProfile(identity)
    void updateLastLogin(userId)
  }, [user, captureIdentity, fetchProfile])

  // Auth action wrappers

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    const { error } = await signInWithPassword(email, password, captchaToken)
    return { error: error ? new Error(error.message) : null }
  }

  const signUp = async (email: string, password: string, captchaToken?: string) => {
    const { data, error } = await signUpWithPassword(email, password, captchaToken)
    return {
      error: error ? new Error(error.message) : null,
      requiresEmailConfirmation: !error && data.session === null,
    }
  }

  const signInWithGoogle = async () => {
    const { error } = await signInWithGoogleApi()
    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    const expectedUserId = activeUserIdRef.current
    const expectedGeneration = authGenerationRef.current

    // Flag this as a manual action so a genuine SIGNED_OUT event from this
    // request does not show the session-expired modal.
    manualSignOutGenerationRef.current = expectedGeneration

    try {
      const { error } = await signOutApi()

      // Supabase normally emits SIGNED_OUT and the listener clears state. This
      // guarded fallback covers implementations that resolve successfully
      // without an event, while never clearing a newer user's session.
      if (
        !error &&
        activeUserIdRef.current === expectedUserId &&
        authGenerationRef.current === expectedGeneration
      ) {
        clearLocalAuthState()
      }

      // Do not pretend the server-side revocation succeeded. If Supabase
      // removed the local session while returning an error, SIGNED_OUT already
      // reconciled the local state and the error is still returned to the UI.
      return { error: error ? new Error(error.message) : null }
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Failed to sign out'),
      }
    } finally {
      if (manualSignOutGenerationRef.current === expectedGeneration) {
        manualSignOutGenerationRef.current = null
      }
    }
  }

  const resetPassword = async (email: string, captchaToken?: string) => {
    const { error } = await resetPasswordForEmail(email, captchaToken)
    return { error: error ? new Error(error.message) : null }
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await updateUserPassword(newPassword)
    return { error: error ? new Error(error.message) : null }
  }

  const updateUser = async (updates: Partial<Pick<Profile, 'username' | 'name' | 'photo_url'>>) => {
    if (!user?.id) {
      return { error: new Error('No authenticated user to update.') }
    }

    const identity = captureIdentity(user.id)
    if (!identity) {
      return { error: new Error('Authenticated user changed before update.') }
    }

    const { profile: updatedProfile, error } = await updateProfile(identity.userId, updates)
    if (updatedProfile && isCurrentIdentity(identity)) {
      setProfile(updatedProfile)
    }
    return { error: error ? new Error(error.message) : null }
  }

  const updateUserMetadata = async (updates: Partial<User["user_metadata"]>) => {
    if (!user) {
      return { error: new Error("No authenticated user to update metadata.") }
    }

    const identity = captureIdentity(user.id)
    if (!identity) {
      return { error: new Error('Authenticated user changed before metadata update.') }
    }

    const { user: updatedUser, error } = await updateUserMetadataApi(updates)
    if (
      updatedUser?.id === identity.userId &&
      isCurrentIdentity(identity)
    ) {
      setUser(updatedUser)
    }
    return { error: error ? new Error(error.message) : null }
  }

  const deleteAccount = async () => {
    if (!session?.access_token || !user?.id || session.user.id !== user.id) {
      return { error: new Error('No active session') }
    }

    // Bind this destructive request to the exact identity snapshot checked
    // above. Re-reading the global Supabase session after an await could send a
    // newer user's bearer token if another tab changes the session mid-flight.
    const accessToken = session.access_token
    const identity = captureIdentity(user.id)
    if (!identity) {
      return { error: new Error('Authenticated user changed before deletion.') }
    }

    manualSignOutGenerationRef.current = identity.generation

    try {
      const { error: deleteError } = await deleteAccountRequest(accessToken)

      if (deleteError) {
        return { error: new Error(deleteError.message || 'Failed to delete account') }
      }

      // The deletion belongs to an older identity if the user changed while
      // the request was in flight. Never sign out or clear that newer session.
      if (!isCurrentIdentity(identity)) {
        return { error: null }
      }

      // The account no longer exists, so clear its persisted session. The auth
      // listener normally performs the local transition; the guarded fallback
      // handles a missing event without touching a newer identity.
      await signOutApi()

      if (isCurrentIdentity(identity)) {
        clearLocalAuthState()
      }

      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to delete account') }
    } finally {
      if (manualSignOutGenerationRef.current === identity.generation) {
        manualSignOutGenerationRef.current = null
      }
    }
  }

  const value: AuthContextType = {
    user,
    session,
    profile,
    authStatus,
    profileStatus,
    loading: authStatus === 'checking_session',
    sessionExpired,
    recoveryMode,
    dismissSessionExpired,
    refreshProfile,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateUser,
    updateUserMetadata,
    deleteAccount,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionExpiredModal
        isOpen={sessionExpired}
        onClose={dismissSessionExpired}
      />
    </AuthContext.Provider>
  )
}
