import { useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  ExternalLink,
  Receipt,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, EmptyState, Skeleton, Surface } from '@/components/ui'
import { useInvoices } from '../hooks/useInvoices'

function formatAmount(amountInCents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100)
}

function formatDate(timestamp: number, locale: string): string {
  return new Date(timestamp * 1000).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'paid') return 'success'
  if (status === 'open') return 'warning'
  if (status === 'void' || status === 'uncollectible') return 'danger'
  return 'neutral'
}

export default function InvoiceHistory() {
  const { t, i18n } = useTranslation()
  const { invoices, loading, error, hasMore, fetchInvoices } = useInvoices()
  const [expanded, setExpanded] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const locale = i18n.language || 'pt-PT'

  const handleToggle = () => {
    const willExpand = !expanded
    setExpanded(willExpand)

    if (willExpand && !hasFetched) {
      setHasFetched(true)
      void fetchInvoices()
    }
  }

  return (
    <section aria-labelledby="invoice-history-title">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-controls="invoice-history-content"
        className="mc-interactive mc-focus-ring flex min-h-14 w-full items-center justify-between gap-4 rounded-(--mc-radius-button) border border-(--mc-color-border-strong) bg-(--mc-color-surface) px-4 py-3 text-left text-(--mc-color-text) hover:border-(--mc-color-accent)/50 hover:bg-(--mc-color-surface-hover) sm:px-5"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-(--mc-radius-compact) border border-(--mc-color-accent)/40 bg-(--mc-color-accent)/10 text-(--mc-color-accent)" aria-hidden="true">
            <Receipt className="size-5" />
          </span>
          <span id="invoice-history-title" className="font-semibold">
            {t('Purchase History')}
          </span>
        </span>
        {expanded ? (
          <ChevronUp className="size-5 shrink-0 text-(--mc-color-accent)" aria-hidden="true" />
        ) : (
          <ChevronRight className="size-5 shrink-0 text-(--mc-color-text-muted)" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <Surface
          id="invoice-history-content"
          padding="none"
          className="mt-3 overflow-hidden border-(--mc-color-border-strong) shadow-none"
        >
          {loading && invoices.length === 0 && (
            <div className="space-y-3 p-4" role="status" aria-label={t('Loading...')}>
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton variant="text" width="55%" />
                    <Skeleton variant="text" width="35%" height="0.7rem" />
                  </div>
                  <Skeleton variant="text" width="4rem" />
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <EmptyState
              icon={<AlertTriangle className="size-5 text-(--mc-color-danger)" />}
              title={t('Failed to load invoices.')}
              description={error}
              action={
                <Button variant="secondary" onClick={() => void fetchInvoices()}>
                  {t('Try Again')}
                </Button>
              }
            />
          )}

          {!loading && !error && invoices.length === 0 && (
            <EmptyState
              icon={<Receipt className="size-5" />}
              title={t('No transactions yet.')}
            />
          )}

          {!error && invoices.length > 0 && (
            <>
              <ul className="divide-y divide-(--mc-color-border)">
                {invoices.map((invoice) => {
                  const date = formatDate(invoice.created, locale)

                  return (
                    <li key={invoice.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold tabular-nums text-(--mc-color-text)">
                            {formatAmount(invoice.amount_paid, invoice.currency, locale)}
                          </p>
                          {invoice.status && (
                            <Badge variant={getStatusVariant(invoice.status)} size="sm">
                              {t(invoice.status)}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-(--mc-color-text-muted)">
                          <time dateTime={new Date(invoice.created * 1000).toISOString()}>{date}</time>
                          {invoice.number && ` · ${invoice.number}`}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {invoice.hosted_invoice_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(invoice.hosted_invoice_url!, '_blank', 'noopener,noreferrer')}
                            trailingIcon={<ExternalLink className="size-3.5" />}
                            aria-label={t('View invoice from {{date}}', { date })}
                          >
                            {t('View')}
                          </Button>
                        )}
                        {invoice.invoice_pdf && (
                          <a
                            href={invoice.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mc-focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-(--mc-radius-button) px-3 py-1.5 text-xs font-semibold text-(--mc-color-accent) hover:bg-(--mc-color-surface-hover)"
                            aria-label={t('Download invoice from {{date}}', { date })}
                          >
                            <Download className="size-3.5" aria-hidden="true" />
                            {t('Download')}
                          </a>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>

              {hasMore && (
                <div className="border-t border-(--mc-color-border) p-3 text-center">
                  <Button
                    variant="ghost"
                    onClick={() => void fetchInvoices(invoices.length + 10)}
                    loading={loading}
                    loadingText={t('Loading...')}
                    trailingIcon={<ChevronDown className="size-4" />}
                  >
                    {t('Load more')}
                  </Button>
                </div>
              )}
            </>
          )}
        </Surface>
      )}
    </section>
  )
}
