/**
 * Friendly configuration screen shown when the required public env vars are
 * missing. Without this, the Supabase client throws at import time and the user
 * sees a blank white page. No secret values are referenced — only the names of
 * the public variables that must be set.
 */
export default function ConfigNeeded() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#14192c',
        color: '#f5f7fa',
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 440 }}>
        <h1 style={{ color: '#f6c21c', fontSize: 22, margin: '0 0 12px' }}>
          RefLab is not configured
        </h1>
        <p style={{ color: '#b8c0d4', lineHeight: 1.6, margin: 0 }}>
          The app is missing its Supabase environment variables. Copy{' '}
          <code>.env.example</code> to <code>.env.local</code> in{' '}
          <code>apps/frontend</code>, set <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>, then reload.
        </p>
      </div>
    </div>
  )
}
