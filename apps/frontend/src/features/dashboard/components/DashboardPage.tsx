import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/components/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import DashboardSkeleton from './DashboardSkeleton'
import DashboardView from './DashboardView'

/**
 * Data container for the Match Control dashboard. All visual rendering lives in
 * DashboardView so deterministic fixtures can exercise the same presentation.
 */
export default function DashboardPage() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const { stats, loading, error, refresh } = useDashboard()

  const displayName =
    profile?.name?.trim() ||
    profile?.username?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    null

  if (loading && !stats) {
    return <DashboardSkeleton />
  }

  return (
    <DashboardView
      stats={stats}
      displayName={displayName}
      error={error}
      retrying={loading}
      onRetry={refresh}
      onStartTraining={() => navigate('/app/learn?action=start-test')}
    />
  )
}
