export type UgcReportType = 'post' | 'comment' | 'user'
export type UgcReportStatus = 'pending' | 'reviewing' | 'actioned' | 'dismissed'

export interface UgcModerationReport {
  report_type: UgcReportType
  report_id: string
  reporter_id: string
  reporter_username: string | null
  target_id: string
  context_id: string
  target_author_id: string | null
  target_username: string | null
  target_excerpt: string | null
  reason_code: string | null
  reason_details: string | null
  legacy_reason: string | null
  status: UgcReportStatus
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  review_note: string | null
  review_revision: number
}
