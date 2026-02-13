/**
 * Types for the Learn feature - Tests, Questions, and Attempts
 * These match the database schema in backend/supabase/migrations/
 */

// A test (e.g., "Offside Basics")
export interface Test {
  id: string
  slug: string
  title: string
  topic: string | null
  is_active: boolean
  updated_at: string
}

// A question within a test
export interface TestQuestion {
  id: string
  test_id: string
  order_index: number
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: 'A' | 'B' | 'C' | 'D'
  updated_at: string
}

// A user's attempt at a test (tracks progress and score)
export interface TestAttempt {
  id: string
  user_id: string
  test_id: string
  status: 'in_progress' | 'submitted'
  started_at: string
  submitted_at: string | null
  score_correct: number | null
  score_total: number | null
  score_percent: number | null
  updated_at: string
}

// A user's answer to a specific question within an attempt
export interface TestAttemptAnswer {
  id: string
  attempt_id: string
  question_id: string
  selected_option: 'A' | 'B' | 'C' | 'D'
  is_correct: boolean | null
  confirmed_at: string
  ai_explanation: string | null
  ai_explanation_created_at: string | null
}

// Helper type for option letters
export type OptionLetter = 'A' | 'B' | 'C' | 'D'

// A video scenario for match simulation
export interface VideoScenario {
  id: string
  title: string
  description: string | null
  video_url: string
  topic: string | null
  correct_action: string
  correct_sanction: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Tab options for the Learn page navigation
export type LearnTab = 'tests' | 'questions' | 'videos' | 'course' | 'resources'
