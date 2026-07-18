// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import type { Session, User } from '@supabase/supabase-js'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profile } from '../api/profilesApi'
import type { AuthContextType } from '../types'
import {
  AccountDeletionRequestError,
  type AccountDeletionRequestErrorCode,
} from '../api/authApi'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'

const ACCOUNT_A = 'auth-boundary-account-a'
const ACCOUNT_B = 'auth-boundary-account-b'
const TOKEN_A = 'access-token-account-a'
const TOKEN_B = 'access-token-account-b'

type AuthStateCallback = (event: string, session: Session | null) => void

const mocks = vi.hoisted(() => ({
  authCallback: null as AuthStateCallback | null,
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUserPassword: vi.fn(),
  updateUserMetadata: vi.fn(),
  deleteAccountRequest: vi.fn(),
  unsubscribe: vi.fn(),

  getProfile: vi.fn(),
  updateLastLogin: vi.fn(),
  updateProfile: vi.fn(),
  dismissProfileReminder: vi.fn(),

  getPendingMarkerStatus: vi.fn(),
  prepareAccountDeletionLocalData: vi.fn(),
  cancelPendingAccountDeletion: vi.fn(),
  clearDeletedAccountLocalData: vi.fn(),
  markPendingAccountDeletionOutcome: vi.fn(),

  getCurrentLegalAcceptance: vi.fn(),
  acceptCurrentLegalDocuments: vi.fn(),
  clearPendingLegalAcceptance: vi.fn(),
  clearAuthReturnTo: vi.fn(),

  pauseMessageOutboxForSender: vi.fn(),
  quiesceMessageOutboxForSender: vi.fn(),
  resumeMessageOutboxForSender: vi.fn(),
}))

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { auth: {} },
  supabaseBrowserConfiguration: {
    url: 'https://auth-provider-test.supabase.co',
    anonKey: 'public-test-key',
    productionBackendIsolated: false,
    authStorageKey: 'sb-auth-provider-test-auth-token',
  },
  withSupabaseAuthStorageLock: async (operation: () => unknown) => operation(),
}))

vi.mock('../api/authApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/authApi')>()
  return {
    ...actual,
    signInWithPassword: mocks.signInWithPassword,
    signUpWithPassword: mocks.signUpWithPassword,
    signInWithGoogle: mocks.signInWithGoogle,
    signOut: mocks.signOut,
    resetPasswordForEmail: mocks.resetPasswordForEmail,
    updateUserPassword: mocks.updateUserPassword,
    updateUserMetadata: mocks.updateUserMetadata,
    deleteAccountRequest: mocks.deleteAccountRequest,
    getSession: mocks.getSession,
    onAuthStateChange: (callback: AuthStateCallback) => {
      mocks.authCallback = callback
      return mocks.unsubscribe
    },
  }
})

vi.mock('../api/profilesApi', () => ({
  getProfile: mocks.getProfile,
  updateLastLogin: mocks.updateLastLogin,
  updateProfile: mocks.updateProfile,
  isProfileComplete: (profile: Profile | null) => Boolean(
    profile?.username_customized && profile.name !== null,
  ),
}))

vi.mock('@/features/notifications/api/notificationsApi', () => ({
  dismissProfileReminder: mocks.dismissProfileReminder,
}))

vi.mock('../utils/accountLocalData', () => ({
  getPendingAccountDeletionMarkerStatus: mocks.getPendingMarkerStatus,
  shouldReconcilePendingAccountDeletion: (status: string) => status === 'present',
  hasPendingAccountDeletion: (userId: string) => (
    mocks.getPendingMarkerStatus(userId) === 'present'
  ),
  prepareAccountDeletionLocalData: mocks.prepareAccountDeletionLocalData,
  cancelPendingAccountDeletion: mocks.cancelPendingAccountDeletion,
  clearDeletedAccountLocalData: mocks.clearDeletedAccountLocalData,
  markPendingAccountDeletionOutcome: mocks.markPendingAccountDeletionOutcome,
}))

vi.mock('../api/legalAcceptanceApi', () => ({
  getCurrentLegalAcceptance: mocks.getCurrentLegalAcceptance,
  acceptCurrentLegalDocuments: mocks.acceptCurrentLegalDocuments,
}))

vi.mock('../utils/legalAcceptanceIntent', () => ({
  clearPendingLegalAcceptance: mocks.clearPendingLegalAcceptance,
}))

vi.mock('../utils/authNavigation', () => ({
  clearAuthReturnTo: mocks.clearAuthReturnTo,
}))

vi.mock('@/features/messages/offline/messageOutboxDelivery', () => ({
  pauseMessageOutboxForSender: mocks.pauseMessageOutboxForSender,
  quiesceMessageOutboxForSender: mocks.quiesceMessageOutboxForSender,
  resumeMessageOutboxForSender: mocks.resumeMessageOutboxForSender,
}))

vi.mock('./SessionExpiredModal', () => ({
  default: () => null,
}))

let latestAuth: AuthContextType | null = null

beforeEach(() => {
  latestAuth = null
  mocks.authCallback = null
  window.localStorage.clear()

  mocks.getSession.mockReset().mockResolvedValue({ session: null, error: null })
  mocks.signInWithPassword.mockReset().mockResolvedValue({ error: null })
  mocks.signUpWithPassword.mockReset().mockResolvedValue({ error: null })
  mocks.signInWithGoogle.mockReset().mockResolvedValue({ error: null })
  mocks.signOut.mockReset().mockResolvedValue({
    error: null,
    persistedSessionStatus: 'absent',
  })
  mocks.resetPasswordForEmail.mockReset().mockResolvedValue({ error: null })
  mocks.updateUserPassword.mockReset().mockResolvedValue({
    user: null,
    error: null,
    persistedSessionStatus: 'absent',
  })
  mocks.updateUserMetadata.mockReset().mockResolvedValue({
    user: null,
    error: null,
    persistedSessionStatus: 'absent',
  })
  mocks.deleteAccountRequest.mockReset().mockResolvedValue({ error: null })
  mocks.unsubscribe.mockReset()

  mocks.getProfile.mockReset().mockImplementation(async (userId: string) => ({
    profile: profileFor(userId),
    error: null,
  }))
  mocks.updateLastLogin.mockReset().mockResolvedValue({ error: null })
  mocks.updateProfile.mockReset().mockResolvedValue({ profile: null, error: null })
  mocks.dismissProfileReminder.mockReset().mockResolvedValue({ error: null })

  mocks.getPendingMarkerStatus.mockReset().mockReturnValue('absent')
  mocks.prepareAccountDeletionLocalData.mockReset().mockResolvedValue(undefined)
  mocks.cancelPendingAccountDeletion.mockReset().mockResolvedValue(undefined)
  mocks.clearDeletedAccountLocalData.mockReset().mockResolvedValue(undefined)
  mocks.markPendingAccountDeletionOutcome.mockReset()

  mocks.getCurrentLegalAcceptance.mockReset().mockResolvedValue({
    acceptance: {
      isAccepted: true,
      termsVersion: 'terms-2026-07-18-v1',
      privacyVersion: 'privacy-2026-07-18-v1',
      acceptedAt: '2026-07-18T00:00:00.000Z',
    },
    error: null,
  })
  mocks.acceptCurrentLegalDocuments.mockReset().mockResolvedValue({
    acceptedAt: '2026-07-18T00:00:00.000Z',
    error: null,
  })
  mocks.clearPendingLegalAcceptance.mockReset()
  mocks.clearAuthReturnTo.mockReset()

  mocks.pauseMessageOutboxForSender.mockReset()
  mocks.quiesceMessageOutboxForSender.mockReset().mockResolvedValue(undefined)
  mocks.resumeMessageOutboxForSender.mockReset()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('AuthProvider account ownership boundaries', () => {
  it('cancels deletion before its first request when A switches to B during local preparation', async () => {
    const preparation = deferred<void>()
    mocks.prepareAccountDeletionLocalData.mockReturnValueOnce(preparation.promise)

    renderProvider()
    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_A, TOKEN_A))
    await waitForAuthOwner(ACCOUNT_A)

    const accountADelete = currentAuth().deleteAccount()
    await waitFor(() => {
      expect(mocks.prepareAccountDeletionLocalData).toHaveBeenCalledWith(ACCOUNT_A)
    })

    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_B, TOKEN_B))
    await waitForAuthOwner(ACCOUNT_B)

    let result: { error: Error | null } | undefined
    await act(async () => {
      preparation.resolve()
      result = await accountADelete
    })

    expect(result?.error).toMatchObject({ code: 'request_cancelled' })
    expect(mocks.deleteAccountRequest).not.toHaveBeenCalled()
    expect(mocks.cancelPendingAccountDeletion).toHaveBeenCalledWith(ACCOUNT_A)
    expect(mocks.signOut).not.toHaveBeenCalled()
    expectCurrentOwner(ACCOUNT_B, TOKEN_B)
  })

  it('never retries A deletion with B credentials or signs B out after an account switch in backoff', async () => {
    const nativeSetTimeout = window.setTimeout.bind(window)
    const retryTimers: Array<() => void> = []
    vi.spyOn(window, 'setTimeout').mockImplementation(((callback: TimerHandler, delay?: number) => {
      if (delay === 400 || delay === 1200) {
        retryTimers.push(() => {
          if (typeof callback === 'function') callback()
        })
        return retryTimers.length
      }
      return nativeSetTimeout(callback, delay)
    }) as typeof window.setTimeout)

    mocks.deleteAccountRequest.mockResolvedValueOnce({
      error: new AccountDeletionRequestError(
        'The first response was lost.',
        'request_ambiguous',
        null,
      ),
    })

    renderProvider()
    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_A, TOKEN_A))
    await waitForAuthOwner(ACCOUNT_A)

    const accountADelete = currentAuth().deleteAccount()
    await waitFor(() => {
      expect(mocks.deleteAccountRequest).toHaveBeenCalledTimes(1)
      expect(retryTimers).toHaveLength(1)
    })

    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_B, TOKEN_B))
    await waitForAuthOwner(ACCOUNT_B)

    let result: { error: Error | null } | undefined
    await act(async () => {
      retryTimers.shift()?.()
      result = await accountADelete
    })

    expect(result?.error).toMatchObject({ code: 'request_cancelled' })
    expect(mocks.deleteAccountRequest).toHaveBeenCalledTimes(1)
    expect(mocks.deleteAccountRequest).toHaveBeenNthCalledWith(1, TOKEN_A, ACCOUNT_A)
    expect(mocks.deleteAccountRequest).not.toHaveBeenCalledWith(TOKEN_B, ACCOUNT_B)
    expect(mocks.signOut).not.toHaveBeenCalled()
    expectCurrentOwner(ACCOUNT_B, TOKEN_B)
  })

  it.each<[
    AccountDeletionRequestErrorCode,
    number,
  ]>([
    ['auth_verification_unavailable', 503],
    ['reauthentication_check_unavailable', 503],
    ['deletion_status_check_unavailable', 503],
    ['unexpected_response', 422],
  ])('restores A local deletion state after safe pre-enqueue %s', async (code, status) => {
    mocks.deleteAccountRequest.mockResolvedValueOnce({
      error: new AccountDeletionRequestError(
        'The request was rejected before enqueue.',
        code,
        status,
      ),
    })

    renderProvider()
    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_A, TOKEN_A))
    await waitForAuthOwner(ACCOUNT_A)
    mocks.resumeMessageOutboxForSender.mockClear()

    let result: Awaited<ReturnType<AuthContextType['deleteAccount']>> | undefined
    await act(async () => {
      result = await currentAuth().deleteAccount()
    })

    expect(result?.error).toMatchObject({ code, status })
    expect(mocks.deleteAccountRequest).toHaveBeenCalledTimes(1)
    expect(mocks.deleteAccountRequest).toHaveBeenCalledWith(TOKEN_A, ACCOUNT_A)
    expect(mocks.cancelPendingAccountDeletion).toHaveBeenCalledWith(ACCOUNT_A)
    expect(mocks.clearDeletedAccountLocalData).not.toHaveBeenCalled()
    expect(mocks.markPendingAccountDeletionOutcome).not.toHaveBeenCalled()
    expect(mocks.resumeMessageOutboxForSender).toHaveBeenCalledWith(ACCOUNT_A)
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(currentAuth().accountDeletionPending).toBe(false)
    expectCurrentOwner(ACCOUNT_A, TOKEN_A)
  })

  it('cancels A deletion state before reauth when the bearer session is invalid', async () => {
    mocks.deleteAccountRequest.mockResolvedValueOnce({
      error: new AccountDeletionRequestError(
        'The bearer session is invalid.',
        'account_not_found_or_session_invalid',
        401,
      ),
    })

    renderProvider()
    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_A, TOKEN_A))
    await waitForAuthOwner(ACCOUNT_A)

    let result: Awaited<ReturnType<AuthContextType['deleteAccount']>> | undefined
    await act(async () => {
      result = await currentAuth().deleteAccount()
    })

    expect(result?.error).toMatchObject({
      code: 'account_not_found_or_session_invalid',
      status: 401,
    })
    expect(mocks.cancelPendingAccountDeletion).toHaveBeenCalledWith(ACCOUNT_A)
    expect(mocks.clearDeletedAccountLocalData).not.toHaveBeenCalled()
    expect(mocks.markPendingAccountDeletionOutcome).not.toHaveBeenCalled()
    expect(mocks.signOut).toHaveBeenCalledWith(TOKEN_A, ACCOUNT_A)
    expect(
      mocks.cancelPendingAccountDeletion.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.signOut.mock.invocationCallOrder[0])
    expect(currentAuth().accountDeletionPending).toBe(false)
  })

  it('drops late A profile and metadata results after B becomes the auth owner', async () => {
    const profileUpdate = deferred<{ profile: Profile; error: null }>()
    const metadataUpdate = deferred<{ user: User; error: null }>()
    mocks.updateProfile.mockReturnValueOnce(profileUpdate.promise)
    mocks.updateUserMetadata.mockReturnValueOnce(metadataUpdate.promise)

    renderProvider()
    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_A, TOKEN_A, 'Original A'))
    await waitForProfileOwner(ACCOUNT_A)

    const profilePromise = currentAuth().updateUser({ name: 'Late A' })
    const metadataPromise = currentAuth().updateUserMetadata({ name: 'Late metadata A' })
    expect(mocks.updateProfile).toHaveBeenCalledWith(ACCOUNT_A, { name: 'Late A' })
    expect(mocks.updateUserMetadata).toHaveBeenCalledWith(
      TOKEN_A,
      ACCOUNT_A,
      { name: 'Late metadata A' },
    )

    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_B, TOKEN_B, 'Current B'))
    await waitForProfileOwner(ACCOUNT_B)
    expectCurrentOwner(ACCOUNT_B, TOKEN_B, 'Current B')

    let profileResult: { error: Error | null } | undefined
    let metadataResult: { error: Error | null } | undefined
    await act(async () => {
      profileUpdate.resolve({
        profile: profileFor(ACCOUNT_A, 'Late A'),
        error: null,
      })
      metadataUpdate.resolve({
        user: userFor(ACCOUNT_A, 'Late metadata A'),
        error: null,
      })
      ;[profileResult, metadataResult] = await Promise.all([
        profilePromise,
        metadataPromise,
      ])
    })

    expect(profileResult?.error?.message).toContain('active session changed')
    expect(metadataResult?.error?.message).toContain('active session changed')
    expect(mocks.dismissProfileReminder).not.toHaveBeenCalled()
    expectCurrentOwner(ACCOUNT_B, TOKEN_B, 'Current B')
    expect(currentAuth().profile).toMatchObject({
      id: ACCOUNT_B,
      name: `Profile ${ACCOUNT_B}`,
    })
  })

  it('rejects an A metadata action captured before switching to B without calling the API', async () => {
    renderProvider()
    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_A, TOKEN_A))
    await waitForAuthOwner(ACCOUNT_A)
    const staleAccountAMetadataAction = currentAuth().updateUserMetadata

    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_B, TOKEN_B, 'Current B'))
    await waitForProfileOwner(ACCOUNT_B)

    let result: { error: Error | null } | undefined
    await act(async () => {
      result = await staleAccountAMetadataAction({ name: 'Stale A action' })
    })

    expect(result?.error?.message).toBe('No authenticated user to update metadata.')
    expect(mocks.updateUserMetadata).not.toHaveBeenCalled()
    expectCurrentOwner(ACCOUNT_B, TOKEN_B, 'Current B')
  })

  it('treats an A sign-out action captured before switching to B as a no-op', async () => {
    renderProvider()
    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_A, TOKEN_A))
    await waitForAuthOwner(ACCOUNT_A)
    const staleAccountASignOut = currentAuth().signOut

    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_B, TOKEN_B, 'Current B'))
    await waitForProfileOwner(ACCOUNT_B)
    const pauseCallsBeforeStaleAction = mocks.pauseMessageOutboxForSender.mock.calls.length
    const quiesceCallsBeforeStaleAction = mocks.quiesceMessageOutboxForSender.mock.calls.length

    let result: { error: Error | null } | undefined
    await act(async () => {
      result = await staleAccountASignOut()
    })

    expect(result?.error).toBeNull()
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(mocks.pauseMessageOutboxForSender).toHaveBeenCalledTimes(
      pauseCallsBeforeStaleAction,
    )
    expect(mocks.quiesceMessageOutboxForSender).toHaveBeenCalledTimes(
      quiesceCallsBeforeStaleAction,
    )
    expectCurrentOwner(ACCOUNT_B, TOKEN_B, 'Current B')
  })

  it('keeps B intact when A sign-out is already in flight during the switch', async () => {
    const accountASignOut = deferred<{
      error: null
      persistedSessionStatus: 'different'
    }>()
    mocks.signOut.mockReturnValueOnce(accountASignOut.promise)

    renderProvider()
    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_A, TOKEN_A))
    await waitForAuthOwner(ACCOUNT_A)

    const signOutPromise = currentAuth().signOut()
    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalledWith(TOKEN_A, ACCOUNT_A)
    })

    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_B, TOKEN_B, 'Current B'))
    await waitForProfileOwner(ACCOUNT_B)

    await act(async () => {
      accountASignOut.resolve({
        error: null,
        persistedSessionStatus: 'different',
      })
      await signOutPromise
    })

    expectCurrentOwner(ACCOUNT_B, TOKEN_B, 'Current B')

    // B's later server-driven sign-out must not be hidden by A's stale manual
    // sign-out flag.
    await emitAuth('SIGNED_OUT', null)
    expect(currentAuth().sessionExpired).toBe(true)
  })

  it('releases manual sign-out state when the token-bound helper throws', async () => {
    mocks.signOut.mockRejectedValueOnce(new Error('unexpected helper failure'))

    renderProvider()
    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_A, TOKEN_A))
    await waitForAuthOwner(ACCOUNT_A)

    let result: { error: Error | null } | undefined
    await act(async () => {
      result = await currentAuth().signOut()
    })

    expect(result?.error?.message).toBe('unexpected helper failure')
    expect(mocks.resumeMessageOutboxForSender).toHaveBeenCalledWith(ACCOUNT_A)
    expectCurrentOwner(ACCOUNT_A, TOKEN_A)

    await emitAuth('SIGNED_OUT', null)
    expect(currentAuth().sessionExpired).toBe(true)
  })

  it('rejects an A password action captured before switching to B without calling the API', async () => {
    renderProvider()
    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_A, TOKEN_A))
    await waitForAuthOwner(ACCOUNT_A)
    const staleAccountAPasswordAction = currentAuth().updatePassword

    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_B, TOKEN_B, 'Current B'))
    await waitForProfileOwner(ACCOUNT_B)

    let result: { error: Error | null } | undefined
    await act(async () => {
      result = await staleAccountAPasswordAction('a-strong-new-password')
    })

    expect(result?.error?.message).toBe('No authenticated user to update.')
    expect(mocks.updateUserPassword).not.toHaveBeenCalled()
    expectCurrentOwner(ACCOUNT_B, TOKEN_B, 'Current B')
  })

  it('binds an in-flight A password update to A while B takes over the client', async () => {
    const accountAPasswordUpdate = deferred<{
      user: User
      error: null
      persistedSessionStatus: 'different'
    }>()
    mocks.updateUserPassword.mockReturnValueOnce(accountAPasswordUpdate.promise)

    renderProvider()
    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_A, TOKEN_A))
    await waitForAuthOwner(ACCOUNT_A)

    const passwordPromise = currentAuth().updatePassword('a-strong-new-password')
    expect(mocks.updateUserPassword).toHaveBeenCalledWith(
      TOKEN_A,
      ACCOUNT_A,
      'a-strong-new-password',
    )

    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_B, TOKEN_B, 'Current B'))
    await waitForProfileOwner(ACCOUNT_B)

    let result: { error: Error | null } | undefined
    await act(async () => {
      accountAPasswordUpdate.resolve({
        user: userFor(ACCOUNT_A, 'Updated A'),
        error: null,
        persistedSessionStatus: 'different',
      })
      result = await passwordPromise
    })

    expect(result?.error?.message).toContain('active session changed')
    expectCurrentOwner(ACCOUNT_B, TOKEN_B, 'Current B')
  })

  it('clears A recovery state and withholds B while B pending deletion is reconciled', async () => {
    const preparation = deferred<void>()
    mocks.getPendingMarkerStatus.mockImplementation((userId: string) => (
      userId === ACCOUNT_B ? 'present' : 'absent'
    ))
    mocks.prepareAccountDeletionLocalData.mockReturnValueOnce(preparation.promise)
    mocks.deleteAccountRequest.mockResolvedValueOnce({
      error: new AccountDeletionRequestError(
        'The deletion confirmation was rejected.',
        'confirmation_mismatch',
        409,
      ),
    })

    renderProvider()
    await emitAuth('PASSWORD_RECOVERY', sessionFor(ACCOUNT_A, TOKEN_A))
    await waitFor(() => {
      expect(currentAuth().user?.id).toBe(ACCOUNT_A)
      expect(currentAuth().recoveryMode).toBe(true)
    })

    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_B, TOKEN_B))

    expect(currentAuth().user).toBeNull()
    expect(currentAuth().session).toBeNull()
    expect(currentAuth().authStatus).toBe('checking_session')
    expect(currentAuth().accountDeletionPending).toBe(true)
    expect(currentAuth().recoveryMode).toBe(false)
    expect(mocks.prepareAccountDeletionLocalData).toHaveBeenCalledWith(ACCOUNT_B)
    expect(mocks.deleteAccountRequest).not.toHaveBeenCalled()

    await act(async () => {
      preparation.resolve()
      await preparation.promise
    })

    await waitForAuthOwner(ACCOUNT_B)
    expect(mocks.deleteAccountRequest).toHaveBeenCalledTimes(1)
    expect(mocks.deleteAccountRequest).toHaveBeenNthCalledWith(1, TOKEN_B, ACCOUNT_B)
    expect(mocks.cancelPendingAccountDeletion).toHaveBeenCalledWith(ACCOUNT_B)
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(currentAuth().recoveryMode).toBe(false)
    expect(currentAuth().accountDeletionPending).toBe(false)
    expectCurrentOwner(ACCOUNT_B, TOKEN_B)
  })

  it('requires token-bound B sign-out when pending deletion reports an identity mismatch', async () => {
    const tokenBoundSignOut = deferred<{
      error: null
      persistedSessionStatus: 'cleared'
    }>()
    mocks.getPendingMarkerStatus.mockImplementation((userId: string) => (
      userId === ACCOUNT_B ? 'present' : 'absent'
    ))
    mocks.deleteAccountRequest.mockResolvedValueOnce({
      error: new AccountDeletionRequestError(
        'The held session does not match the deletion request.',
        'account_identity_mismatch',
        409,
      ),
    })
    mocks.signOut.mockReturnValueOnce(tokenBoundSignOut.promise)

    const { unmount } = renderProvider()
    await emitAuth('SIGNED_IN', sessionFor(ACCOUNT_B, TOKEN_B))

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalledWith(TOKEN_B, ACCOUNT_B)
    })
    expect(mocks.cancelPendingAccountDeletion).toHaveBeenCalledWith(ACCOUNT_B)
    expect(currentAuth().user).toBeNull()
    expect(currentAuth().session).toBeNull()
    expect(currentAuth().authStatus).toBe('unauthenticated')
    expect(currentAuth().recoveryMode).toBe(false)

    // Prevent the test environment from navigating after the expected
    // token-bound logout completes; cleanup flips the provider's cancellation
    // guard while preserving every assertion about the real branch above.
    unmount()
    await act(async () => {
      tokenBoundSignOut.resolve({
        error: null,
        persistedSessionStatus: 'cleared',
      })
      await tokenBoundSignOut.promise
      await Promise.resolve()
    })
    expect(mocks.signOut).toHaveBeenCalledTimes(1)
  })
})

function AuthProbe() {
  const auth = useAuth()

  useEffect(() => {
    latestAuth = auth
  }, [auth])

  return (
    <output
      data-testid="auth-state"
      data-user-id={auth.user?.id ?? 'none'}
      data-user-name={String(auth.user?.user_metadata.name ?? 'none')}
      data-session-token={auth.session?.access_token ?? 'none'}
      data-profile-id={auth.profile?.id ?? 'none'}
      data-profile-name={auth.profile?.name ?? 'none'}
      data-auth-status={auth.authStatus}
      data-recovery={String(auth.recoveryMode)}
      data-deletion-pending={String(auth.accountDeletionPending)}
    />
  )
}

function renderProvider() {
  return render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
  )
}

async function emitAuth(event: string, session: Session | null) {
  await waitFor(() => expect(mocks.authCallback).toBeTypeOf('function'))
  await act(async () => {
    mocks.authCallback?.(event, session)
    await Promise.resolve()
    await Promise.resolve()
  })
}

async function waitForAuthOwner(userId: string) {
  await waitFor(() => {
    expect(currentAuth().user?.id).toBe(userId)
    expect(screen.getByTestId('auth-state').getAttribute('data-user-id')).toBe(userId)
  })
}

async function waitForProfileOwner(userId: string) {
  await waitFor(() => {
    expect(currentAuth().user?.id).toBe(userId)
    expect(currentAuth().profile?.id).toBe(userId)
  })
}

function expectCurrentOwner(userId: string, accessToken: string, name?: string) {
  const auth = currentAuth()
  const state = screen.getByTestId('auth-state')
  expect(auth.user?.id).toBe(userId)
  expect(auth.session?.user.id).toBe(userId)
  expect(auth.session?.access_token).toBe(accessToken)
  expect(auth.profile === null || auth.profile.id === userId).toBe(true)
  expect(state.getAttribute('data-user-id')).toBe(userId)
  expect(state.getAttribute('data-session-token')).toBe(accessToken)
  if (name) {
    expect(auth.user?.user_metadata.name).toBe(name)
    expect(state.getAttribute('data-user-name')).toBe(name)
  }
}

function currentAuth(): AuthContextType {
  if (!latestAuth) throw new Error('AuthProvider context has not rendered yet.')
  return latestAuth
}

function sessionFor(userId: string, accessToken: string, name = `User ${userId}`): Session {
  return {
    access_token: accessToken,
    refresh_token: `refresh-${userId}`,
    expires_in: 3600,
    expires_at: 1_800_000_000,
    token_type: 'bearer',
    user: userFor(userId, name),
  } as Session
}

function userFor(userId: string, name: string): User {
  return {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: `${userId}@example.invalid`,
    email_confirmed_at: '2026-07-18T00:00:00.000Z',
    phone: '',
    confirmed_at: '2026-07-18T00:00:00.000Z',
    last_sign_in_at: '2026-07-18T00:00:00.000Z',
    app_metadata: {},
    user_metadata: { name },
    identities: [],
    created_at: '2026-07-18T00:00:00.000Z',
    updated_at: '2026-07-18T00:00:00.000Z',
    is_anonymous: false,
  }
}

function profileFor(userId: string, name = `Profile ${userId}`): Profile {
  return {
    id: userId,
    username: userId,
    username_customized: true,
    name,
    photo_url: null,
    created_at: '2026-07-18T00:00:00.000Z',
    updated_at: '2026-07-18T00:00:00.000Z',
  }
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}
