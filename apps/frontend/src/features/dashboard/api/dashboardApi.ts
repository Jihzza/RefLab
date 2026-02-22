import { supabase } from '@/lib/supabaseClient'
import type { DashboardStats } from '../types'

// Default empty stats (used when no data exists or on error)
const DEFAULT_STATS: DashboardStats = {
  performance: {
    overall_accuracy: null,
    accuracy_by_topic: [],
    match_simulation_accuracy: null,
    pass_rate: null,
  },
  progress: {
    accuracy_change: null,
    accuracy_this_week: null,
    accuracy_last_week: null,
    total_questions_answered: 0,
    total_tests_completed: 0,
    total_tests_passed: 0,
    average_test_duration: null,
    last_test_duration: null,
  },
  habits: {
    calendar: [],
    current_streak: 0,
    longest_streak: 0,
    active_days_last_7: 0,
  },
}

/**
 * Fetch all dashboard statistics in a single RPC call.
 * Returns performance, progress, and habit metrics computed server-side.
 */
export async function fetchDashboardStats(
  userId: string
): Promise<{ data: DashboardStats; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_dashboard_stats', {
    p_user_id: userId,
  })

  if (error) {
    return { data: DEFAULT_STATS, error: new Error(error.message) }
  }

  return {
    data: (data as DashboardStats) ?? DEFAULT_STATS,
    error: null,
  }
}

export { DEFAULT_STATS }
