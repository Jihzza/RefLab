import { supabase } from '@/lib/supabaseClient'
import type { Test, TestQuestion, TestAttempt, TestAttemptAnswer, OptionLetter, VideoScenario, TopicPerformance, TestKPIs } from '../types'

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
 * Returns questions ordered by order_index (1, 2, 3, etc.)
 */
export async function getQuestions(testId: string) {
  const { data, error } = await supabase
    .from('test_questions')
    .select('*')
    .eq('test_id', testId)
    .order('order_index')

  return { data: data as TestQuestion[] | null, error }
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
 * This will:
 * 1. Calculate the score by comparing answers to correct options
 * 2. Update the attempt with the score and mark as submitted
 * 3. Mark each answer as correct/incorrect
 */
export async function submitAttempt(attemptId: string) {
  // Get all answers for this attempt with their questions
  const { data: answers, error: answersError } = await supabase
    .from('test_attempt_answers')
    .select(`
      id,
      question_id,
      selected_option,
      test_questions!inner (
        correct_option
      )
    `)
    .eq('attempt_id', attemptId)

  if (answersError || !answers) {
    return { data: null, error: answersError }
  }

  // Calculate score
  let correct = 0
  const total = answers.length

  // Update each answer with is_correct
  for (const answer of answers) {
    const question = answer.test_questions as unknown as { correct_option: string }
    const isCorrect = answer.selected_option === question.correct_option

    if (isCorrect) correct++

    await supabase
      .from('test_attempt_answers')
      .update({ is_correct: isCorrect })
      .eq('id', answer.id)
  }

  const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0

  // Update the attempt
  const { data: updatedAttempt, error: updateError } = await supabase
    .from('test_attempts')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      score_correct: correct,
      score_total: total,
      score_percent: scorePercent,
    })
    .eq('id', attemptId)
    .select()
    .single()

  return { data: updatedAttempt as TestAttempt | null, error: updateError }
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
 * Fetch all questions across all active tests (for practice mode)
 */
export async function getAllQuestions() {
  const { data, error } = await supabase
    .from('test_questions')
    .select('*')

  return { data: data as TestQuestion[] | null, error }
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
 * Get the public URL for a video file stored in the "Learn Videos" bucket.
 *
 * The video_url column stores just the filename (e.g., "penalty-area-challenge.mp4").
 * This function builds the full Supabase Storage public URL.
 */
export function getVideoPublicUrl(filename: string): string {
  const { data } = supabase.storage.from('learn-videos').getPublicUrl(filename)
  return data.publicUrl
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
 * Save a practice question answer
 *
 * Called when the user clicks "Check" in the Questions (practice) tab.
 * This feeds into dashboard metrics: Overall Accuracy, Accuracy by Topic,
 * Accuracy Change, Total Questions Answered, and activity tracking.
 */
export async function savePracticeAnswer(
  questionId: string,
  selectedOption: OptionLetter,
  isCorrect: boolean
) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  const { data, error } = await supabase
    .from('question_practice_answers')
    .insert({
      user_id: user.id,
      question_id: questionId,
      selected_option: selectedOption,
      is_correct: isCorrect,
    })
    .select()
    .single()

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
 */
export async function submitRandomTest(
  attemptId: string,
  timeElapsedSeconds: number,
  autoSubmitted: boolean
) {
  // Get all answers with their questions
  const { data: answers, error: answersError } = await supabase
    .from('test_attempt_answers')
    .select(`
      id,
      question_id,
      selected_option,
      test_questions!inner (correct_option)
    `)
    .eq('attempt_id', attemptId)

  if (answersError || !answers) {
    return { data: null, error: answersError }
  }

  // Calculate score
  let correct = 0
  const total = answers.length

  // Update each answer with is_correct
  for (const answer of answers) {
    const question = answer.test_questions as unknown as { correct_option: string }
    const isCorrect = answer.selected_option === question.correct_option

    if (isCorrect) correct++

    await supabase
      .from('test_attempt_answers')
      .update({ is_correct: isCorrect })
      .eq('id', answer.id)
  }

  const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0

  // Update attempt with score and timing
  const { data: updatedAttempt, error: updateError } = await supabase
    .from('test_attempts')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      score_correct: correct,
      score_total: total,
      score_percent: scorePercent,
      time_elapsed_seconds: timeElapsedSeconds,
      auto_submitted: autoSubmitted,
    })
    .eq('id', attemptId)
    .select()
    .single()

  return { data: updatedAttempt as TestAttempt | null, error: updateError }
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
