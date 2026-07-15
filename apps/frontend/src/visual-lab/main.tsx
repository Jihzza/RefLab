import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import '../styles/globals.css'
import '../i18n'
import DashboardFixture from './DashboardFixture'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MemoryRouter initialEntries={['/app/dashboard']}>
      <DashboardFixture />
    </MemoryRouter>
  </StrictMode>,
)
