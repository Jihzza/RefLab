import { supabase } from '@/lib/supabaseClient'
import type { PublicProfile } from '../types'

export async function getPublicProfileByUsername(username: string): Promise<{
  profile: PublicProfile | null
  error: Error | null
}> {
  const normalized = username.trim()

  if (!normalized) {
    return { profile: null, error: new Error('Username is required.') }
  }

  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, username, name, photo_url')
    .ilike('username', normalized)
    .maybeSingle()

  if (error) {
    return { profile: null, error: new Error(error.message) }
  }

  return { profile: (data as PublicProfile | null) ?? null, error: null }
}
