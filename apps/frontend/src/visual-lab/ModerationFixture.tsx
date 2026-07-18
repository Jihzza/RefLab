import { useMemo, useState } from 'react'
import {
  ModerationQueueView,
} from '@/features/moderation/components/ModerationPage'
import type {
  UgcModerationReport,
  UgcReportStatus,
} from '@/features/moderation/types'
import FixtureAuthProvider from './FixtureAuthProvider'
import FixtureShell from './FixtureShell'

const fixtureReports: UgcModerationReport[] = [
  {
    report_type: 'post',
    report_id: '41000000-0000-4000-8000-000000000001',
    reporter_id: '42000000-0000-4000-8000-000000000001',
    reporter_username: 'marta.referee',
    target_id: '43000000-0000-4000-8000-000000000001',
    context_id: '43000000-0000-4000-8000-000000000001',
    target_author_id: '44000000-0000-4000-8000-000000000001',
    target_username: 'linha.var',
    target_excerpt: 'Vídeo do lance aos 82 minutos. A legenda inclui uma acusação pessoal sem evidência.',
    reason_code: 'harassment_bullying',
    reason_details: 'A publicação identifica e insulta diretamente um árbitro jovem.',
    legacy_reason: null,
    status: 'pending',
    created_at: '2026-07-15T18:58:00.000Z',
    reviewed_at: null,
    reviewed_by: null,
    review_note: null,
    review_revision: 0,
  },
  {
    report_type: 'comment',
    report_id: '41000000-0000-4000-8000-000000000002',
    reporter_id: '42000000-0000-4000-8000-000000000002',
    reporter_username: 'tiago.var',
    target_id: '45000000-0000-4000-8000-000000000002',
    context_id: '43000000-0000-4000-8000-000000000002',
    target_author_id: '44000000-0000-4000-8000-000000000002',
    target_username: 'apito.total',
    target_excerpt: 'Envia-me mensagem e trato de garantir a tua aprovação no próximo teste.',
    reason_code: 'spam_scam',
    reason_details: 'Parece uma tentativa de fraude dirigida a candidatos.',
    legacy_reason: null,
    status: 'actioned',
    created_at: '2026-07-15T17:42:00.000Z',
    reviewed_at: '2026-07-15T18:20:00.000Z',
    reviewed_by: 'fixture-rafael',
    review_note: 'Ocultado na app; preservar evidência e verificar media associado.',
    review_revision: 1,
  },
  {
    report_type: 'user',
    report_id: '41000000-0000-4000-8000-000000000003',
    reporter_id: '42000000-0000-4000-8000-000000000003',
    reporter_username: 'ines.assistente',
    target_id: '44000000-0000-4000-8000-000000000003',
    context_id: '44000000-0000-4000-8000-000000000003',
    target_author_id: '44000000-0000-4000-8000-000000000003',
    target_username: 'analise.central',
    target_excerpt: null,
    reason_code: 'other',
    reason_details: 'A descrição pareceu enganadora, mas não há atividade suficiente para confirmar.',
    legacy_reason: null,
    status: 'dismissed',
    created_at: '2026-07-15T15:31:00.000Z',
    reviewed_at: '2026-07-15T16:05:00.000Z',
    reviewed_by: 'fixture-rafael',
    review_note: 'Sem evidência de violação neste momento.',
    review_revision: 2,
  },
]

export default function ModerationFixture() {
  const [reports, setReports] = useState(fixtureReports)
  const [status, setStatus] = useState<UgcReportStatus | null>(null)
  const visibleReports = useMemo(
    () => status ? reports.filter((report) => report.status === status) : reports,
    [reports, status],
  )

  return (
    <FixtureAuthProvider>
      <FixtureShell title="Moderação">
        <ModerationQueueView
          reports={visibleReports}
          status={status}
          hasMore
          onStatusChange={setStatus}
          onRefresh={() => undefined}
          onLoadMore={() => undefined}
          onReview={async (report, nextStatus, reviewNote) => {
            setReports((current) => current.map((item) => (
              item.report_id === report.report_id
                ? {
                  ...item,
                  status: nextStatus,
                  review_note: reviewNote,
                  review_revision: item.review_revision + 1,
                }
                : item
            )))
            return { error: null }
          }}
        />
      </FixtureShell>
    </FixtureAuthProvider>
  )
}
