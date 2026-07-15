import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import '../styles/globals.css'
import '../i18n'

const screen = new URLSearchParams(window.location.search).get('screen') ?? 'dashboard'
const fixtures = {
  dashboard: { path: '/app/dashboard', load: () => import('./DashboardFixture') },
  social: { path: '/app/social', load: () => import('./SocialFixture') },
  messages: { path: '/app/messages/fixture-conversation', load: () => import('./MessagesFixture') },
  pricing: { path: '/app/pricing', load: () => import('./PricingFixture') },
} as const
const fixtureKey = screen in fixtures ? screen as keyof typeof fixtures : 'dashboard'
const fixture = fixtures[fixtureKey]
const Fixture = lazy(fixture.load)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MemoryRouter initialEntries={[fixture.path]}>
      <Suspense fallback={<div className="min-h-dvh bg-(--mc-color-canvas)" />}>
        <Fixture />
      </Suspense>
    </MemoryRouter>
  </StrictMode>,
)
