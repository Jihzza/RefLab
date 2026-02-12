import { SupabaseClient } from '@supabase/supabase-js';
import type { SearchedUser } from '../types';

export const searchUsers = async (
  supabase: SupabaseClient,
  searchTerm: string
): Promise<SearchedUser[]> => {
  if (!searchTerm.trim()) {
    return [];
  }

  const { data, error } = await supabase.rpc('search_users', {
    search_term: searchTerm,
  });

  if (error) {
    console.error('Error searching users:', error);
    throw error;
  }

  return data || [];
};
