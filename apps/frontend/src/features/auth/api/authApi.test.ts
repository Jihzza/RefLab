// @vitest-environment jsdom

import type { User } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AccountDeletionRequestError,
  accountDeletionRequestCanRetry,
  accountDeletionRequestWasCancelled,
  accountDeletionRequiresReauthentication,
  accountDeletionWasDefinitivelyRejected,
  deleteAccountRequest,
  signOut,
  updateUserMetadata,
  updateUserPassword,
} from './authApi'
import type { AccountDeletionRequestErrorCode } from './authApi'

const ISOLATED_URL = 'https://isolated-project.supabase.co'
const PUBLIC_ANON_KEY = 'public-anon-key'
const STORAGE_KEY = 'sb-isolated-project-auth-token'
const ACCOUNT_A = 'token-bound-account-a'
const ACCOUNT_B = 'token-bound-account-b'
const TOKEN_A = jwtFor(ACCOUNT_A)
const TOKEN_B = jwtFor(ACCOUNT_B)

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  withAuthStorageLock: vi.fn(),
}))

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { auth: {} },
  supabaseBrowserConfiguration: {
    url: 'https://isolated-project.supabase.co',
    anonKey: 'public-anon-key',
    productionBackendIsolated: true,
    authStorageKey: 'sb-isolated-project-auth-token',
  },
  withSupabaseAuthStorageLock: mocks.withAuthStorageLock,
}))

beforeEach(() => {
  window.localStorage.clear()
  mocks.fetch.mockReset()
  mocks.withAuthStorageLock.mockReset().mockImplementation(
    async (operation: () => unknown) => operation(),
  )
  vi.stubGlobal('fetch', mocks.fetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('token-bound Auth REST helpers', () => {
  it('updates A metadata through the isolated Auth endpoint and CAS-updates A storage', async () => {
    storeSession(TOKEN_A, userFor(ACCOUNT_A, 'Original A'))
    const updatedA = userFor(ACCOUNT_A, 'Updated A')
    mocks.fetch.mockResolvedValueOnce(jsonResponse(updatedA))

    const result = await updateUserMetadata(
      TOKEN_A,
      ACCOUNT_A,
      { name: 'Updated A' },
    )

    expect(mocks.fetch).toHaveBeenCalledWith(
      `${ISOLATED_URL}/auth/v1/user`,
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: `Bearer ${TOKEN_A}`,
          apikey: PUBLIC_ANON_KEY,
        }),
        body: JSON.stringify({ data: { name: 'Updated A' } }),
      }),
    )
    expect(result).toMatchObject({
      user: { id: ACCOUNT_A, user_metadata: { name: 'Updated A' } },
      error: null,
      persistedSessionStatus: 'updated',
    })
    expect(readStoredSession()?.user).toMatchObject({
      id: ACCOUNT_A,
      user_metadata: { name: 'Updated A' },
    })
  })

  it('rejects a token whose JWT subject is not the expected account before fetch', async () => {
    storeSession(TOKEN_A, userFor(ACCOUNT_A, 'Original A'))

    const result = await updateUserPassword(
      TOKEN_A,
      ACCOUNT_B,
      'a-strong-new-password',
    )

    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(result.user).toBeNull()
    expect(result.error?.message).toContain('does not belong')
    expect(readStoredSession()?.user.id).toBe(ACCOUNT_A)
  })

  it('never overwrites B written while a successful A response waits for the auth storage lock', async () => {
    storeSession(TOKEN_A, userFor(ACCOUNT_A, 'Original A'))
    const lockEntered = deferred<void>()
    const releaseLock = deferred<void>()
    mocks.withAuthStorageLock.mockImplementationOnce(
      async (operation: () => unknown) => {
        lockEntered.resolve()
        await releaseLock.promise
        return operation()
      },
    )
    mocks.fetch.mockResolvedValueOnce(jsonResponse(userFor(ACCOUNT_A, 'Late A')))

    const updatePromise = updateUserMetadata(
      TOKEN_A,
      ACCOUNT_A,
      { name: 'Late A' },
    )
    expect(mocks.fetch).toHaveBeenCalledOnce()
    await lockEntered.promise

    const storedB = storeSession(TOKEN_B, userFor(ACCOUNT_B, 'Current B'))
    releaseLock.resolve()
    const result = await updatePromise

    expect(result).toMatchObject({
      user: { id: ACCOUNT_A },
      error: null,
      persistedSessionStatus: 'different',
    })
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(storedB)
    expect(readStoredSession()?.user).toMatchObject({
      id: ACCOUNT_B,
      user_metadata: { name: 'Current B' },
    })
  })

  it('reports a 200 update as successful when session storage is unavailable', async () => {
    storeSession(TOKEN_A, userFor(ACCOUNT_A, 'Original A'))
    mocks.fetch.mockResolvedValueOnce(jsonResponse(userFor(ACCOUNT_A, 'Updated A')))
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })

    const result = await updateUserMetadata(
      TOKEN_A,
      ACCOUNT_A,
      { name: 'Updated A' },
    )

    expect(result).toMatchObject({
      user: { id: ACCOUNT_A, user_metadata: { name: 'Updated A' } },
      error: null,
      persistedSessionStatus: 'unavailable',
    })
  })

  it('degrades an auth storage lock timeout after PUT 200 to a successful unavailable status', async () => {
    storeSession(TOKEN_A, userFor(ACCOUNT_A, 'Original A'))
    mocks.fetch.mockResolvedValueOnce(jsonResponse(userFor(ACCOUNT_A, 'Updated A')))
    mocks.withAuthStorageLock.mockRejectedValueOnce(new Error('lock timeout'))

    const result = await updateUserMetadata(
      TOKEN_A,
      ACCOUNT_A,
      { name: 'Updated A' },
    )

    expect(result).toMatchObject({
      user: { id: ACCOUNT_A, user_metadata: { name: 'Updated A' } },
      error: null,
      persistedSessionStatus: 'unavailable',
    })
    expect(readStoredSession()?.user.user_metadata.name).toBe('Original A')
  })

  it('rejects a user response for B and leaves the stored A session untouched', async () => {
    const storedA = storeSession(TOKEN_A, userFor(ACCOUNT_A, 'Original A'))
    mocks.fetch.mockResolvedValueOnce(jsonResponse(userFor(ACCOUNT_B, 'Wrong B')))

    const result = await updateUserMetadata(TOKEN_A, ACCOUNT_A, { name: 'Late A' })

    expect(result.user).toBeNull()
    expect(result.error?.message).toContain('different account')
    expect(result.persistedSessionStatus).toBe('different')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(storedA)
  })

  it('clears only matching A storage even when token-bound sign-out has a network error', async () => {
    storeSession(TOKEN_A, userFor(ACCOUNT_A, 'Original A'))
    window.localStorage.setItem(`${STORAGE_KEY}-code-verifier`, 'verifier-a')
    window.localStorage.setItem(`${STORAGE_KEY}-user`, 'user-a')
    mocks.fetch.mockRejectedValueOnce(new Error('offline'))

    const result = await signOut(TOKEN_A, ACCOUNT_A)

    expect(result.error?.message).toContain('could not reach')
    expect(result.persistedSessionStatus).toBe('cleared')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(window.localStorage.getItem(`${STORAGE_KEY}-code-verifier`)).toBeNull()
    expect(window.localStorage.getItem(`${STORAGE_KEY}-user`)).toBeNull()
  })

  it('preserves B and its auxiliary keys when B replaces A during a failed sign-out', async () => {
    storeSession(TOKEN_A, userFor(ACCOUNT_A, 'Original A'))
    window.localStorage.setItem(`${STORAGE_KEY}-code-verifier`, 'verifier-a')
    window.localStorage.setItem(`${STORAGE_KEY}-user`, 'user-a')
    const request = deferred<Response>()
    mocks.fetch.mockReturnValueOnce(request.promise)

    const signOutPromise = signOut(TOKEN_A, ACCOUNT_A)
    expect(mocks.fetch).toHaveBeenCalledWith(
      `${ISOLATED_URL}/auth/v1/logout?scope=local`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${TOKEN_A}`,
          apikey: PUBLIC_ANON_KEY,
        }),
      }),
    )

    const storedB = storeSession(TOKEN_B, userFor(ACCOUNT_B, 'Current B'))
    window.localStorage.setItem(`${STORAGE_KEY}-code-verifier`, 'verifier-b')
    window.localStorage.setItem(`${STORAGE_KEY}-user`, 'user-b')
    request.reject(new Error('offline'))
    const result = await signOutPromise

    expect(result.error?.message).toContain('could not reach')
    expect(result.persistedSessionStatus).toBe('different')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(storedB)
    expect(window.localStorage.getItem(`${STORAGE_KEY}-code-verifier`)).toBe('verifier-b')
    expect(window.localStorage.getItem(`${STORAGE_KEY}-user`)).toBe('user-b')
  })

  it('fails sign-out safely when the auth storage lock times out', async () => {
    const storedA = storeSession(TOKEN_A, userFor(ACCOUNT_A, 'Original A'))
    window.localStorage.setItem(`${STORAGE_KEY}-code-verifier`, 'verifier-a')
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 204 }))
    mocks.withAuthStorageLock.mockRejectedValueOnce(new Error('lock timeout'))

    const result = await signOut(TOKEN_A, ACCOUNT_A)

    expect(result.error?.message).toContain('could not be cleared safely')
    expect(result.persistedSessionStatus).toBe('unavailable')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(storedA)
    expect(window.localStorage.getItem(`${STORAGE_KEY}-code-verifier`)).toBe('verifier-a')
  })

  it('uses the isolated resolved backend for account-deletion requests', async () => {
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 202 }))

    const result = await deleteAccountRequest(TOKEN_A, ACCOUNT_A)

    expect(result.error).toBeNull()
    expect(mocks.fetch).toHaveBeenCalledWith(
      `${ISOLATED_URL}/functions/v1/delete-account`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${TOKEN_A}`,
          apikey: PUBLIC_ANON_KEY,
        }),
      }),
    )
  })

  it.each<AccountDeletionRequestErrorCode>([
    'auth_verification_unavailable',
    'reauthentication_check_unavailable',
    'deletion_status_check_unavailable',
  ])('preserves the server pre-enqueue code %s', async (code) => {
    mocks.fetch.mockResolvedValueOnce(jsonResponse({
      error: 'Account deletion is temporarily unavailable',
      code,
    }, 503))

    const result = await deleteAccountRequest(TOKEN_A, ACCOUNT_A)

    expect(result.error).toMatchObject({ code, status: 503 })
    expect(accountDeletionWasDefinitivelyRejected(result.error!)).toBe(true)
    expect(accountDeletionRequestCanRetry(result.error!)).toBe(false)
  })
})

describe('account-deletion error taxonomy', () => {
  it.each<[
    AccountDeletionRequestErrorCode,
    boolean,
    boolean,
    boolean,
    boolean,
  ]>([
    ['reauthentication_required', true, false, false, true],
    ['confirmation_mismatch', false, false, false, true],
    ['account_not_found_or_session_invalid', true, false, false, true],
    ['account_identity_mismatch', true, false, false, true],
    ['auth_verification_unavailable', false, false, false, true],
    ['reauthentication_check_unavailable', false, false, false, true],
    ['deletion_status_check_unavailable', false, false, false, true],
    ['deletion_enqueue_ambiguous', false, true, false, false],
    ['deletion_session_revocation_ambiguous', false, true, false, false],
    ['request_ambiguous', false, true, false, false],
    ['request_cancelled', false, false, true, false],
    ['unexpected_response', false, false, false, true],
  ])(
    'classifies %s consistently',
    (code, requiresReauth, canRetry, wasCancelled, wasDefinitivelyRejected) => {
      const error = new AccountDeletionRequestError('classified error', code, 400)
      expect(accountDeletionRequiresReauthentication(error)).toBe(requiresReauth)
      expect(accountDeletionRequestCanRetry(error)).toBe(canRetry)
      expect(accountDeletionRequestWasCancelled(error)).toBe(wasCancelled)
      expect(accountDeletionWasDefinitivelyRejected(error)).toBe(
        wasDefinitivelyRejected,
      )
    },
  )

  it('does not classify an unexpected non-4xx response as safely rejected', () => {
    const error = new AccountDeletionRequestError(
      'unexpected server response',
      'unexpected_response',
      503,
    )

    expect(accountDeletionWasDefinitivelyRejected(error)).toBe(false)
  })
})

function storeSession(accessToken: string, user: User): string {
  const serialized = JSON.stringify({
    access_token: accessToken,
    refresh_token: `refresh-${user.id}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 1_800_000_000,
    user,
  })
  window.localStorage.setItem(STORAGE_KEY, serialized)
  return serialized
}

function readStoredSession(): { access_token: string; user: User } | null {
  const rawValue = window.localStorage.getItem(STORAGE_KEY)
  return rawValue
    ? JSON.parse(rawValue) as { access_token: string; user: User }
    : null
}

function userFor(userId: string, name: string): User {
  return {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: `${userId}@example.invalid`,
    app_metadata: {},
    user_metadata: { name },
    identities: [],
    created_at: '2026-07-18T00:00:00.000Z',
    updated_at: '2026-07-18T00:00:00.000Z',
    is_anonymous: false,
  }
}

function jwtFor(subject: string): string {
  const encode = (value: Record<string, unknown>) => btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: subject })}.signature`
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}
