import { supabase } from '@/lib/supabaseClient'
import type { Test, TestQuestion, TestAttempt, TestAttemptAnswer, TestAttemptLaunchPayload, OptionLetter, VideoScenario, VideoAttempt, TopicPerformance, QuestionPracticeAnswer, QuestionSession, QuestionSessionMode, QuestionSessionKPIs } from '../types'

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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Resolve a test route reference. Normal links use a slug, while system
 * notifications store the test UUID in `reference_id`.
 */
export async function getTestByReference(reference: string) {
  if (!UUID_PATTERN.test(reference)) return getTestBySlug(reference)

  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('id', reference)
    .single()

  return { data: data as Test | null, error }
}

/**
 * Fetch all questions for a test
 *
 * Queries the bridge table test_question_items to get the ordered
 * question_bank entries for the given test.
 */
export async function getQuestions(testId: string) {
  const { data, error } = await supabase
    .from('test_question_items')
    .select('order_index, question_bank!inner(*)')
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
 * The database RPC serializes concurrent callers, enforces one open attempt,
 * and returns the immutable question order plus persisted answers in the same
 * transaction. This keeps React StrictMode and multi-tab starts idempotent.
 */
export async function getOrCreateAttempt(testId: string, expectedUserId: string) {
  const { data, error } = await supabase.rpc('start_or_resume_test_attempt', {
    p_test_id: testId,
    p_expected_user_id: expectedUserId,
  })

  return { data: data as TestAttemptLaunchPayload | null, error }
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
 * The RPC locks the attempt row and makes an identical retry idempotent.
 * Concrete-test choices remain revisable until submit; timed random-test
 * choices are immutable after their first successful save.
 */
export async function saveAnswer(
  attemptId: string,
  questionId: string,
  selectedOption: OptionLetter
) {
  const { data, error } = await supabase
    .rpc('save_test_attempt_answer', {
      p_attempt_id: attemptId,
      p_question_id: questionId,
      p_selected_option: selectedOption,
    })
    .single()

  return { data: data as TestAttemptAnswer | null, error }
}

/**
 * Submit an attempt (finish the test)
 *
 * Grading, answer updates, score calculation, timing, and the status transition
 * happen atomically in PostgreSQL. A repeated submission returns the same row.
 */
export async function submitAttempt(attemptId: string) {
  const { data, error } = await supabase
    .rpc('submit_test_attempt', {
      p_attempt_id: attemptId,
    })
    .single()

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
 * Get the public URL for a video file in the reviewed Supabase Storage bucket.
 *
 * The video_url column stores only the object name. The bucket's launch access
 * model is a release gate; no storage or service-role secret reaches the app.
 */
export function getVideoPublicUrl(filename: string): string {
  return supabase.storage.from('learn-videos').getPublicUrl(filename).data.publicUrl
}

/**
 * Save a video attempt. The database derives all correctness fields from the
 * active scenario. A stable caller-generated id makes exact retries safe.
 */
export async function saveVideoAttempt(
  attemptId: string,
  expectedUserId: string,
  scenarioId: string,
  selectedAction: string,
  selectedSanction: string
) {
  const { data, error } = await supabase
    .rpc('save_video_attempt', {
      p_attempt_id: attemptId,
      p_expected_user_id: expectedUserId,
      p_scenario_id: scenarioId,
      p_selected_action: selectedAction,
      p_selected_sanction: selectedSanction,
    })
    .single()

  return { data: data as VideoAttempt | null, error }
}

/**
 * Start or resume a random test with an immutable, persisted question order.
 */
export async function generateRandomTest(expectedUserId: string) {
  const { data, error } = await supabase.rpc('start_or_resume_random_test_attempt', {
    p_expected_user_id: expectedUserId,
  })

  return { data: data as TestAttemptLaunchPayload | null, error }
}

/**
 * Submit random test with timing data
 */
export async function submitRandomTest(
  attemptId: string,
) {
  const { data, error } = await supabase
    .rpc('submit_test_attempt', {
      p_attempt_id: attemptId,
    })
    .single()

  return { data: data as TestAttempt | null, error }
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

  // Tests completed this week (from the current Monday, including Sunday).
  const weekStart = new Date()
  const day = weekStart.getDay()
  const daysToMonday = day === 0 ? 6 : day - 1
  weekStart.setDate(weekStart.getDate() - daysToMonday)
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
      bestScore: bestTest?.score_percent ?? null,
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
  sessionId: string,
  expectedUserId: string,
  mode: QuestionSessionMode,
  filterLaws: number[] | null,
  filterAreas: string[] | null
) {
  const { data, error } = await supabase
    .rpc('start_question_session', {
      p_session_id: sessionId,
      p_expected_user_id: expectedUserId,
      p_mode: mode,
      p_filter_laws: filterLaws,
      p_filter_areas: filterAreas,
    })
    .single()

  return { data: data as QuestionSession | null, error }
}

/**
 * Mark a question session as complete
 *
 * Called when the user clicks "End Session". Writes the final score and duration.
 */
export async function completeQuestionSession(
  sessionId: string
) {
  const { data, error } = await supabase
    .rpc('complete_question_session', { p_session_id: sessionId })
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
    .gt('total_answered', 0)
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
  let query = supabase
    .from('question_bank')
    .select('*')
    .eq('is_active', true)

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
    .eq('is_active', true)
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
    .eq('is_active', true)
    .not('topic', 'is', null)

  if (error || !data) {
    return { data: null, error }
  }

  const unique = [...new Set(data.map(r => r.topic as string))].sort()
  return { data: unique, error: null }
}

/**
 * Save a practice answer linked to an open session. The database validates the
 * question against that session and derives is_correct from question_bank.
 */
export async function saveQuestionPracticeAnswer(
  answerId: string,
  questionId: string,
  selectedOption: OptionLetter,
  sessionId: string
) {
  const { data, error } = await supabase
    .rpc('save_question_practice_answer', {
      p_answer_id: answerId,
      p_session_id: sessionId,
      p_question_id: questionId,
      p_selected_option: selectedOption,
    })
    .single()

  return { data: data as QuestionPracticeAnswer | null, error }
}
