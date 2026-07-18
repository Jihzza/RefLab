// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LegalAcceptancePage from './LegalAcceptancePage'
import ResetPassword from './ResetPassword'

const ACCOUNT_A = 'public-auth-account-a'
const ACCOUNT_B = 'public-auth-account-b'

const mocks = vi.hoisted(() => ({
  currentUserId: 'public-auth-account-a' as string | null,
  authStatus: 'authenticated',
  legalAcceptanceStatus: 'required',
  recoveryMode: true,
  recoveryEpoch: 1,
  acceptLegalDocuments: vi.fn(),
  refreshLegalAcceptance: vi.fn(),
  signOut: vi.fn(),
  updatePassword: vi.fn(),
  clearRecoveryMode: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => (
    <span data-testid="route-redirect" data-to={to} />
  ),
  useLocation: () => ({ search: '?returnTo=%2Fapp%2Flearn' }),
  useNavigate: () => mocks.navigate,
}))

vi.mock('@/features/landing/components/PublicAuthFrame', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}))

vi.mock('./useAuth', () => ({
  useAuth: () => ({
    user: mocks.currentUserId ? { id: mocks.currentUserId } : null,
    authStatus: mocks.authStatus,
    legalAcceptanceStatus: mocks.legalAcceptanceStatus,
    recoveryMode: mocks.recoveryMode,
    recoveryEpoch: mocks.recoveryEpoch,
    acceptLegalDocuments: mocks.acceptLegalDocuments,
    refreshLegalAcceptance: mocks.refreshLegalAcceptance,
    signOut: mocks.signOut,
    updatePassword: mocks.updatePassword,
    clearRecoveryMode: mocks.clearRecoveryMode,
  }),
}))

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

beforeEach(() => {
  mocks.currentUserId = ACCOUNT_A
  mocks.authStatus = 'authenticated'
  mocks.legalAcceptanceStatus = 'required'
  mocks.recoveryMode = true
  mocks.recoveryEpoch = 1
  mocks.acceptLegalDocuments.mockReset()
  mocks.refreshLegalAcceptance.mockReset()
  mocks.signOut.mockReset()
  mocks.updatePassword.mockReset()
  mocks.clearRecoveryMode.mockReset()
  mocks.navigate.mockReset()
  mocks.signOut.mockResolvedValue({ error: null })
})

afterEach(() => cleanup())

describe('public authenticated route owner boundaries', () => {
  it('starts account B unchecked and ignores account A legal-submit completion', async () => {
    const acceptance = deferred<{ error: Error | null }>()
    mocks.acceptLegalDocuments.mockReturnValueOnce(acceptance.promise)
    const { rerender } = render(<LegalAcceptancePage />)

    const checkboxA = screen.getByRole('checkbox') as HTMLInputElement
    fireEvent.click(checkboxA)
    fireEvent.click(screen.getByRole('button', { name: 'Accept and continue' }))

    await waitFor(() => expect(mocks.acceptLegalDocuments).toHaveBeenCalledTimes(1))
    expect(checkboxA.checked).toBe(true)

    mocks.currentUserId = ACCOUNT_B
    rerender(<LegalAcceptancePage />)

    const checkboxB = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkboxB.checked).toBe(false)
    expect(checkboxB.disabled).toBe(false)

    await act(async () => {
      acceptance.resolve({ error: null })
      await acceptance.promise
    })

    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(checkboxB.checked).toBe(false)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('does not let an account A legal retry alter account B form state', async () => {
    const refresh = deferred<void>()
    mocks.legalAcceptanceStatus = 'error'
    mocks.refreshLegalAcceptance.mockReturnValueOnce(refresh.promise)
    const { rerender } = render(<LegalAcceptancePage />)

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    await waitFor(() => expect(mocks.refreshLegalAcceptance).toHaveBeenCalledTimes(1))

    mocks.currentUserId = ACCOUNT_B
    mocks.legalAcceptanceStatus = 'required'
    rerender(<LegalAcceptancePage />)

    const checkboxB = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkboxB.checked).toBe(false)
    expect(screen.getByRole('button', { name: 'Accept and continue' }).getAttribute('aria-busy')).toBeNull()

    await act(async () => {
      refresh.resolve()
      await refresh.promise
    })

    expect(checkboxB.checked).toBe(false)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('clears reset secrets for account B and ignores account A completion', async () => {
    const passwordUpdate = deferred<{ error: Error | null }>()
    mocks.updatePassword.mockReturnValueOnce(passwordUpdate.promise)
    const { rerender } = render(<ResetPassword />)

    const passwordA = screen.getByLabelText(/^New Password/) as HTMLInputElement
    const confirmationA = screen.getByLabelText(/^Confirm New Password/) as HTMLInputElement
    fireEvent.change(passwordA, { target: { value: 'AccountA-secret-12' } })
    fireEvent.change(confirmationA, { target: { value: 'AccountA-secret-12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))

    await waitFor(() => expect(mocks.updatePassword).toHaveBeenCalledWith('AccountA-secret-12'))

    mocks.currentUserId = ACCOUNT_B
    mocks.recoveryEpoch = 2
    rerender(<ResetPassword />)

    const passwordB = screen.getByLabelText(/^New Password/) as HTMLInputElement
    const confirmationB = screen.getByLabelText(/^Confirm New Password/) as HTMLInputElement
    expect(passwordB.value).toBe('')
    expect(confirmationB.value).toBe('')
    expect(passwordB.disabled).toBe(false)

    await act(async () => {
      passwordUpdate.resolve({ error: null })
      await passwordUpdate.promise
    })

    expect(mocks.clearRecoveryMode).not.toHaveBeenCalled()
    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(screen.queryByText('Password updated!')).toBeNull()
    expect(passwordB.value).toBe('')
  })

  it('clears reset secrets when the same owner enters a new recovery epoch', () => {
    const { rerender } = render(<ResetPassword />)

    fireEvent.change(screen.getByLabelText(/^New Password/), {
      target: { value: 'Older-recovery-secret-12' },
    })
    fireEvent.change(screen.getByLabelText(/^Confirm New Password/), {
      target: { value: 'Older-recovery-secret-12' },
    })

    mocks.recoveryEpoch = 2
    rerender(<ResetPassword />)

    expect((screen.getByLabelText(/^New Password/) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText(/^Confirm New Password/) as HTMLInputElement).value).toBe('')
  })
})
