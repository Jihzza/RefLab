import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/components/useAuth'
import { fetchDashboardStats } from '../api/dashboardApi'
import type { DashboardStats, UseDashboardReturn } from '../types'

/**
 * Hook that fetches and manages all dashboard statistics.
 * Re-fetches every time the user navigates to the dashboard page,
 * ensuring fresh data after completing tests or video analyses.
 */
export function useDashboard(): UseDashboardReturn {
  const { user } = useAuth()
  const location = useLocation()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all dashboard stats
  const loadStats = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await fetchDashboardStats(user.id)

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setStats(data)
    setLoading(false)
  }, [user?.id])

  // Load on mount and whenever the user navigates to the dashboard
  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    let cancelled = false

    setLoading(true)
    setError(null)

    fetchDashboardStats(user.id).then(({ data, error: fetchError }) => {
      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setStats(data)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [user?.id, location.pathname])

  // Manual refresh
  const refresh = useCallback(async () => {
    await loadStats()
  }, [loadStats])

  return { stats, loading, error, refresh }
}
