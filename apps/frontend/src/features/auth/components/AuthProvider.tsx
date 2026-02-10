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
  const isManualSignOut = useRef(false)
  const previousUserRef = useRef<User | null>(null)

  // Fetch profile for a user — called from a separate effect, NOT from onAuthStateChange
  const fetchProfile = useCallback(async (userId: string) => {
    setProfileStatus('loading')

    try {
      const { profile: fetchedProfile, error } = await getProfile(userId)

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
      console.error('fetchProfile threw:', err)
      setProfile(null)
      setProfileStatus('incomplete')
    }
  }, [])

  // Refresh profile (callable from outside)
  const refreshProfile = useCallback(async () => {
    if (user && user.id) {
      await fetchProfile(user.id)
    }
  }, [user, fetchProfile])

  // Dismiss session expired modal
  const dismissSessionExpired = useCallback(() => {
    setSessionExpired(false)
  }, [])

  // Effect 1: Bootstrap session + subscribe to auth state changes
  // Only runs once on mount — no dependency on fetchProfile
  useEffect(() => {
    // 1. Check for existing session on mount
    getSession().then(({ session }) => {
      setSession(session)
      setUser(session?.user ?? null)
      previousUserRef.current = session?.user ?? null

      if (session?.user) {
        setAuthStatus('authenticated')
      } else {
        setAuthStatus('unauthenticated')
        setProfileStatus('loading')
      }
    })

    // 2. Subscribe to auth state changes
    // IMPORTANT: Do NOT make Supabase DB queries inside this callback —
    // it causes a deadlock because the client holds an internal lock during auth processing.
    const unsubscribe = onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null

      // Update core state
      setSession(session)
      setUser(currentUser)

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        isManualSignOut.current = false

        if (currentUser) {
          setAuthStatus('authenticated')
          previousUserRef.current = currentUser
        }
      }

      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
        if (currentUser) {
          setAuthStatus('authenticated')
        }
      }

      if (event === 'SIGNED_OUT') {
        if (previousUserRef.current && !isManualSignOut.current) {
          setSessionExpired(true)
        }

        setAuthStatus('unauthenticated')
        setProfile(null)
        setProfileStatus('loading')
        setRecoveryMode(false)
        previousUserRef.current = null
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Effect 2: Fetch profile whenever the user changes (separate from auth listener)
  // This avoids the Supabase deadlock by running the DB query outside onAuthStateChange.
  const prevUserIdRef = useRef<string | null>(null)
  useEffect(() => {
    const userId = user?.id ?? null

    if (userId && userId !== prevUserIdRef.current) {
      prevUserIdRef.current = userId
      fetchProfile(userId)
      updateLastLogin(userId)
    }

    if (!userId) {
      prevUserIdRef.current = null
    }
  }, [user, fetchProfile])

  // Auth action wrappers

  const signIn = async (email: string, password: string) => {
    const { error } = await signInWithPassword(email, password)
    return { error: error ? new Error(error.message) : null }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await signUpWithPassword(email, password)
    return { error: error ? new Error(error.message) : null }
  }

  const signInWithGoogle = async () => {
    const { error } = await signInWithGoogleApi()
    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    // 1. Flag this as a manual action so the listener doesn't trigger the modal
    isManualSignOut.current = true

    // 2. Optimistic UI update
    setUser(null)
    setSession(null)
    setProfile(null)
    setAuthStatus('unauthenticated')
    previousUserRef.current = null

    // 3. Perform API call
    const { error } = await signOutApi()

    // 4. Reset flag after a delay (safety net)
    setTimeout(() => { isManualSignOut.current = false }, 1000)

    return { error: error ? new Error(error.message) : null }
  }

  const resetPassword = async (email: string) => {
    const { error } = await resetPasswordForEmail(email)
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
    const { profile: updatedProfile, error } = await updateProfile(user.id, updates)
    if (updatedProfile) {
      setProfile(updatedProfile)
    }
    return { error: error ? new Error(error.message) : null }
  }

  const updateUserMetadata = async (updates: Partial<User["user_metadata"]>) => {
    if (!user) {
      return { error: new Error("No authenticated user to update metadata.") }
    }
    const { user: updatedUser, error } = await updateUserMetadataApi(updates)
    // Optimistically update the local user state
    if (updatedUser) {
      setUser(updatedUser)
    }
    return { error: error ? new Error(error.message) : null }
  }

  const deleteAccount = async () => {
    if (!session?.access_token) {
      return { error: new Error('No active session') }
    }

    // Flag as manual sign out to prevent session expiry modal
    isManualSignOut.current = true

    try {
      const { error: deleteError } = await deleteAccountRequest()

      if (deleteError) {
        isManualSignOut.current = false
        return { error: new Error(deleteError.message || 'Failed to delete account') }
      }

      // Clear local state (the user no longer exists)
      setUser(null)
      setSession(null)
      setProfile(null)
      setAuthStatus('unauthenticated')
      setRecoveryMode(false)
      previousUserRef.current = null

      // Sign out locally to clear stored session
      await signOutApi()

      return { error: null }
    } catch (err) {
      isManualSignOut.current = false
      return { error: err instanceof Error ? err : new Error('Failed to delete account') }
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
