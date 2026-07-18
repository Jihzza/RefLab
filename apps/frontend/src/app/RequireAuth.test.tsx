// @vitest-environment jsdom

import { useEffect, useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RequireAuth from './RequireAuth'

const mocks = vi.hoisted(() => ({
  userId: 'account-a',
  unmounts: 0,
}))

vi.mock('@/features/auth/components/useAuth', () => ({
  useAuth: () => ({
    user: { id: mocks.userId },
    authStatus: 'authenticated',
    legalAcceptanceStatus: 'accepted',
  }),
}))

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <span>{to}</span>,
  useLocation: () => ({ pathname: '/app/learn', search: '', hash: '' }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

function StatefulProtectedChild() {
  const [value, setValue] = useState(0)
  useEffect(() => () => {
    mocks.unmounts += 1
  }, [])

  return (
    <button type="button" onClick={() => setValue(current => current + 1)}>
      protected-state-{value}
    </button>
  )
}

beforeEach(() => {
  mocks.userId = 'account-a'
  mocks.unmounts = 0
})

afterEach(() => cleanup())

describe('RequireAuth account boundary', () => {
  it('remounts the complete protected subtree when the authenticated owner changes', () => {
    const { rerender } = render(
      <RequireAuth><StatefulProtectedChild /></RequireAuth>,
    )

    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('protected-state-1')).toBeTruthy()

    mocks.userId = 'account-b'
    rerender(<RequireAuth><StatefulProtectedChild /></RequireAuth>)

    expect(screen.getByText('protected-state-0')).toBeTruthy()
    expect(mocks.unmounts).toBe(1)
  })
})
