import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Navigate back when in-app history exists; otherwise go to a safe fallback route.
 * Avoids exiting Telegram Mini App / PWA when the stack is empty.
 */
export function useSmartBack(fallback = '/home') {
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(() => {
    // React Router marks the first entry as key "default".
    if (location.key !== 'default') {
      navigate(-1)
      return
    }

    navigate(fallback, { replace: true })
  }, [fallback, location.key, navigate])
}
