import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTests } from '../api/testsApi'
import type { Test } from '../types'

/**
 * TestsTab - Displays the list of available tests
 *
 * Fetches tests from Supabase and displays them as clickable cards.
 * For now, clicking a test just logs to console - we'll add navigation later.
 */
export default function TestsTab() {
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
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-(--bg-surface-2) rounded-(--radius-card)"></div>
          <div className="h-24 bg-(--bg-surface-2) rounded-(--radius-card)"></div>
          <div className="h-24 bg-(--bg-surface-2) rounded-(--radius-card)"></div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-(--error)">Error loading tests: {error}</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (tests.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-(--text-muted)">No tests available yet.</p>
        </div>
      </div>
    )
  }

  // Tests list
  return (
    <div className="p-6">
      <div className="grid gap-4">
        {tests.map((test) => (
          <button
            key={test.id}
            onClick={() => navigate(`/app/learn/test/${test.slug}`)}
            className="w-full text-left bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-6 hover:border-(--info) hover:shadow-sm transition-all"
          >
            <h3 className="text-lg font-semibold text-(--text-primary)">{test.title}</h3>
            <p className="mt-1 text-sm text-(--text-muted)">
              Click to start test
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
