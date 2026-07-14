import { useStore } from '@/store/useStore'
import { isAgentRole } from '@/lib/roles'
import { HomeScreen } from './HomeScreen'
import { ManagementHome } from './ManagementHome'

export function HomeRouter() {
  const role = useStore((s) => s.role)
  return isAgentRole(role) ? <HomeScreen /> : <ManagementHome />
}
