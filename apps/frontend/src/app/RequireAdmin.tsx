import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/components/useAuth'

interface RequireAdminProps {
  children: ReactNode
}

/**
 * Hides administrative UI unless the signed Auth app_metadata claim says
 * admin. Database RPCs repeat this check and remain the authority boundary.
 */
export default function RequireAdmin({ children }: RequireAdminProps) {
  const { user } = useAuth()

  if (user?.app_metadata?.role !== 'admin') {
    return <Navigate to="/app/dashboard" replace />
  }

  return <>{children}</>
}
