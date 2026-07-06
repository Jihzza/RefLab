import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import './i18n'
import ConfigNeeded from './components/ui/ConfigNeeded'

const root = createRoot(document.getElementById('root')!)

const hasSupabaseEnv =
  Boolean(import.meta.env.VITE_SUPABASE_URL) &&
  Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY)

if (hasSupabaseEnv) {
  // App (and the Supabase client it imports) is loaded only once the required
  // env vars are present, so a misconfiguration never crashes at import time —
  // the user sees the friendly ConfigNeeded screen instead of a blank page.
  import('./App')
    .then(({ default: App }) => {
      root.render(
        <StrictMode>
          <App />
        </StrictMode>,
      )
    })
    .catch((err) => {
      // A failed chunk load (e.g. a stale hashed chunk after a redeploy) would
      // otherwise leave a permanently blank page. Surface a recoverable message.
      console.error('Failed to load the application bundle:', err)
      root.render(
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'Inter, system-ui, sans-serif',
            background: '#14192c',
            color: '#f5f7fa',
          }}
        >
          <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
            Something went wrong loading RefLab.
          </p>
          <p style={{ margin: 0, color: '#b8c0d4' }}>
            This can happen after an update. Please reload the page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              border: '1px solid #f6c21c',
              background: '#f6c21c',
              color: '#14192c',
              fontWeight: 700,
              borderRadius: '0.625rem',
              padding: '0.625rem 1.25rem',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>,
      )
    })
} else {
  root.render(<ConfigNeeded />)
}
