import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type {
  AuthContextType,
  AuthStatus,
  LegalAcceptanceStatus,
  ProfileStatus,
} from '../types'
import type { Profile } from '../api/profilesApi'
import {
  signInWithPassword,
  AccountDeletionRequestError,
  signUpWithPassword,
  signInWithGoogle as signInWithGoogleApi,
  signOut as signOutApi,
  resetPasswordForEmail,
  updateUserPassword,
  updateUserMetadata as updateUserMetadataApi,
  deleteAccountRequest,
  accountDeletionRequestCanRetry,
  accountDeletionRequestWasCancelled,
  accountDeletionRequiresReauthentication,
  accountDeletionWasDefinitivelyRejected,
  onAuthStateChange,
  getSession,
} from '../api/authApi'
import { getProfile, updateLastLogin, isProfileComplete, updateProfile } from '../api/profilesApi'
import { dismissProfileReminder } from '@/features/notifications/api/notificationsApi'
import SessionExpiredModal from './SessionExpiredModal'
import { AuthContext } from './AuthContext'
import { clearAuthReturnTo } from '../utils/authNavigation'
import {
  cancelPendingAccountDeletion,
  clearDeletedAccountLocalData,
  getPendingAccountDeletionMarkerStatus,
  hasPendingAccountDeletion,
  markPendingAccountDeletionOutcome,
  prepareAccountDeletionLocalData,
  shouldReconcilePendingAccountDeletion,
} from '../utils/accountLocalData'
import {
  acceptCurrentLegalDocuments,
  getCurrentLegalAcceptance,
} from '../api/legalAcceptanceApi'
import { LEGAL_DOCUMENT_VERSIONS } from '../config'
import {
  clearPendingLegalAcceptance,
} from '../utils/legalAcceptanceIntent'
import {
  pauseMessageOutboxForSender,
  quiesceMessageOutboxForSender,
  resumeMessageOutboxForSender,
} from '@/features/messages/offline/messageOutboxDelivery'

interface AuthProviderProps {
  children: ReactNode
}

const LEGAL_REVALIDATE_INTERVAL_MS = 5 * 60 * 1000
const LEGAL_VISIBILITY_REVALIDATE_MIN_AGE_MS = 60 * 1000
const ACCOUNT_DELETION_RETRY_DELAYS_MS = [0, 400, 1200] as const

async function requestAccountDeletionWithRetry(
  accessToken: string,
  expectedUserId: string,
  shouldContinue: () => boolean = () => true,
) {
  let lastError: Error | null = null
  let requestStarted = false
  for (const delayMs of ACCOUNT_DELETION_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise(resolve => window.setTimeout(resolve, delayMs))
    }
    if (!shouldContinue()) {
      return {
        error: new AccountDeletionRequestError(
          'Account deletion stopped because the active session changed.',
          'request_cancelled',
          null,
        ),
        requestStarted,
      }
    }
    requestStarted = true
    const result = await deleteAccountRequest(accessToken, expectedUserId)
    if (!result.error) return { ...result, requestStarted }
    lastError = result.error
    if (!accountDeletionRequestCanRetry(result.error)) {
      return { ...result, requestStarted }
    }
  }
  return {
    error: lastError ?? new Error('Account deletion is pending confirmation.'),
    requestStarted,
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Core auth state
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  // Status states
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking_session')
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('loading')
  const [legalAcceptanceStatus, setLegalAcceptanceStatus] =
    useState<LegalAcceptanceStatus>('loading')
  const authenticatedUserId = user?.id ?? null
  const sessionAccessToken = session?.access_token ?? null

  // Session expiry modal state
  const [sessionExpired, setSessionExpired] = useState(false)

  // Recovery mode: set when PASSWORD_RECOVERY event fires (user arrived via reset link)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [recoveryEpoch, setRecoveryEpoch] = useState(0)
  const [accountDeletionPending, setAccountDeletionPending] = useState(false)

  // Refs to track state inside event listeners without causing re-renders/stale closures
  const isManualSignOut = useRef(false)
  const previousUserRef = useRef<User | null>(null)
  const activeUserIdRef = useRef<string | null>(null)
  const authOwnerRevisionRef = useRef(0)
  const legalRequestIdRef = useRef(0)
  const legalLastValidatedAtRef = useRef(0)
  const profileRequestIdRef = useRef(0)
  const profileUserIdRef = useRef<string | null>(null)

  const isCurrentAuthOwner = useCallback((userId: string, revision: number) => (
    activeUserIdRef.current === userId
    && authOwnerRevisionRef.current === revision
  ), [])

  // Fetch profile for a user — called from a separate effect, NOT from onAuthStateChange
  const fetchProfile = useCallback(async (userId: string, requestId: number) => {
    setProfileStatus('loading')

    try {
      const { profile: fetchedProfile, error } = await getProfile(userId)
      if (
        requestId !== profileRequestIdRef.current
        || activeUserIdRef.current !== userId
      ) return

      if (error) {
        console.error('Failed to fetch profile:', error)
        setProfile(null)
        setProfileStatus('incomplete')
        return
      }

      if (fetchedProfile && fetchedProfile.id !== userId) {
        console.error('Profile response did not belong to the active user.')
        setProfile(null)
        setProfileStatus('loading')
        return
      }

      setProfile(fetchedProfile)

      if (fetchedProfile && isProfileComplete(fetchedProfile)) {
        setProfileStatus('complete')
      } else {
        setProfileStatus('incomplete')
      }
    } catch (err) {
      if (
        requestId !== profileRequestIdRef.current
        || activeUserIdRef.current !== userId
      ) return
      console.error('fetchProfile threw:', err)
      setProfile(null)
      setProfileStatus('incomplete')
    }
  }, [])

  // Refresh profile (callable from outside)
  const refreshProfile = useCallback(async () => {
    if (authenticatedUserId && legalAcceptanceStatus === 'accepted') {
      const requestId = profileRequestIdRef.current + 1
      profileRequestIdRef.current = requestId
      await fetchProfile(authenticatedUserId, requestId)
    }
  }, [authenticatedUserId, fetchProfile, legalAcceptanceStatus])

  // Dismiss session expired modal
  const dismissSessionExpired = useCallback(() => {
    setSessionExpired(false)
  }, [])

  const clearRecoveryMode = useCallback(() => {
    setRecoveryMode(false)
  }, [])

  const resolveLegalAcceptance = useCallback(async (
    expectedUserId: string,
    showLoading = true,
  ) => {
    const requestId = legalRequestIdRef.current + 1
    legalRequestIdRef.current = requestId
    if (showLoading) setLegalAcceptanceStatus('loading')

    const holdApplicationData = () => {
      profileRequestIdRef.current += 1
      profileUserIdRef.current = null
      setProfile(null)
      setProfileStatus('loading')
    }

    const { acceptance, error } = await getCurrentLegalAcceptance()
    if (
      requestId !== legalRequestIdRef.current
      || activeUserIdRef.current !== expectedUserId
    ) return 'stale' as const
    legalLastValidatedAtRef.current = Date.now()

    if (error || !acceptance) {
      console.error('Failed to fetch legal acceptance:', error)
      holdApplicationData()
      setLegalAcceptanceStatus('error')
      return 'error' as const
    }

    const serverVersionsMatch =
      acceptance.termsVersion === LEGAL_DOCUMENT_VERSIONS.terms
      && acceptance.privacyVersion === LEGAL_DOCUMENT_VERSIONS.privacy

    if (!serverVersionsMatch) {
      console.error('Frontend and server legal document versions do not match.')
      holdApplicationData()
      setLegalAcceptanceStatus('error')
      return 'error' as const
    }

    if (acceptance.isAccepted) {
      clearPendingLegalAcceptance()
      setLegalAcceptanceStatus('accepted')
      return 'accepted' as const
    }

    // A pre-auth checkbox is UX confirmation only. It is not durable evidence
    // and can cross an account switch in a shared tab. Every authenticated
    // identity records acceptance explicitly at the post-auth consent gate.
    clearPendingLegalAcceptance()
    holdApplicationData()
    setLegalAcceptanceStatus('required')
    return 'required' as const
  }, [])

  // Effect 1: Bootstrap session + subscribe to auth state changes
  // Only runs once on mount — no dependency on fetchProfile
  useEffect(() => {
    let cancelled = false
    let authEventRevision = 0
    let pendingDeletionReconciliation: {
      key: symbol
      userId: string
      accessToken: string
      ownerRevision: number
      eventRevision: number
      promise: Promise<void>
    } | null = null

    const ownsPendingDeletionReconciliation = (
      userId: string,
      ownerRevision: number,
      eventRevision: number,
    ) => !cancelled
      && authEventRevision === eventRevision
      && isCurrentAuthOwner(userId, ownerRevision)

    const exposePendingDeletionSession = (
      candidateSession: Session,
      ownerRevision: number,
      eventRevision: number,
    ) => {
      const currentUser = candidateSession.user
      if (!ownsPendingDeletionReconciliation(
        currentUser.id,
        ownerRevision,
        eventRevision,
      )) return
      previousUserRef.current = currentUser
      setSession(candidateSession)
      setUser(currentUser)
      setAuthStatus('authenticated')
      setLegalAcceptanceStatus('loading')
      setAccountDeletionPending(true)
      isManualSignOut.current = false
    }

    const restoreRejectedDeletionSession = (
      candidateSession: Session,
      ownerRevision: number,
      eventRevision: number,
    ) => {
      const currentUser = candidateSession.user
      if (!ownsPendingDeletionReconciliation(
        currentUser.id,
        ownerRevision,
        eventRevision,
      )) return
      resumeMessageOutboxForSender(currentUser.id)
      previousUserRef.current = currentUser
      setSession(candidateSession)
      setUser(currentUser)
      setAuthStatus('authenticated')
      setLegalAcceptanceStatus('loading')
      setAccountDeletionPending(false)
      isManualSignOut.current = false
    }

    const clearPendingDeletionSession = () => {
      const outgoingUserId = activeUserIdRef.current
      if (outgoingUserId) {
        pauseMessageOutboxForSender(outgoingUserId)
        void quiesceMessageOutboxForSender(outgoingUserId)
      }
      activeUserIdRef.current = null
      authOwnerRevisionRef.current += 1
      previousUserRef.current = null
      legalRequestIdRef.current += 1
      profileRequestIdRef.current += 1
      profileUserIdRef.current = null
      setSession(null)
      setUser(null)
      setProfile(null)
      setAuthStatus('unauthenticated')
      setProfileStatus('loading')
      setLegalAcceptanceStatus('loading')
      setRecoveryMode(false)
      setAccountDeletionPending(false)
      isManualSignOut.current = false
    }

    const holdPendingDeletionSession = (candidateSession: Session) => {
      const userId = candidateSession.user.id
      const markerStatus = getPendingAccountDeletionMarkerStatus(userId)
      if (!shouldReconcilePendingAccountDeletion(markerStatus)) return false

      pauseMessageOutboxForSender(userId)
      void quiesceMessageOutboxForSender(userId)
      legalRequestIdRef.current += 1
      profileRequestIdRef.current += 1
      profileUserIdRef.current = null
      isManualSignOut.current = true
      setAccountDeletionPending(true)
      setAuthStatus('checking_session')
      setSession(null)
      setUser(null)
      setProfile(null)
      setRecoveryMode(false)

      const ownerRevision = authOwnerRevisionRef.current
      const eventRevision = authEventRevision
      const accessToken = candidateSession.access_token
      const existing = pendingDeletionReconciliation
      if (
        existing
        && existing.userId === userId
        && existing.accessToken === accessToken
        && existing.ownerRevision === ownerRevision
        && existing.eventRevision === eventRevision
      ) return true

      const key = Symbol('pending-account-deletion-reconciliation')
      const promise = (async () => {
          try {
            await prepareAccountDeletionLocalData(userId)
          } catch (error) {
            console.error('Failed to re-block pending-deletion browser data:', error)
            exposePendingDeletionSession(
              candidateSession,
              ownerRevision,
              eventRevision,
            )
            return
          }

          if (!ownsPendingDeletionReconciliation(
            userId,
            ownerRevision,
            eventRevision,
          )) return

          const { error, requestStarted } = await requestAccountDeletionWithRetry(
            accessToken,
            userId,
            () => ownsPendingDeletionReconciliation(
              userId,
              ownerRevision,
              eventRevision,
            ),
          )
          if (!error) {
            markPendingAccountDeletionOutcome(userId, 'accepted')
            try {
              await clearDeletedAccountLocalData(userId)
            } catch (cleanupError) {
              console.error('Failed to purge accepted-deletion browser data:', cleanupError)
              exposePendingDeletionSession(
                candidateSession,
                ownerRevision,
                eventRevision,
              )
              return
            }
            if (!ownsPendingDeletionReconciliation(
              userId,
              ownerRevision,
              eventRevision,
            )) return
            clearPendingDeletionSession()
            await signOutApi(accessToken, userId)
            return
          }

          if (accountDeletionWasDefinitivelyRejected(error)) {
            await cancelPendingAccountDeletion(userId).catch(resetError => {
              console.error('Failed to reset rejected deletion tombstone:', resetError)
            })

            if (!accountDeletionRequiresReauthentication(error)) {
              restoreRejectedDeletionSession(
                candidateSession,
                ownerRevision,
                eventRevision,
              )
              return
            }
          }

          if (accountDeletionRequiresReauthentication(error)) {
            if (!ownsPendingDeletionReconciliation(
              userId,
              ownerRevision,
              eventRevision,
            )) return
            clearPendingDeletionSession()
            await signOutApi(accessToken, userId)
            if (!cancelled) {
              window.location.replace(
                '/?auth=login&returnTo=%2Fapp%2Fsettings&reauth=delete-account#auth',
              )
            }
            return
          }

          // No request was started after the auth owner changed. Keep the
          // pre-existing deletion marker for its rightful account and let a
          // future session for that account reconcile it.
          if (accountDeletionRequestWasCancelled(error) && !requestStarted) return

          // A pre-send network failure and a post-commit response loss are
          // indistinguishable. Keep the tombstone visible/retryable and do not
          // claim success or lock the user out without a 202 acknowledgement.
          markPendingAccountDeletionOutcome(userId, 'ambiguous')
          await clearDeletedAccountLocalData(userId).catch(cleanupError => {
            console.error('Failed to purge ambiguous-deletion browser data:', cleanupError)
          })
          exposePendingDeletionSession(
            candidateSession,
            ownerRevision,
            eventRevision,
          )
        })().finally(() => {
          if (pendingDeletionReconciliation?.key === key) {
            pendingDeletionReconciliation = null
          }
        })
      pendingDeletionReconciliation = {
        key,
        userId,
        accessToken,
        ownerRevision,
        eventRevision,
        promise,
      }
      void promise
      return true
    }

    // 1. Check for an existing session on mount. Any newer auth event wins;
    // otherwise a slow bootstrap response could resurrect a stale user after
    // sign-out/account switching.
    getSession().then(({ session, error }) => {
      if (cancelled || authEventRevision > 0) return

      if (error) {
        setAuthStatus('error')
        return
      }

      const currentUserId = session?.user.id ?? null
      if (activeUserIdRef.current !== currentUserId) {
        authOwnerRevisionRef.current += 1
      }
      activeUserIdRef.current = currentUserId

      if (session?.user && holdPendingDeletionSession(session)) return

      setAccountDeletionPending(false)
      setSession(session)
      setUser(session?.user ?? null)
      previousUserRef.current = session?.user ?? null
      if (session?.user.id) resumeMessageOutboxForSender(session.user.id)

      if (session?.user) {
        setAuthStatus('authenticated')
        setLegalAcceptanceStatus('loading')
      } else {
        setAuthStatus('unauthenticated')
        setProfileStatus('loading')
        setLegalAcceptanceStatus('loading')
      }
    })

    // 2. Subscribe to auth state changes
    // IMPORTANT: Do NOT make Supabase DB queries inside this callback —
    // it causes a deadlock because the client holds an internal lock during auth processing.
    const unsubscribe = onAuthStateChange((event, session) => {
      authEventRevision += 1
      const currentUser = session?.user ?? null
      const currentUserId = currentUser?.id ?? null
      const outgoingUserId = activeUserIdRef.current
      const userChanged = outgoingUserId !== currentUserId

      // Supabase invokes this callback while holding its auth lock, so it must
      // stay synchronous. Close the old sender boundary immediately, then let
      // quiescing finish in the background without issuing auth/DB work here.
      if ((userChanged || event === 'SIGNED_OUT') && outgoingUserId) {
        pauseMessageOutboxForSender(outgoingUserId)
        void quiesceMessageOutboxForSender(outgoingUserId)
      }

      if (userChanged) authOwnerRevisionRef.current += 1
      activeUserIdRef.current = currentUserId

      if (session && currentUser && holdPendingDeletionSession(session)) return

      if (currentUserId && userChanged) {
        resumeMessageOutboxForSender(currentUserId)
      }

      // Update core state
      setSession(session)
      setUser(currentUser)

      if (userChanged) {
        legalRequestIdRef.current += 1
        profileRequestIdRef.current += 1
        setLegalAcceptanceStatus('loading')
        setProfile(null)
        setProfileStatus('loading')
        setAccountDeletionPending(false)
        setRecoveryMode(false)
      }

      if (
        event === 'INITIAL_SESSION'
        || event === 'SIGNED_IN'
        || event === 'TOKEN_REFRESHED'
      ) {
        if (event !== 'TOKEN_REFRESHED' || userChanged) {
          isManualSignOut.current = false
        }

        if (currentUser) {
          setAuthStatus('authenticated')
          previousUserRef.current = currentUser
          if (event === 'SIGNED_IN') setSessionExpired(false)
        } else if (event === 'INITIAL_SESSION') {
          setAuthStatus('unauthenticated')
        }
      }

      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryEpoch(current => current + 1)
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
        setLegalAcceptanceStatus('loading')
        setRecoveryMode(false)
        setAccountDeletionPending(false)
        previousUserRef.current = null
        legalRequestIdRef.current += 1
        clearPendingLegalAcceptance()
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [isCurrentAuthOwner])

  // Effect 2: Resolve legal acceptance outside onAuthStateChange. No profile,
  // billing, or application data is fetched while the authenticated session is
  // still held at the consent gate.
  const legalSessionMarkerRef = useRef<{
    userId: string
    accessToken: string
  } | null>(null)
  useEffect(() => {
    let cancelled = false
    const previousMarker = legalSessionMarkerRef.current
    const markerChanged = authenticatedUserId
      && sessionAccessToken
      && (
        previousMarker?.userId !== authenticatedUserId
        || previousMarker.accessToken !== sessionAccessToken
      )

    if (markerChanged) {
      legalSessionMarkerRef.current = {
        userId: authenticatedUserId,
        accessToken: sessionAccessToken,
      }
      queueMicrotask(() => {
        if (cancelled) return
        void resolveLegalAcceptance(authenticatedUserId, false)
      })
    }

    if (!authenticatedUserId || !sessionAccessToken) {
      legalSessionMarkerRef.current = null
    }

    return () => {
      cancelled = true
    }
  }, [authenticatedUserId, resolveLegalAcceptance, sessionAccessToken])

  // Re-check long-lived sessions without a reload. A server-side version
  // change therefore moves the current SPA to the fail-closed gate within the
  // bounded interval (or immediately when the tab becomes visible again).
  useEffect(() => {
    if (
      authStatus !== 'authenticated'
      || !authenticatedUserId
      || !sessionAccessToken
    ) return

    const revalidateIfDue = () => {
      if (document.visibilityState !== 'visible') return
      if (
        Date.now() - legalLastValidatedAtRef.current
        < LEGAL_VISIBILITY_REVALIDATE_MIN_AGE_MS
      ) return

      void resolveLegalAcceptance(authenticatedUserId, false)
    }

    const interval = window.setInterval(
      revalidateIfDue,
      LEGAL_REVALIDATE_INTERVAL_MS,
    )
    const handleVisibilityChange = () => revalidateIfDue()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [
    authStatus,
    authenticatedUserId,
    resolveLegalAcceptance,
    sessionAccessToken,
  ])

  // Effect 3: Fetch application profile data only after the server confirms
  // the current document versions have been accepted.
  useEffect(() => {
    let cancelled = false
    const userId = authenticatedUserId

    if (
      userId
      && legalAcceptanceStatus === 'accepted'
      && userId !== profileUserIdRef.current
    ) {
      profileUserIdRef.current = userId
      const requestId = profileRequestIdRef.current + 1
      profileRequestIdRef.current = requestId
      queueMicrotask(() => {
        if (cancelled) return
        void fetchProfile(userId, requestId)
        void updateLastLogin()
      })
    }

    if (!userId) {
      profileUserIdRef.current = null
    }

    return () => {
      cancelled = true
    }
  }, [authenticatedUserId, fetchProfile, legalAcceptanceStatus])

  const refreshLegalAcceptance = useCallback(async () => {
    if (!authenticatedUserId) {
      setLegalAcceptanceStatus('loading')
      return
    }
    await resolveLegalAcceptance(authenticatedUserId)
  }, [authenticatedUserId, resolveLegalAcceptance])

  const acceptLegalDocuments = useCallback(async () => {
    if (!authenticatedUserId) {
      return { error: new Error('No authenticated user can accept legal documents.') }
    }

    const requestId = legalRequestIdRef.current + 1
    legalRequestIdRef.current = requestId
    setLegalAcceptanceStatus('loading')

    const { error } = await acceptCurrentLegalDocuments(authenticatedUserId)
    if (requestId !== legalRequestIdRef.current) {
      return { error: new Error('The active legal acceptance request changed.') }
    }

    if (error) {
      setLegalAcceptanceStatus('error')
      return { error }
    }

    clearPendingLegalAcceptance()
    const resolvedStatus = await resolveLegalAcceptance(authenticatedUserId)
    return resolvedStatus === 'accepted'
      ? { error: null }
      : { error: new Error('The server could not verify current legal acceptance.') }
  }, [authenticatedUserId, resolveLegalAcceptance])

  // Auth action wrappers

  const signIn = async (email: string, password: string) => {
    const { error } = await signInWithPassword(email, password)
    return { error: error ? new Error(error.message) : null }
  }

  const signUp = async (email: string, password: string, returnTo?: string) => {
    const { error } = await signUpWithPassword(email, password, returnTo)
    return { error: error ? new Error(error.message) : null }
  }

  const signInWithGoogle = async (returnTo?: string) => {
    const { error } = await signInWithGoogleApi(returnTo)
    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    const outgoingUserId = session?.user.id ?? null
    const accessToken = session?.access_token ?? null
    const ownerRevision = authOwnerRevisionRef.current
    // A component from the previous account can retain this function after an
    // auth event has synchronously transferred the shared client to a new
    // account. Bind the action to the user rendered with that component; never
    // reinterpret an old A action as a request to sign B out.
    if (
      !outgoingUserId
      || !accessToken
      || user?.id !== outgoingUserId
      || !isCurrentAuthOwner(outgoingUserId, ownerRevision)
    ) {
      return { error: null }
    }

    // 1. Flag this as a manual action so the listener doesn't trigger the modal
    isManualSignOut.current = true
    try {
      pauseMessageOutboxForSender(outgoingUserId)
      await quiesceMessageOutboxForSender(outgoingUserId)
      // A newer SIGNED_IN event owns the shared Supabase client now. Never let
      // this stale continuation clear or sign out that replacement account.
      if (!isCurrentAuthOwner(outgoingUserId, ownerRevision)) {
        return { error: null }
      }
    } catch (error) {
      if (isCurrentAuthOwner(outgoingUserId, ownerRevision)) {
        resumeMessageOutboxForSender(outgoingUserId)
        isManualSignOut.current = false
      }
      return {
        error: error instanceof Error
          ? error
          : new Error('Could not safely stop pending account activity.'),
      }
    }

    let signOutResult: Awaited<ReturnType<typeof signOutApi>>
    try {
      signOutResult = await signOutApi(accessToken, outgoingUserId)
    } catch (error) {
      if (isCurrentAuthOwner(outgoingUserId, ownerRevision)) {
        resumeMessageOutboxForSender(outgoingUserId)
        isManualSignOut.current = false
      }
      return {
        error: error instanceof Error
          ? error
          : new Error('Sign-out failed unexpectedly.'),
      }
    }
    const {
      error: signOutError,
      persistedSessionStatus,
    } = signOutResult
    if (!isCurrentAuthOwner(outgoingUserId, ownerRevision)) {
      return { error: signOutError ? new Error(signOutError.message) : null }
    }

    if (
      persistedSessionStatus === 'different'
      || persistedSessionStatus === 'unavailable'
    ) {
      resumeMessageOutboxForSender(outgoingUserId)
      isManualSignOut.current = false
      return {
        error: signOutError
          ? new Error(signOutError.message)
          : new Error('The active stored session changed before sign-out completed.'),
      }
    }

    legalRequestIdRef.current += 1
    profileRequestIdRef.current += 1
    activeUserIdRef.current = null
    authOwnerRevisionRef.current += 1
    profileUserIdRef.current = null

    // 2. Optimistic UI update
    setUser(null)
    setSession(null)
    setProfile(null)
    setAuthStatus('unauthenticated')
    setLegalAcceptanceStatus('loading')
    setRecoveryMode(false)
    setAccountDeletionPending(false)
    previousUserRef.current = null
    clearAuthReturnTo()
    clearPendingLegalAcceptance()
    isManualSignOut.current = false

    return { error: signOutError ? new Error(signOutError.message) : null }
  }

  const resetPassword = async (email: string) => {
    const { error } = await resetPasswordForEmail(email)
    return { error: error ? new Error(error.message) : null }
  }

  const updatePassword = async (newPassword: string) => {
    const requestedUserId = session?.user.id ?? null
    const accessToken = session?.access_token ?? null
    const ownerRevision = authOwnerRevisionRef.current
    if (
      !requestedUserId
      || !accessToken
      || user?.id !== requestedUserId
      || !isCurrentAuthOwner(requestedUserId, ownerRevision)
    ) {
      return { error: new Error('No authenticated user to update.') }
    }
    const { error, persistedSessionStatus } = await updateUserPassword(
      accessToken,
      requestedUserId,
      newPassword,
    )
    if (!isCurrentAuthOwner(requestedUserId, ownerRevision)) {
      return { error: new Error('The active session changed before the password update completed.') }
    }
    if (persistedSessionStatus === 'different') {
      return { error: new Error('The active session changed before the password update completed.') }
    }
    if (persistedSessionStatus === 'unavailable' && !error) {
      console.error('Password changed, but the local Auth session could not be refreshed.')
    }
    return { error: error ? new Error(error.message) : null }
  }

  const updateUser = async (updates: Partial<Pick<Profile, 'username' | 'name' | 'photo_url'>>) => {
    const requestedUserId = user?.id ?? null
    const ownerRevision = authOwnerRevisionRef.current
    if (
      !requestedUserId
      || !isCurrentAuthOwner(requestedUserId, ownerRevision)
    ) {
      return { error: new Error('No authenticated user to update.') }
    }
    const { profile: updatedProfile, error } = await updateProfile(requestedUserId, updates)
    if (!isCurrentAuthOwner(requestedUserId, ownerRevision)) {
      return { error: new Error('The active session changed before the profile update completed.') }
    }
    if (updatedProfile && updatedProfile.id !== requestedUserId) {
      return { error: new Error('The profile update returned data for a different account.') }
    }
    if (
      updatedProfile
      && updatedProfile.id === requestedUserId
    ) {
      setProfile(updatedProfile)
      const profileComplete = isProfileComplete(updatedProfile)
      setProfileStatus(profileComplete ? 'complete' : 'incomplete')

      if (profileComplete) {
        const { error: reminderError } = await dismissProfileReminder(requestedUserId)
        if (!isCurrentAuthOwner(requestedUserId, ownerRevision)) {
          return { error: new Error('The active session changed before the profile update completed.') }
        }
        if (reminderError) {
          console.error('Failed to remove profile completion reminder:', reminderError)
        }
      }
    }
    return { error: error ? new Error(error.message) : null }
  }

  const updateUserMetadata = async (updates: Partial<User["user_metadata"]>) => {
    const requestedUserId = session?.user.id ?? null
    const accessToken = session?.access_token ?? null
    const ownerRevision = authOwnerRevisionRef.current
    if (
      !requestedUserId
      || !accessToken
      || user?.id !== requestedUserId
      || !isCurrentAuthOwner(requestedUserId, ownerRevision)
    ) {
      return { error: new Error("No authenticated user to update metadata.") }
    }
    const {
      user: updatedUser,
      error,
      persistedSessionStatus,
    } = await updateUserMetadataApi(
      accessToken,
      requestedUserId,
      updates,
    )
    if (!isCurrentAuthOwner(requestedUserId, ownerRevision)) {
      return { error: new Error('The active session changed before the metadata update completed.') }
    }
    if (persistedSessionStatus === 'different') {
      return { error: new Error('The active session changed before the metadata update completed.') }
    }
    if (persistedSessionStatus === 'unavailable' && !error) {
      console.error('Metadata changed, but the local Auth session could not be refreshed.')
    }
    if (updatedUser && updatedUser.id !== requestedUserId) {
      return { error: new Error('The metadata update returned data for a different account.') }
    }
    if (
      updatedUser?.id === requestedUserId
    ) {
      setUser(updatedUser)
    }
    return { error: error ? new Error(error.message) : null }
  }

  const deleteAccount = async () => {
    if (!session?.access_token) {
      return { error: new Error('No active session') }
    }

    const userId = session.user.id
    const accessToken = session.access_token
    const ownerRevision = authOwnerRevisionRef.current
    if (!isCurrentAuthOwner(userId, ownerRevision)) {
      return { error: new Error('The active session changed before deletion could start.') }
    }

    // Persist the per-user deletion tombstone and stop queued sends before the
    // HTTP request. Recoverable rows stay intact until a 202 or ambiguous
    // response, so a definitive stale-auth rejection cannot destroy data.
    isManualSignOut.current = true
    pauseMessageOutboxForSender(userId)

    try {
      try {
        await prepareAccountDeletionLocalData(userId)
        if (isCurrentAuthOwner(userId, ownerRevision)) {
          setAccountDeletionPending(true)
        }
      } catch (cleanupError) {
        await cancelPendingAccountDeletion(userId).catch(() => undefined)
        if (isCurrentAuthOwner(userId, ownerRevision)) {
          resumeMessageOutboxForSender(userId)
          setAccountDeletionPending(false)
          isManualSignOut.current = false
        }
        console.error('Failed to prepare local account-deletion cleanup:', cleanupError)
        return { error: new Error('Could not safely prepare this device for account deletion.') }
      }

      const deletionResult = await requestAccountDeletionWithRetry(
        accessToken,
        userId,
        () => isCurrentAuthOwner(userId, ownerRevision),
      )
      const { error: deleteError } = deletionResult

      if (deleteError) {
        if (
          accountDeletionRequestWasCancelled(deleteError)
          && !deletionResult.requestStarted
        ) {
          await cancelPendingAccountDeletion(userId).catch(() => undefined)
          if (isCurrentAuthOwner(userId, ownerRevision)) {
            resumeMessageOutboxForSender(userId)
            setAccountDeletionPending(false)
            isManualSignOut.current = false
          }
          return { error: deleteError }
        }

        if (accountDeletionWasDefinitivelyRejected(deleteError)) {
          try {
            await cancelPendingAccountDeletion(userId)
          } catch (resetError) {
            console.error('Failed to reset rejected deletion tombstone:', resetError)
            if (isCurrentAuthOwner(userId, ownerRevision)) await signOut()
            return { error: deleteError }
          }

          if (
            accountDeletionRequiresReauthentication(deleteError)
            && isCurrentAuthOwner(userId, ownerRevision)
          ) {
            await signOut()
          } else if (isCurrentAuthOwner(userId, ownerRevision)) {
            resumeMessageOutboxForSender(userId)
            setAccountDeletionPending(false)
            isManualSignOut.current = false
          }
          return { error: deleteError }
        }

        if (
          accountDeletionRequiresReauthentication(deleteError)
          && isCurrentAuthOwner(userId, ownerRevision)
        ) {
          await signOut()
          return { error: deleteError }
        }

        // A pre-send failure and post-commit response loss look identical.
        // Keep this session visibly pending and retryable until the endpoint
        // acknowledges the durable job with 202; never report false success.
        markPendingAccountDeletionOutcome(userId, 'ambiguous')
        await clearDeletedAccountLocalData(userId).catch(cleanupError => {
          console.error('Failed to purge ambiguous-deletion browser data:', cleanupError)
        })
        if (isCurrentAuthOwner(userId, ownerRevision)) {
          isManualSignOut.current = false
          setAccountDeletionPending(true)
        }
        return { error: deleteError }
      }

      try {
        markPendingAccountDeletionOutcome(userId, 'accepted')
        await clearDeletedAccountLocalData(userId)
      } catch (cleanupError) {
        if (isCurrentAuthOwner(userId, ownerRevision)) {
          isManualSignOut.current = false
          setAccountDeletionPending(true)
        }
        console.error('Failed to purge accepted-deletion browser data:', cleanupError)
        return { error: new Error('Account deletion is accepted, but this device still needs cleanup.') }
      }
      if (isCurrentAuthOwner(userId, ownerRevision)) await signOut()

      return { error: null }
    } catch (err) {
      if (isCurrentAuthOwner(userId, ownerRevision)) {
        if (hasPendingAccountDeletion(userId)) {
          setAccountDeletionPending(true)
          isManualSignOut.current = false
        } else {
          resumeMessageOutboxForSender(userId)
          isManualSignOut.current = false
        }
      }
      return { error: err instanceof Error ? err : new Error('Failed to delete account') }
    }
  }

  const value: AuthContextType = {
    user,
    session,
    profile: profile && profile.id !== user?.id ? null : profile,
    authStatus,
    profileStatus: profile && profile.id !== user?.id ? 'loading' : profileStatus,
    legalAcceptanceStatus,
    loading: authStatus === 'checking_session',
    sessionExpired,
    recoveryMode,
    recoveryEpoch,
    accountDeletionPending,
    clearRecoveryMode,
    dismissSessionExpired,
    refreshProfile,
    refreshLegalAcceptance,
    acceptLegalDocuments,
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
