import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import '../styles/globals.css'
import '../i18n'

// Keep relative dates stable across local captures and visual comparisons.
const fixtureNow = Date.parse('2026-07-15T19:41:00.000Z')
Date.now = () => fixtureNow

const screen = new URLSearchParams(window.location.search).get('screen') ?? 'dashboard'
const fixtures = {
  dashboard: { path: '/app/dashboard', load: () => import('./DashboardFixture') },
  social: { path: '/app/social', load: () => import('./SocialFixture') },
  messages: { path: '/app/messages/fixture-conversation', load: () => import('./MessagesFixture') },
  pricing: { path: '/app/pricing', load: () => import('./PricingFixture') },
  profile: { path: '/app/profile', load: () => import('./ProfileFixture') },
  settings: { path: '/app/settings', load: () => import('./SettingsFixture') },
  learn: { path: '/app/learn', load: () => import('./LearnFixture') },
  test: { path: '/app/learn', load: () => import('./TestFixture') },
  results: { path: '/app/learn', load: () => import('./ResultsFixture') },
  video: { path: '/app/learn', load: () => import('./VideoFixture') },
  notifications: { path: '/app/notifications', load: () => import('./NotificationsFixture') },
  navigation: { path: '/app/dashboard', load: () => import('./NavigationFixture') },
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
