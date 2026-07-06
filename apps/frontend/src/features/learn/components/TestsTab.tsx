import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileText, ChevronRight } from 'lucide-react'
import { getTests } from '../api/testsApi'
import type { Test } from '../types'

/**
 * TestsTab - Displays the list of available tests
 *
 * Fetches tests from Supabase and displays them as clickable cards.
 * For now, clicking a test just logs to console - we'll add navigation later.
 */
export default function TestsTab() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch tests on component mount
  useEffect(() => {
    async function fetchTests() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await getTests()

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setTests(data || [])
      }

      setLoading(false)
    }

    fetchTests()
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-3">
          <div className="skeleton h-[88px] rounded-(--radius-card)"></div>
          <div className="skeleton h-[88px] rounded-(--radius-card)"></div>
          <div className="skeleton h-[88px] rounded-(--radius-card)"></div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="card-console border-l-2 border-l-(--error) p-4">
          <p className="text-(--error) font-medium">{t('Error loading tests: {{error}}', { error })}</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (tests.length === 0) {
    return (
      <div className="p-6">
        <div className="card-console flex flex-col items-center py-14 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-(--radius-card) border border-(--border-subtle) bg-(--bg-surface-2)">
            <FileText className="h-5 w-5 text-(--text-muted)" aria-hidden="true" />
          </div>
          <p className="text-(--text-muted)">{t('No tests available yet.')}</p>
        </div>
      </div>
    )
  }

  // Tests list
  return (
    <div className="p-6">
      <div className="grid gap-3">
        {tests.map((test) => (
          <button
            key={test.id}
            onClick={() => navigate(`/app/learn/test/${test.slug}`)}
            className="group card-console flex items-center gap-4 w-full text-left p-5 transition-colors hover:border-(--border-strong)"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-(--radius-button) border border-(--border-subtle) bg-(--bg-surface-2) text-(--brand-yellow) transition-colors group-hover:border-(--brand-yellow)/40">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-(--text-primary)">{test.title}</h3>
              <p className="mt-0.5 text-sm text-(--text-muted)">
                {t('Click to start test')}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-(--text-faint) transition-colors group-hover:text-(--brand-yellow)" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}
