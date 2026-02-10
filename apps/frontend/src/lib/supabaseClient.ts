import { createClient } from '@supabase/supabase-js'

// These environment variables are defined in .env.local
// Vite exposes them via import.meta.env (not process.env like Node.js)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate that the environment variables are set
// This will throw an error during development if you forgot to create .env.local
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local'
  )
}

// Create a single Supabase client instance for the entire app
// This client handles:
// - Authentication (signup, login, logout, password reset)
// - Database queries (coming in later phases)
// - Real-time subscriptions (coming in later phases)
// - File storage (coming in later phases)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Where to store the session (localStorage persists across browser sessions)
    persistSession: true,

    // Automatically refresh the token before it expires
    autoRefreshToken: true,

    // Detect session from URL (needed for OAuth redirects and email confirmations)
    detectSessionInUrl: true,

    // Use PKCE (Proof Key for Code Exchange) for all auth flows
    // This replaces the implicit flow: URLs use ?code=... instead of #access_token=...
    flowType: 'pkce',
  },
})
