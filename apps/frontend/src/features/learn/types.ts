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
  topic: string | null  // Topic category (Offside, Fouls, Handball, etc.)
  law: number | null    // FIFA Law of the Game number (1-17)
  updated_at: string
}

// A user's attempt at a test (tracks progress and score)
export interface TestAttempt {
  id: string
  user_id: string
  test_id: string | null  // null for random tests
  status: 'in_progress' | 'submitted'
  started_at: string
  submitted_at: string | null
  score_correct: number | null
  score_total: number | null
  score_percent: number | null
  time_limit_seconds: number  // Time limit in seconds (default 2400 = 40 min)
  time_elapsed_seconds: number | null  // Actual time taken
  auto_submitted: boolean  // True if auto-submitted when timer expired
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

// Topic performance breakdown (for strong/weak analysis)
export interface TopicPerformance {
  topic: string
  accuracy: number
  correct: number
  total: number
}

// Test KPIs for landing page
export interface TestKPIs {
  testsThisWeek: number
  averageScore: number | null  // percentage
  bestScore: number | null  // percentage
  averageTime: number | null  // seconds
}

// ── Question practice sessions ──

export type QuestionSessionMode = 'quick' | 'by_law' | 'by_area'

export interface QuestionSession {
  id: string
  user_id: string
  mode: QuestionSessionMode
  filter_laws: number[] | null
  filter_areas: string[] | null
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  total_answered: number
  total_correct: number
  created_at: string
}

export interface QuestionSessionKPIs {
  sessionsThisWeek: number
  totalQuestionsAnswered: number
  overallAccuracy: number | null   // percentage 0-100, null if no answers yet
  avgSessionAccuracy: number | null // average accuracy across completed sessions
}

// A single answered question tracked within a session (held in React state)
export interface AnsweredQuestion {
  question: TestQuestion
  selectedOption: OptionLetter
  selectedIndex: number
  isCorrect: boolean
}

// Passed from QuestionsSession → QuestionsReview on session end
export interface SessionResult {
  sessionId: string
  startedAt: string
  endedAt: string
  durationSeconds: number
  totalAnswered: number
  totalCorrect: number
  answers: AnsweredQuestion[]
}

// Comprehensive test results (for results page)
export interface TestResults {
  attempt: TestAttempt
  score: {
    correct: number
    total: number
    percentage: number
  }
  timing: {
    elapsed: number  // seconds
    limit: number  // seconds
    autoSubmitted: boolean
  }
  breakdown: {
    strong: TopicPerformance[]
    weak: TopicPerformance[]
  }
  corrections: Array<{
    question: TestQuestion
    selectedOption: string
    correctOption: string
    isCorrect: boolean
  }>
}
