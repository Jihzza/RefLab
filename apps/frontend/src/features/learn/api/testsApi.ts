import { supabase } from '@/lib/supabaseClient'
import type { Test, TestQuestion, TestAttempt, TestAttemptAnswer, OptionLetter, VideoScenario, TopicPerformance, QuestionSession, QuestionSessionMode, QuestionSessionKPIs } from '../types'

/**
 * Fetch all active tests
 *
 * Returns tests ordered by title (alphabetically)
 * Only returns tests where is_active = true
 */
export async function getTests() {
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('is_active', true)
    .order('title')

  return { data: data as Test[] | null, error }
}

/**
 * Fetch a single test by its slug
 *
 * Slug is the URL-friendly identifier (e.g., "offside-basics")
 */
export async function getTestBySlug(slug: string) {
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('slug', slug)
    .single()

  return { data: data as Test | null, error }
}

/**
 * Fetch all questions for a test
 *
 * Queries the bridge table test_question_items to get the ordered
 * question_bank entries for the given test.
 */
// Non-answer columns of question_bank — correct_option is intentionally excluded
// (the DB revokes SELECT on it; grading is server-side). Keep in sync with the
// column grant in 20260706_0056_server_side_grading.sql.
const QUESTION_PUBLIC_COLUMNS =
  'id, question_text, option_a, option_b, option_c, option_d, topic, law, created_at, updated_at'

export async function getQuestions(testId: string) {
  const { data, error } = await supabase
    .from('test_question_items')
    .select(`order_index, question_bank!inner(${QUESTION_PUBLIC_COLUMNS})`)
    .eq('test_id', testId)
    .order('order_index')

  if (error || !data) {
    return { data: null, error }
  }

  // Flatten: extract the nested question_bank object from each row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questions = data.map((row: any) => row.question_bank as TestQuestion)

  return { data: questions, error: null }
}

/**
 * Get or create an attempt for a test
 *
 * Logic:
 * 1. Check if user has an existing "in_progress" attempt for this test
 * 2. If yes, return it (allows resuming)
 * 3. If no, create a new attempt
 *
 * This ensures users can pause and resume tests
 */
export async function getOrCreateAttempt(testId: string) {
  // First, get the current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  // Check for existing in-progress attempt
  const { data: existingAttempt, error: fetchError } = await supabase
    .from('test_attempts')
    .select('*')
    .eq('user_id', user.id)
    .eq('test_id', testId)
    .eq('status', 'in_progress')
    .maybeSingle()

  if (fetchError) {
    return { data: null, error: fetchError }
  }

  // If found, return it
  if (existingAttempt) {
    return { data: existingAttempt as TestAttempt, error: null }
  }

  // Create new attempt
  const { data: newAttempt, error: insertError } = await supabase
    .from('test_attempts')
    .insert({
      user_id: user.id,
      test_id: testId,
      status: 'in_progress',
    })
    .select()
    .single()

  return { data: newAttempt as TestAttempt | null, error: insertError }
}

/**
 * Get all answers for an attempt
 *
 * Used to restore state when resuming a test
 */
export async function getAttemptAnswers(attemptId: string) {
  const { data, error } = await supabase
    .from('test_attempt_answers')
    .select('*')
    .eq('attempt_id', attemptId)

  return { data: data as TestAttemptAnswer[] | null, error }
}

/**
 * Save (or update) an answer for a question
 *
 * Uses upsert to handle both insert and update in one call
 * The unique constraint on (attempt_id, question_id) makes this work
 */
export async function saveAnswer(
  attemptId: string,
  questionId: string,
  selectedOption: OptionLetter
) {
  const { data, error } = await supabase
    .from('test_attempt_answers')
    .upsert(
      {
        attempt_id: attemptId,
        question_id: questionId,
        selected_option: selectedOption,
        confirmed_at: new Date().toISOString(),
      },
      {
        onConflict: 'attempt_id,question_id',
      }
    )
    .select()
    .single()

  return { data: data as TestAttemptAnswer | null, error }
}

/**
 * Submit an attempt (finish the test)
 *
 * Grading is done server-side by the submit_test_attempt RPC (SECURITY DEFINER):
 * it grades every recorded answer against the authoritative key, writes the
 * score, and marks the attempt submitted. The answer key never reaches the
 * client. The RPC is idempotent (a re-submit returns the already-scored row).
 */
export async function submitAttempt(attemptId: string) {
  const { data, error } = await supabase.rpc('submit_test_attempt', {
    p_attempt_id: attemptId,
  })

  return { data: data as TestAttempt | null, error }
}

/**
 * Get user's completed attempts for a test (for history/review)
 */
export async function getCompletedAttempts(testId: string) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  const { data, error } = await supabase
    .from('test_attempts')
    .select('*')
    .eq('user_id', user.id)
    .eq('test_id', testId)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })

  return { data: data as TestAttempt[] | null, error }
}

/**
 * Get all of the user's completed attempts (across all tests)
 */
export async function getUserCompletedAttempts() {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  const { data, error } = await supabase
    .from('test_attempts')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(50)

  return { data: data as TestAttempt[] | null, error }
}

/**
 * Fetch all active video scenarios
 */
export async function getVideoScenarios() {
  const { data, error } = await supabase
    .from('video_scenarios')
    .select('*')
    .eq('is_active', true)
    .order('created_at')

  return { data: data as VideoScenario[] | null, error }
}

/**
 * Get the public URL for a video file stored in Cloudflare R2.
 *
 * The video_url column stores the R2 key (e.g., "clips/A1.mp4").
 * This function builds the full R2 public URL.
 */
const R2_BASE_URL = 'https://pub-a1f801f17afb4e44b8c270828fefc392.r2.dev'

export function getVideoPublicUrl(filename: string): string {
  return `${R2_BASE_URL}/${filename}`
}

/**
 * Sync the "Learn Videos" bucket with the video_scenarios table.
 *
 * Calls the sync-video-scenarios Edge Function which:
 * 1. Lists all video files in the bucket
 * 2. Inserts new rows for files not yet tracked
 * 3. New rows have is_active=false until configured in the Table Editor
 */
export async function syncVideoScenarios() {
  const { data, error } = await supabase.functions.invoke('sync-video-scenarios', {
    method: 'POST',
  })

  return { data, error }
}

/**
 * Save a video attempt (action + sanction decisions)
 */
export async function saveVideoAttempt(
  scenarioId: string,
  selectedAction: string,
  selectedSanction: string,
  actionCorrect: boolean,
  sanctionCorrect: boolean
) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  const { data, error } = await supabase
    .from('video_attempts')
    .insert({
      user_id: user.id,
      scenario_id: scenarioId,
      selected_action: selectedAction,
      selected_sanction: selectedSanction,
      action_correct: actionCorrect,
      sanction_correct: sanctionCorrect,
      is_correct: actionCorrect && sanctionCorrect,
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Generate a random test with 20 questions
 * Creates a test attempt and returns questions
 */
export async function generateRandomTest() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  // Call RPC to get 20 random questions
  const { data: questions, error: questionsError } = await supabase
    .rpc('get_random_questions')

  if (questionsError || !questions) {
    return { data: null, error: questionsError }
  }

  // Create test attempt
  const { data: attempt, error: attemptError } = await supabase
    .from('test_attempts')
    .insert({
      user_id: user.id,
      test_id: null, // Random tests don't belong to a specific test
      status: 'in_progress',
      time_limit_seconds: 2400, // 40 minutes
    })
    .select()
    .single()

  if (attemptError || !attempt) {
    return { data: null, error: attemptError }
  }

  return {
    data: {
      questions: questions as TestQuestion[],
      attemptId: attempt.id,
    },
    error: null,
  }
}

/**
 * Submit random test with timing data
 *
 * Server-side grading via submit_test_attempt (see submitAttempt). Passes the
 * elapsed time and whether the timer auto-submitted. Idempotent.
 */
export async function submitRandomTest(
  attemptId: string,
  timeElapsedSeconds: number,
  autoSubmitted: boolean
) {
  const { data, error } = await supabase.rpc('submit_test_attempt', {
    p_attempt_id: attemptId,
    p_time_elapsed_seconds: timeElapsedSeconds,
    p_auto_submitted: autoSubmitted,
  })

  return { data: data as TestAttempt | null, error }
}

/**
 * Get per-question corrections for a submitted attempt.
 *
 * Uses the get_attempt_corrections RPC, which returns the answer key only for
 * the caller's own submitted attempt — the key is never exposed on the table.
 */
export async function getAttemptCorrections(attemptId: string) {
  const { data, error } = await supabase.rpc('get_attempt_corrections', {
    p_attempt_id: attemptId,
  })

  const corrections = (data ?? []) as Array<{
    question: TestQuestion
    selected_option: OptionLetter
    correct_option: OptionLetter
    is_correct: boolean
  }>

  return { data: corrections, error }
}

/**
 * Get topic performance breakdown for an attempt
 * Returns strong (>=75%) and weak (<50%) topics
 */
export async function getAttemptTopicBreakdown(attemptId: string) {
  const { data, error } = await supabase
    .rpc('get_attempt_topic_breakdown', { p_attempt_id: attemptId })

  if (error) {
    return { data: null, error }
  }

  // Parse the JSON response
  const breakdown = data as { strong: TopicPerformance[]; weak: TopicPerformance[] }
  return { data: breakdown, error: null }
}

/**
 * Get test KPIs for landing page
 */
export async function getTestKPIs() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  // Tests completed this week (from Monday)
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week (Sunday)
  if (weekStart.getDay() === 0) {
    // If it's Sunday, go back to Monday
    weekStart.setDate(weekStart.getDate() - 6)
  }
  weekStart.setHours(0, 0, 0, 0)

  const { count: testsThisWeek } = await supabase
    .from('test_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'submitted')
    .gte('submitted_at', weekStart.toISOString())

  // Last 5 tests average score
  const { data: recentTests } = await supabase
    .from('test_attempts')
    .select('score_percent')
    .eq('user_id', user.id)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(5)

  const averageScore = recentTests?.length
    ? Math.round(recentTests.reduce((sum, t) => sum + (t.score_percent || 0), 0) / recentTests.length)
    : null

  // Best score all time
  const { data: bestTest } = await supabase
    .from('test_attempts')
    .select('score_percent')
    .eq('user_id', user.id)
    .eq('status', 'submitted')
    .order('score_percent', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Average time (from tests with timing data)
  const { data: timedTests } = await supabase
    .from('test_attempts')
    .select('time_elapsed_seconds')
    .eq('user_id', user.id)
    .eq('status', 'submitted')
    .not('time_elapsed_seconds', 'is', null)

  const averageTime = timedTests?.length
    ? Math.round(timedTests.reduce((sum, t) => sum + t.time_elapsed_seconds!, 0) / timedTests.length)
    : null

  return {
    data: {
      testsThisWeek: testsThisWeek || 0,
      averageScore,
      bestScore: bestTest?.score_percent || null,
      averageTime, // in seconds
    },
    error: null,
  }
}

// ─── Question Practice Sessions ───────────────────────────────────────────────

/**
 * Create a new question practice session
 *
 * Called when the user starts a session from QuestionsSetup or via Quick mode.
 * The session row is created before the user answers any questions.
 */
export async function createQuestionSession(
  mode: QuestionSessionMode,
  filterLaws: number[] | null,
  filterAreas: string[] | null
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  const { data, error } = await supabase
    .from('question_sessions')
    .insert({
      user_id: user.id,
      mode,
      filter_laws: filterLaws,
      filter_areas: filterAreas,
    })
    .select()
    .single()

  return { data: data as QuestionSession | null, error }
}

/**
 * Mark a question session as complete
 *
 * Called when the user clicks "End Session". Writes the final score and duration.
 */
export async function completeQuestionSession(
  sessionId: string,
  startedAt: string,
  totalAnswered: number,
  totalCorrect: number
) {
  const endedAt = new Date().toISOString()
  const durationSeconds = Math.round(
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
  )

  const { data, error } = await supabase
    .from('question_sessions')
    .update({
      ended_at: endedAt,
      duration_seconds: durationSeconds,
      total_answered: totalAnswered,
      total_correct: totalCorrect,
    })
    .eq('id', sessionId)
    .select()
    .single()

  return { data: data as QuestionSession | null, error }
}

/**
 * Get KPIs for the Questions landing dashboard
 *
 * Returns: sessions this week, total questions answered, overall accuracy,
 * and average session accuracy (across all completed sessions).
 */
export async function getQuestionSessionKPIs() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  // Sessions completed this week (from Monday)
  const weekStart = new Date()
  const day = weekStart.getDay()
  const daysToMonday = day === 0 ? 6 : day - 1
  weekStart.setDate(weekStart.getDate() - daysToMonday)
  weekStart.setHours(0, 0, 0, 0)

  const { count: sessionsThisWeek } = await supabase
    .from('question_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .not('ended_at', 'is', null)
    .gte('started_at', weekStart.toISOString())

  // Overall accuracy from all practice answers
  const { data: allAnswers } = await supabase
    .from('question_practice_answers')
    .select('is_correct')
    .eq('user_id', user.id)

  const totalQuestionsAnswered = allAnswers?.length ?? 0
  const totalCorrect = allAnswers?.filter(a => a.is_correct).length ?? 0
  const overallAccuracy = totalQuestionsAnswered > 0
    ? Math.round((totalCorrect / totalQuestionsAnswered) * 100)
    : null

  // Average session accuracy across completed sessions
  const { data: completedSessions } = await supabase
    .from('question_sessions')
    .select('total_answered, total_correct')
    .eq('user_id', user.id)
    .not('ended_at', 'is', null)
    .gt('total_answered', 0)

  const avgSessionAccuracy = completedSessions?.length
    ? Math.round(
        completedSessions.reduce(
          (sum, s) => sum + (s.total_correct / s.total_answered) * 100,
          0
        ) / completedSessions.length
      )
    : null

  return {
    data: {
      sessionsThisWeek: sessionsThisWeek ?? 0,
      totalQuestionsAnswered,
      overallAccuracy,
      avgSessionAccuracy,
    } satisfies QuestionSessionKPIs,
    error: null,
  }
}

/**
 * Fetch questions filtered by law numbers and/or area (topic) names
 *
 * With no filters (Quick mode) returns all questions from question_bank.
 * With laws filter, returns questions matching any of the provided law numbers.
 * With areas filter, returns questions matching any of the provided topic strings.
 */
export async function getQuestionsByFilters(params: {
  laws?: number[]
  areas?: string[]
}) {
  let query = supabase.from('question_bank').select(QUESTION_PUBLIC_COLUMNS)

  if (params.laws && params.laws.length > 0) {
    query = query.in('law', params.laws)
  }

  if (params.areas && params.areas.length > 0) {
    query = query.in('topic', params.areas)
  }

  const { data, error } = await query

  return { data: data as TestQuestion[] | null, error }
}

/**
 * Get the distinct FIFA law numbers present in question_bank
 *
 * Used to populate the By Law filter chip list in QuestionsSetup.
 */
export async function getDistinctLaws() {
  const { data, error } = await supabase
    .from('question_bank')
    .select('law')
    .not('law', 'is', null)

  if (error || !data) {
    return { data: null, error }
  }

  const unique = [...new Set(data.map(r => r.law as number))].sort((a, b) => a - b)
  return { data: unique, error: null }
}

/**
 * Get the distinct area (topic) strings present in question_bank
 *
 * Used to populate the By Area filter chip list in QuestionsSetup.
 */
export async function getDistinctAreas() {
  const { data, error } = await supabase
    .from('question_bank')
    .select('topic')
    .not('topic', 'is', null)

  if (error || !data) {
    return { data: null, error }
  }

  const unique = [...new Set(data.map(r => r.topic as string))].sort()
  return { data: unique, error: null }
}

/**
 * Grade a practice answer server-side and record it against the session.
 *
 * Called when the user clicks "Check" in the Questions (practice) tab. The
 * grade_practice_answer RPC (SECURITY DEFINER) verifies the session belongs to
 * the caller, records the answer with a server-computed is_correct, and returns
 * the outcome plus the correct option — so the browser never holds the key
 * before the answer is submitted. Feeds dashboard accuracy metrics + activity.
 */
export async function gradePracticeAnswer(
  sessionId: string,
  questionId: string,
  selectedOption: OptionLetter
) {
  const { data, error } = await supabase.rpc('grade_practice_answer', {
    p_session_id: sessionId,
    p_question_id: questionId,
    p_selected_option: selectedOption,
  })

  return {
    data: data as { is_correct: boolean; correct_option: OptionLetter } | null,
    error,
  }
}
