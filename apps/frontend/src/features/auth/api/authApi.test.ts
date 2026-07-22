import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteAccountRequest,
  resetPasswordForEmail,
  signInWithPassword,
  signUpWithPassword,
} from './authApi'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}))

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
    },
  },
}))

describe('auth CAPTCHA forwarding', () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'newer-user-token' } },
      error: null,
    })
    mocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    mocks.signInWithPassword.mockResolvedValue({ data: {}, error: null })
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('forwards the verified token to password sign-in', async () => {
    await signInWithPassword('referee@example.com', 'password123', 'captcha-token')

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'referee@example.com',
      password: 'password123',
      options: { captchaToken: 'captcha-token' },
    })
  })

  it('forwards the verified token to signup and password recovery', async () => {
    await signUpWithPassword('referee@example.com', 'password123', 'signup-token')
    await resetPasswordForEmail('referee@example.com', 'reset-token')

    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({ captchaToken: 'signup-token' }),
    }))
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      'referee@example.com',
      expect.objectContaining({ captchaToken: 'reset-token' }),
    )
  })

  it('binds account deletion to the caller-captured access token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn(),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(deleteAccountRequest('captured-user-token')).resolves.toEqual({ error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/delete-account'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer captured-user-token',
        }),
      }),
    )
    expect(mocks.getSession).not.toHaveBeenCalled()
  })
})
