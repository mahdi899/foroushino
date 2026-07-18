import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'

/** True after zustand persist has rehydrated from localStorage. */
export function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useStore.persist.hasHydrated())

  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true))
    setHydrated(useStore.persist.hasHydrated())
    return unsub
  }, [])

  return hydrated
}
