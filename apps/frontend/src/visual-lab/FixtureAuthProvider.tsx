import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { AuthContext } from '@/features/auth/components/AuthContext'
import type { AuthContextType } from '@/features/auth/types'

const successfulAction = async () => ({ error: null })

const fixtureUser = {
  id: 'fixture-rafael',
  email: 'rafael@reflab.pt',
  app_metadata: { provider: 'email' },
  user_metadata: { full_name: 'Rafael Martins' },
  aud: 'authenticated',
  created_at: '2026-01-08T10:00:00.000Z',
} as User

const fixtureAuth: AuthContextType = {
  user: fixtureUser,
  session: null,
  profile: {
    id: fixtureUser.id,
    username: 'rafael',
    username_customized: true,
    role: 'user',
    name: 'Rafael Martins',
    email: fixtureUser.email ?? null,
    photo_url: null,
    last_login_at: '2026-07-15T09:41:00.000Z',
    created_at: fixtureUser.created_at,
    updated_at: '2026-07-15T09:41:00.000Z',
  },
  authStatus: 'authenticated',
  profileStatus: 'complete',
  loading: false,
  sessionExpired: false,
  recoveryMode: false,
  clearRecoveryMode: () => undefined,
  dismissSessionExpired: () => undefined,
  refreshProfile: async () => undefined,
  signIn: successfulAction,
  signUp: successfulAction,
  signInWithGoogle: successfulAction,
  signOut: successfulAction,
  resetPassword: successfulAction,
  updatePassword: successfulAction,
  updateUser: successfulAction,
  updateUserMetadata: successfulAction,
  deleteAccount: successfulAction,
}

export default function FixtureAuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={fixtureAuth}>{children}</AuthContext.Provider>
}
