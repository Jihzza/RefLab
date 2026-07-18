import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}))

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { rpc: mocks.rpc },
}))

import { reviewUgcReport } from './moderationApi'

const REVIEWER_A = '10000000-0000-4000-8000-000000000001'
const REPORT_ID = '20000000-0000-4000-8000-000000000001'

describe('reviewUgcReport auth boundary', () => {
  beforeEach(() => {
    mocks.rpc.mockReset().mockResolvedValue({ data: 3, error: null })
  })

  it('binds a queued moderation decision to its captured reviewer', async () => {
    await reviewUgcReport({
      expectedReviewerId: REVIEWER_A,
      reportType: 'post',
      reportId: REPORT_ID,
      expectedRevision: 2,
      status: 'dismissed',
      reviewNote: 'Reviewed by account A',
    })

    expect(mocks.rpc).toHaveBeenCalledWith('admin_review_ugc_report', {
      p_report_type: 'post',
      p_report_id: REPORT_ID,
      p_expected_reviewer_id: REVIEWER_A,
      p_expected_review_revision: 2,
      p_status: 'dismissed',
      p_review_note: 'Reviewed by account A',
    })
  })
})
