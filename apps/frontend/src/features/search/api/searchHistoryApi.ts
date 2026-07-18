import { supabase } from '@/lib/supabaseClient'
import type { SearchHistoryEntry } from '../types'

export async function getSearchHistoryProfiles(
  ids: readonly string[],
): Promise<{ profiles: SearchHistoryEntry[]; error: Error | null }> {
  if (ids.length === 0) return { profiles: [], error: null }

  const { data, error } = await supabase.rpc('get_search_history_profiles', {
    p_ids: [...ids],
  })

  return {
    profiles: error ? [] : (data ?? []) as SearchHistoryEntry[],
    error: error ? new Error(error.message) : null,
  }
}
