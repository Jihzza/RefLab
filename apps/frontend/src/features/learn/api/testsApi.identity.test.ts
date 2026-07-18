import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  single: vi.fn(),
}))

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    rpc: mocks.rpc,
  },
}))

import {
  createQuestionSession,
  generateRandomTest,
  getOrCreateAttempt,
  saveVideoAttempt,
} from './testsApi'

const USER_A = '10000000-0000-4000-8000-000000000001'
const RESOURCE_ID = '20000000-0000-4000-8000-000000000001'

describe('learning start RPC auth boundaries', () => {
  beforeEach(() => {
    mocks.rpc.mockReset()
    mocks.single.mockReset().mockResolvedValue({ data: null, error: null })
  })

  it('passes the captured learner to concrete and random test starts', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null })

    await getOrCreateAttempt(RESOURCE_ID, USER_A)
    await generateRandomTest(USER_A)

    expect(mocks.rpc).toHaveBeenNthCalledWith(1, 'start_or_resume_test_attempt', {
      p_test_id: RESOURCE_ID,
      p_expected_user_id: USER_A,
    })
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, 'start_or_resume_random_test_attempt', {
      p_expected_user_id: USER_A,
    })
  })

  it('passes the captured learner to question and video activity writes', async () => {
    mocks.rpc.mockReturnValue({ single: mocks.single })

    await createQuestionSession(RESOURCE_ID, USER_A, 'quick', null, null)
    await saveVideoAttempt(RESOURCE_ID, USER_A, RESOURCE_ID, 'Retake', 'No card')

    expect(mocks.rpc).toHaveBeenNthCalledWith(1, 'start_question_session', {
      p_session_id: RESOURCE_ID,
      p_expected_user_id: USER_A,
      p_mode: 'quick',
      p_filter_laws: null,
      p_filter_areas: null,
    })
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, 'save_video_attempt', {
      p_attempt_id: RESOURCE_ID,
      p_expected_user_id: USER_A,
      p_scenario_id: RESOURCE_ID,
      p_selected_action: 'Retake',
      p_selected_sanction: 'No card',
    })
  })
})
