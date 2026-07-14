import { Navigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'

export function RequirePermission({
  permission,
  children,
  fallback = '/home',
}: {
  permission: string
  children: React.ReactNode
  fallback?: string
}) {
  const allowed = useStore((s) => s.hasPermission(permission))
  if (!allowed) return <Navigate to={fallback} replace />
  return <>{children}</>
}
