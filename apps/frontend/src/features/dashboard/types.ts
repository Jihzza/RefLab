// ── Dashboard Types ──
// Matches the JSON shape returned by the get_dashboard_stats RPC

/** Accuracy breakdown for a single topic */
export interface TopicAccuracy {
  topic: string
  accuracy: number
  total_questions: number
}

/** A single day in the 30-day training calendar */
export interface CalendarDay {
  date: string   // "YYYY-MM-DD"
  active: boolean
}

/** Performance metrics section */
export interface PerformanceStats {
  overall_accuracy: number | null
  accuracy_by_topic: TopicAccuracy[]
  match_simulation_accuracy: number | null
  pass_rate: number | null
}

/** Progress metrics section */
export interface ProgressStats {
  accuracy_change: number | null
  accuracy_this_week: number | null
  accuracy_last_week: number | null
  total_questions_answered: number
  total_tests_completed: number
  total_tests_passed: number
  average_test_duration: number | null  // Average test duration in seconds
  last_test_duration: number | null  // Last test duration in seconds
}

/** Habit metrics section */
export interface HabitStats {
  calendar: CalendarDay[]
  current_streak: number
  longest_streak: number
  active_days_last_7: number
}

/** Complete dashboard stats returned by the RPC */
export interface DashboardStats {
  performance: PerformanceStats
  progress: ProgressStats
  habits: HabitStats
}

/** Return type for the useDashboard hook */
export interface UseDashboardReturn {
  stats: DashboardStats | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}
