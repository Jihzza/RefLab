import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getQuestions, submitAttempt } from './testsApi'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: mocks.from,
    auth: { getUser: vi.fn() },
    functions: { invoke: vi.fn() },
    rpc: vi.fn(),
  },
}))

function gradeUpdate(result: { data: unknown; error: Error | null }) {
  const single = vi.fn().mockResolvedValue(result)
  const select = vi.fn(() => ({ single }))
  const secondEq = vi.fn(() => ({ select }))
  const firstEq = vi.fn(() => ({ eq: secondEq }))
  const update = vi.fn(() => ({ eq: firstEq }))
  return { update, firstEq, secondEq, select, single }
}

describe('testsApi production schema compatibility', () => {
  beforeEach(() => {
    mocks.from.mockReset()
  })

  it('loads fixed-test questions from the live test_questions table', async () => {
    const questions = [{ id: 'question-1', question_text: 'Question 1' }]
    const order = vi.fn().mockResolvedValue({ data: questions, error: null })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    mocks.from.mockReturnValueOnce({ select })

    const result = await getQuestions('test-1')

    expect(mocks.from).toHaveBeenCalledWith('test_questions')
    expect(select).toHaveBeenCalledWith('*')
    expect(eq).toHaveBeenCalledWith('test_id', 'test-1')
    expect(order).toHaveBeenCalledWith('order_index')
    expect(result).toEqual({ data: questions, error: null })
  })

  it('never marks an attempt submitted when grading an answer fails', async () => {
    const gradeFailure = new Error('grade update rejected')
    const answers = [
      {
        id: 'answer-1',
        selected_option: 'A',
        question_bank: { correct_option: 'A' },
      },
      {
        id: 'answer-2',
        selected_option: 'B',
        question_bank: { correct_option: 'C' },
      },
    ]
    const answerEq = vi.fn().mockResolvedValue({ data: answers, error: null })
    const answerSelect = vi.fn((columns: string) => {
      void columns
      return { eq: answerEq }
    })
    const firstGrade = gradeUpdate({ data: { id: 'answer-1' }, error: null })
    const secondGrade = gradeUpdate({ data: null, error: gradeFailure })

    mocks.from
      .mockReturnValueOnce({ select: answerSelect })
      .mockReturnValueOnce({ update: firstGrade.update })
      .mockReturnValueOnce({ update: secondGrade.update })

    const result = await submitAttempt('attempt-1')

    expect(answerSelect.mock.calls[0]?.[0]).toContain('question_bank!inner')
    expect(firstGrade.firstEq).toHaveBeenCalledWith('id', 'answer-1')
    expect(firstGrade.secondEq).toHaveBeenCalledWith('attempt_id', 'attempt-1')
    expect(secondGrade.firstEq).toHaveBeenCalledWith('id', 'answer-2')
    expect(result).toEqual({ data: null, error: gradeFailure })
    expect(mocks.from).not.toHaveBeenCalledWith('test_attempts')
  })
})
