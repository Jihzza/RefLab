import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Receipt } from 'lucide-react'
import { useInvoices } from '../hooks/useInvoices'

/** Format cents to EUR display string */
function formatAmount(amountInCents: number, currency: string): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100)
}

/** Format unix timestamp to readable date */
function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Status badge color mapping */
function getStatusStyle(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-(--success)/20 text-(--success)'
    case 'open':
      return 'bg-(--warning)/20 text-(--warning)'
    case 'void':
    case 'uncollectible':
      return 'bg-(--error)/20 text-(--error)'
    default:
      return 'bg-(--bg-surface-2) text-(--text-muted)'
  }
}

export default function InvoiceHistory() {
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
    <section aria-label="Purchase history">
      {/* Collapsible header */}
      <button
        onClick={handleToggle}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between py-3 px-4 bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) text-(--text-primary) hover:bg-(--bg-hover) transition-colors"
      >
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-(--text-muted)" aria-hidden="true" />
          <span className="text-sm font-semibold">Purchase History</span>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-(--text-muted)" aria-hidden="true" />
          : <ChevronDown className="w-4 h-4 text-(--text-muted)" aria-hidden="true" />
        }
      </button>

      {/* Content (visible when expanded) */}
      {expanded && (
        <div className="mt-2 bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) overflow-hidden">
          {/* Loading skeleton */}
          {loading && (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center justify-between">
                  <div className="flex gap-3">
                    <div className="h-4 w-20 bg-(--bg-surface-2) rounded" />
                    <div className="h-4 w-14 bg-(--bg-surface-2) rounded" />
                  </div>
                  <div className="h-4 w-12 bg-(--bg-surface-2) rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="p-4">
              <p className="text-(--error) text-sm">{error}</p>
              <button
                onClick={() => fetchInvoices()}
                className="mt-2 text-sm text-(--brand-yellow) hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && invoices.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-sm text-(--text-muted)">No transactions yet.</p>
            </div>
          )}

          {/* Invoice list */}
          {!loading && !error && invoices.length > 0 && (
            <ul>
              {invoices.map((invoice) => (
                <li
                  key={invoice.id}
                  className="flex items-center justify-between px-4 py-3 border-b border-(--border-subtle) last:border-b-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm text-(--text-secondary) shrink-0">
                      {formatDate(invoice.created)}
                    </span>
                    <span className="text-sm font-medium text-(--text-primary) shrink-0">
                      {formatAmount(invoice.amount_paid, invoice.currency)}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${getStatusStyle(invoice.status ?? '')}`}
                    >
                      {invoice.status}
                    </span>
                  </div>

                  {invoice.hosted_invoice_url && (
                    <a
                      href={invoice.hosted_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View invoice from ${formatDate(invoice.created)}`}
                      className="flex items-center gap-1 text-xs text-(--brand-yellow) hover:underline shrink-0 ml-2"
                    >
                      View
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
