import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ExternalLink, Flag, RefreshCw, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Surface } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import {
  listUgcReports,
  reviewUgcReport,
  type UgcReportCursor,
} from '../api/moderationApi'
import type {
  UgcModerationReport,
  UgcReportStatus,
  UgcReportType,
} from '../types'

const REVIEW_NOTE_MAX_LENGTH = 1000

const STATUS_OPTIONS: readonly { value: UgcReportStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All reports' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'actioned', label: 'Actioned' },
  { value: 'dismissed', label: 'Dismissed' },
]

const STATUS_BADGE_VARIANTS = {
  pending: 'warning',
  reviewing: 'info',
  actioned: 'danger',
  dismissed: 'neutral',
} as const

const TYPE_LABELS: Record<UgcReportType, string> = {
  post: 'Post report',
  comment: 'Comment report',
  user: 'User report',
}

const REASON_LABELS: Record<string, string> = {
  spam_scam: 'Spam or scam',
  harassment_bullying: 'Harassment or bullying',
  inappropriate_content: 'Inappropriate content',
  other: 'Other',
}

function reportTarget(report: UgcModerationReport): string | null {
  if (report.report_type === 'user') {
    return report.target_username
      ? `/app/profile/${encodeURIComponent(report.target_username)}`
      : null
  }
  return report.context_id ? `/app/post/${report.context_id}` : null
}

interface ReportCardProps {
  report: UgcModerationReport
  onReview: (
    report: UgcModerationReport,
    status: UgcReportStatus,
    reviewNote: string | null,
  ) => Promise<{ error: Error | null }>
}

function ReportCard({ report, onReview }: ReportCardProps) {
  const { t } = useTranslation()
  const allowedStatuses = useMemo(
    () => STATUS_OPTIONS.filter((option) => (
      option.value !== 'all'
      && !(report.report_type === 'user' && option.value === 'actioned')
    )),
    [report.report_type],
  )
  const [status, setStatus] = useState<UgcReportStatus>(report.status)
  const [note, setNote] = useState(report.review_note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const targetPath = reportTarget(report)
  const reason = report.reason_code
    ? t(REASON_LABELS[report.reason_code] ?? report.reason_code)
    : report.legacy_reason || t('No reason provided')

  useEffect(() => {
    setStatus(report.status)
    setNote(report.review_note ?? '')
    setError(null)
  }, [report.report_id, report.review_note, report.status])

  const saveReview = async () => {
    setSaving(true)
    setError(null)
    try {
      const result = await onReview(report, status, note.trim() || null)
      if (result.error) setError(result.error.message)
    } catch (reviewError) {
      setError(reviewError instanceof Error
        ? reviewError.message
        : t('Could not save this review.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Surface className="overflow-hidden" padding="none">
      <article aria-labelledby={`moderation-report-${report.report_id}`}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--mc-color-border) p-4 sm:p-5">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_BADGE_VARIANTS[report.status]} dot>
                {t(STATUS_OPTIONS.find((option) => option.value === report.status)?.label ?? report.status)}
              </Badge>
              <Badge variant="neutral">{t(TYPE_LABELS[report.report_type])}</Badge>
            </div>
            <h2
              id={`moderation-report-${report.report_id}`}
              className="break-words text-base font-bold text-(--mc-color-text)"
            >
              {reason}
            </h2>
            <p className="mt-1 text-xs text-(--mc-color-text-muted)">
              {t('Reported by @{{username}} on {{date}}', {
                username: report.reporter_username || t('deleted-account'),
                date: new Intl.DateTimeFormat('pt-PT', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(report.created_at)),
              })}
            </p>
          </div>

          {targetPath ? (
            <Link
              to={targetPath}
              className="mc-focus-ring inline-flex min-h-10 items-center gap-2 rounded-(--mc-radius-button) border border-(--mc-color-border-strong) px-3 py-2 text-xs font-semibold text-(--mc-color-text-secondary) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)"
            >
              {t('Open target')}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          ) : (
            <Badge variant="neutral">{t('Target removed')}</Badge>
          )}
        </div>

        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
          <div className="min-w-0 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--mc-color-text-muted)">
                {t('Reported target')}
              </p>
              <p className="mt-1 break-words text-sm text-(--mc-color-text-secondary)">
                {report.target_username ? `@${report.target_username}` : t('Deleted or unavailable target')}
                <span className="ml-2 font-mono text-[11px] text-(--mc-color-text-muted)">
                  {report.target_id}
                </span>
              </p>
            </div>

            {report.target_excerpt && (
              <blockquote className="rounded-(--mc-radius-input) border-l-2 border-(--mc-color-accent) bg-(--mc-color-canvas) px-4 py-3 text-sm leading-6 text-(--mc-color-text-secondary)">
                {report.target_excerpt}
              </blockquote>
            )}

            {report.reason_details && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--mc-color-text-muted)">
                  {t('Reporter details')}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-(--mc-color-text-secondary)">
                  {report.reason_details}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas)/70 p-4">
            <label className="block" htmlFor={`moderation-status-${report.report_id}`}>
              <span className="mb-1.5 block text-sm font-semibold text-(--mc-color-text)">
                {t('Review status')}
              </span>
              <select
                id={`moderation-status-${report.report_id}`}
                value={status}
                disabled={saving}
                onChange={(event) => {
                  setStatus(event.target.value as UgcReportStatus)
                  setError(null)
                }}
                className="mc-focus-ring min-h-11 w-full rounded-(--mc-radius-input) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) px-3 text-sm text-(--mc-color-text)"
              >
                {allowedStatuses.map((option) => (
                  <option key={option.value} value={option.value}>{t(option.label)}</option>
                ))}
              </select>
            </label>

            <label className="block" htmlFor={`moderation-note-${report.report_id}`}>
              <span className="mb-1.5 block text-sm font-semibold text-(--mc-color-text)">
                {t('Private review note')}
              </span>
              <textarea
                id={`moderation-note-${report.report_id}`}
                rows={4}
                value={note}
                maxLength={REVIEW_NOTE_MAX_LENGTH}
                disabled={saving}
                aria-describedby={`moderation-note-counter-${report.report_id}`}
                onChange={(event) => {
                  setNote(event.target.value)
                  setError(null)
                }}
                className="mc-focus-ring w-full resize-y rounded-(--mc-radius-input) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) px-3 py-2.5 text-sm text-(--mc-color-text)"
              />
            </label>
            <p
              id={`moderation-note-counter-${report.report_id}`}
              className="text-right text-xs tabular-nums text-(--mc-color-text-muted)"
              aria-live="polite"
            >
              {note.length} / {REVIEW_NOTE_MAX_LENGTH}
            </p>

            {status === 'actioned' && report.report_type !== 'user' && (
              <p className="flex gap-2 text-xs leading-5 text-(--mc-color-warning)">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {t('Actioned hides this content from RefLab app surfaces; it does not remove a cached public media URL.')}
              </p>
            )}

            {error && (
              <p role="alert" className="text-sm leading-5 text-(--mc-color-danger)">
                {error}
              </p>
            )}

            <Button
              fullWidth
              loading={saving}
              loadingText={t('Saving review...')}
              leadingIcon={<ShieldCheck className="size-4" />}
              onClick={() => void saveReview()}
            >
              {t('Save review')}
            </Button>
          </div>
        </div>
      </article>
    </Surface>
  )
}

export interface ModerationQueueViewProps {
  reports: UgcModerationReport[]
  status: UgcReportStatus | null
  loading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
  error?: string | null
  onStatusChange: (status: UgcReportStatus | null) => void
  onRefresh: () => void
  onLoadMore?: () => void
  onReview: ReportCardProps['onReview']
}

export function ModerationQueueView({
  reports,
  status,
  loading = false,
  loadingMore = false,
  hasMore = false,
  error = null,
  onStatusChange,
  onRefresh,
  onLoadMore,
  onReview,
}: ModerationQueueViewProps) {
  const { t } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-5 sm:px-6 sm:pt-8">
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-(--mc-color-accent)">
            <Flag className="size-4" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-[0.16em]">{t('Private admin area')}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-(--mc-color-text)">
            {t('Content moderation')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-(--mc-color-text-secondary)">
            {t('Review private reports, preserve evidence and apply reversible visibility decisions.')}
          </p>
        </div>
        <Button
          variant="secondary"
          leadingIcon={<RefreshCw className="size-4" />}
          onClick={onRefresh}
          disabled={loading}
        >
          {t('Refresh queue')}
        </Button>
      </header>

      <div
        role="group"
        aria-label={t('Filter moderation reports')}
        className="mb-5 flex gap-2 overflow-x-auto pb-1"
      >
        {STATUS_OPTIONS.map((option) => {
          const selected = (option.value === 'all' ? null : option.value) === status
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onStatusChange(option.value === 'all' ? null : option.value)}
              className={`mc-focus-ring min-h-10 shrink-0 rounded-(--mc-radius-pill) border px-4 text-sm font-semibold transition-colors motion-reduce:transition-none ${
                selected
                  ? 'border-(--mc-color-accent) bg-(--mc-color-accent)/15 text-(--mc-color-accent)'
                  : 'border-(--mc-color-border) bg-(--mc-color-surface) text-(--mc-color-text-secondary) hover:bg-(--mc-color-surface-hover)'
              }`}
            >
              {t(option.label)}
            </button>
          )
        })}
      </div>

      {error && (
        <Surface role="alert" className="mb-5 border-(--mc-color-danger)/40 bg-(--mc-color-danger)/10">
          <p className="flex items-start gap-2 text-sm text-(--mc-color-danger)">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        </Surface>
      )}

      {loading ? (
        <Surface role="status" aria-live="polite" className="py-12 text-center text-sm text-(--mc-color-text-secondary)">
          {t('Loading moderation queue...')}
        </Surface>
      ) : reports.length === 0 ? (
        <Surface className="py-12 text-center">
          <ShieldCheck className="mx-auto size-8 text-(--mc-color-success)" aria-hidden="true" />
          <h2 className="mt-3 font-bold text-(--mc-color-text)">{t('No reports in this view')}</h2>
          <p className="mt-1 text-sm text-(--mc-color-text-secondary)">{t('The selected moderation queue is clear.')}</p>
        </Surface>
      ) : (
        <>
          <div className="space-y-4">
            {reports.map((report) => (
              <ReportCard key={`${report.report_type}:${report.report_id}`} report={report} onReview={onReview} />
            ))}
          </div>
          {hasMore && onLoadMore && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="secondary"
                loading={loadingMore}
                loadingText={t('Loading more reports...')}
                onClick={onLoadMore}
              >
                {t('Load more reports')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function ModerationPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [status, setStatus] = useState<UgcReportStatus | null>('pending')
  const [reports, setReports] = useState<UgcModerationReport[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<UgcReportCursor | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const loadReports = useCallback(async (
    nextCursor: UgcReportCursor | null = null,
    append = false,
  ) => {
    const requestId = ++requestIdRef.current
    const result = await listUgcReports(status, nextCursor)
    if (requestId !== requestIdRef.current) return
    if (result.error) {
      if (!append) setReports([])
      setError(result.error.message)
    } else {
      setReports((current) => {
        if (!append) return result.reports
        const seen = new Set(current.map((report) => (
          `${report.report_type}:${report.report_id}`
        )))
        return [
          ...current,
          ...result.reports.filter((report) => !seen.has(
            `${report.report_type}:${report.report_id}`,
          )),
        ]
      })
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
    }
    if (append) setLoadingMore(false)
    else setLoading(false)
  }, [status])

  useEffect(() => {
    const requestId = ++requestIdRef.current
    void listUgcReports(status, null).then((result) => {
      if (requestId !== requestIdRef.current) return
      if (result.error) {
        setReports([])
        setError(result.error.message)
      } else {
        setReports(result.reports)
        setCursor(result.nextCursor)
        setHasMore(result.hasMore)
      }
      setLoading(false)
    })
  }, [status])

  const handleReview: ReportCardProps['onReview'] = async (report, nextStatus, reviewNote) => {
    const expectedReviewerId = user?.id
    if (!expectedReviewerId) {
      return { error: new Error(t('Authentication required')) }
    }

    const result = await reviewUgcReport({
      expectedReviewerId,
      reportType: report.report_type,
      reportId: report.report_id,
      expectedRevision: report.review_revision,
      status: nextStatus,
      reviewNote,
    })

    if (result.error || result.nextRevision === null) {
      return { error: result.error ?? new Error(t('Could not save this review.')) }
    }

    setReports((current) => current
      .map((item) => item.report_id === report.report_id
        ? {
          ...item,
          status: nextStatus,
          review_note: reviewNote,
          review_revision: result.nextRevision as number,
          reviewed_at: new Date().toISOString(),
        }
        : item)
      .filter((item) => status === null || item.status === status))

    return { error: null }
  }

  return (
    <ModerationQueueView
      reports={reports}
      status={status}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      error={error}
      onStatusChange={(nextStatus) => {
        setLoading(true)
        setError(null)
        setStatus(nextStatus)
      }}
      onRefresh={() => {
        setLoading(true)
        setError(null)
        void loadReports(null, false)
      }}
      onLoadMore={() => {
        if (cursor && hasMore && !loadingMore) {
          setLoadingMore(true)
          setError(null)
          void loadReports(cursor, true)
        }
      }}
      onReview={handleReview}
    />
  )
}
