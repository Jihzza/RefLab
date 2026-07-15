import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import '../styles/globals.css'
import '../i18n'
import DashboardFixture from './DashboardFixture'
import PricingFixture from './PricingFixture'

const screen = new URLSearchParams(window.location.search).get('screen') ?? 'dashboard'
const fixture = screen === 'pricing'
  ? { path: '/app/pricing', component: <PricingFixture /> }
  : { path: '/app/dashboard', component: <DashboardFixture /> }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MemoryRouter initialEntries={[fixture.path]}>
      {fixture.component}
    </MemoryRouter>
  </StrictMode>,
)
