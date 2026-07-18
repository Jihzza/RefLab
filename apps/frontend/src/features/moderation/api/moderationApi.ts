import { supabase } from '@/lib/supabaseClient'
import type {
  UgcModerationReport,
  UgcReportStatus,
  UgcReportType,
} from '../types'

export interface UgcReportCursor {
  createdAt: string
  reportId: string
}

const MODERATION_PAGE_SIZE = 50

export async function listUgcReports(
  status: UgcReportStatus | null,
  cursor: UgcReportCursor | null = null,
): Promise<{
  reports: UgcModerationReport[]
  nextCursor: UgcReportCursor | null
  hasMore: boolean
  error: Error | null
}> {
  const { data, error } = await supabase.rpc('admin_list_ugc_reports', {
    p_status: status,
    p_limit: MODERATION_PAGE_SIZE + 1,
    p_before_created_at: cursor?.createdAt ?? null,
    p_before_id: cursor?.reportId ?? null,
  })

  if (error) {
    return {
      reports: [],
      nextCursor: null,
      hasMore: false,
      error: new Error(error.message),
    }
  }

  const rows = (data ?? []) as UgcModerationReport[]
  const reports = rows.slice(0, MODERATION_PAGE_SIZE)
  const lastReport = reports.at(-1)
  return {
    reports,
    nextCursor: lastReport
      ? { createdAt: lastReport.created_at, reportId: lastReport.report_id }
      : null,
    hasMore: rows.length > MODERATION_PAGE_SIZE,
    error: null,
  }
}

export async function reviewUgcReport(input: {
  expectedReviewerId: string
  reportType: UgcReportType
  reportId: string
  expectedRevision: number
  status: UgcReportStatus
  reviewNote: string | null
}): Promise<{ nextRevision: number | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('admin_review_ugc_report', {
    p_report_type: input.reportType,
    p_report_id: input.reportId,
    p_expected_reviewer_id: input.expectedReviewerId,
    p_expected_review_revision: input.expectedRevision,
    p_status: input.status,
    p_review_note: input.reviewNote,
  })

  if (error) return { nextRevision: null, error: new Error(error.message) }
  if (typeof data !== 'number') {
    return {
      nextRevision: null,
      error: new Error('The server did not return the new review revision.'),
    }
  }

  return { nextRevision: data, error: null }
}
