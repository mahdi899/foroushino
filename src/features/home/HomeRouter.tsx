import { useStore } from '@/store/useStore'
import { HomeScreen } from './HomeScreen'
import { ManagementHome } from './ManagementHome'

export function HomeRouter() {
  const role = useStore((s) => s.role)
  return role === 'agent' ? <HomeScreen /> : <ManagementHome />
}
