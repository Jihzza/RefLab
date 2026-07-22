import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Receipt } from 'lucide-react'
import { useInvoices } from '../hooks/useInvoices'
import { useTranslation } from 'react-i18next'
import Badge, { type BadgeVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

/** Format cents to EUR display string */
function formatAmount(amountInCents: number, currency: string): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100)
}

/** Format unix timestamp to readable date */
function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('pt-PT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Status badge color mapping */
function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'paid':
      return 'success'
    case 'open':
      return 'warning'
    case 'void':
    case 'uncollectible':
      return 'danger'
    default:
      return 'neutral'
  }
}

export default function InvoiceHistory() {
  const { t } = useTranslation()
  const { invoices, loading, error, fetchInvoices } = useInvoices()
  const [expanded, setExpanded] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  /** Toggle the section open/closed. Fetch on first expand. */
  const handleToggle = () => {
    const willExpand = !expanded
    setExpanded(willExpand)

    if (willExpand && !hasFetched) {
      setHasFetched(true)
      fetchInvoices()
    }
  }

  return (
    <section aria-label={t('Purchase history')}>
      {/* Collapsible header */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-controls="invoice-history-content"
        className="flex min-h-14 w-full items-center justify-between rounded-(--mc-radius-card) border border-(--mc-color-border) bg-(--mc-color-surface) px-4 py-3 text-(--mc-color-text) shadow-(--mc-shadow-soft) transition-colors hover:border-(--mc-color-border-strong) hover:bg-(--mc-color-surface-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus)"
      >
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-(--mc-radius-compact) bg-(--mc-color-surface-raised) text-(--mc-color-accent)">
            <Receipt className="size-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold">{t('Purchase History')}</span>
        </div>
        {expanded
          ? <ChevronUp className="size-4 text-(--mc-color-text-muted)" aria-hidden="true" />
          : <ChevronDown className="size-4 text-(--mc-color-text-muted)" aria-hidden="true" />
        }
      </button>

      {/* Content (visible when expanded) */}
      {expanded && (
        <div id="invoice-history-content" className="mt-2 overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border) bg-(--mc-color-surface)">
          {/* Loading skeleton */}
          {loading && (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center justify-between">
                  <div className="flex gap-3">
                    <div className="h-4 w-20 rounded bg-(--mc-color-surface-raised)" />
                    <div className="h-4 w-14 rounded bg-(--mc-color-surface-raised)" />
                  </div>
                  <div className="h-4 w-12 rounded bg-(--mc-color-surface-raised)" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="p-4">
              <p className="text-sm text-(--mc-color-danger)" role="alert">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fetchInvoices()}
                className="mt-3"
              >
                {t('Retry')}
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && invoices.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-sm text-(--mc-color-text-muted)">{t('No transactions yet.')}</p>
            </div>
          )}

          {/* Invoice list */}
          {!loading && !error && invoices.length > 0 && (
            <ul>
              {invoices.map((invoice) => (
                <li
                  key={invoice.id}
                  className="flex flex-col gap-2 border-b border-(--mc-color-border) px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="mc-tabular shrink-0 text-sm text-(--mc-color-text-secondary)">
                      {formatDate(invoice.created)}
                    </span>
                    <span className="mc-tabular shrink-0 text-sm font-semibold text-(--mc-color-text)">
                      {formatAmount(invoice.amount_paid, invoice.currency)}
                    </span>
                    <Badge variant={getStatusVariant(invoice.status ?? '')} size="sm" className="capitalize">
                      {invoice.status}
                    </Badge>
                  </div>

                  {invoice.hosted_invoice_url && (
                    <a
                      href={invoice.hosted_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${t('View')}: ${formatDate(invoice.created)}`}
                      className="inline-flex min-h-9 shrink-0 items-center gap-1 self-start rounded-(--mc-radius-button) px-2 text-xs font-semibold text-(--mc-color-accent) hover:bg-(--mc-color-accent)/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) sm:ml-2 sm:self-auto"
                    >
                      {t('View')}
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
