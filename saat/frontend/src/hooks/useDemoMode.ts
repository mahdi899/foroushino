import { useEffect, useState } from 'react'
import { fetchDemoAccounts, type DemoAccount } from '@/services/auth'

export function useDemoMode() {
  const [accounts, setAccounts] = useState<DemoAccount[]>([])

  useEffect(() => {
    void fetchDemoAccounts().then(setAccounts)
  }, [])

  return {
    enabled: accounts.length > 0,
    accounts,
  }
}
