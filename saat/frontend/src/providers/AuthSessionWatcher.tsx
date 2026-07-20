import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '@/services/auth'
import { registerUnauthorizedHandler } from '@/services/authSession'
import { useStore } from '@/store/useStore'

/** Keeps client auth state aligned with the API token and redirects on expiry. */
export function AuthSessionWatcher() {
  const navigate = useNavigate()
  const isAuthed = useStore((s) => s.isAuthed)
  const logout = useStore((s) => s.logout)
  const pushToast = useStore((s) => s.pushToast)

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      pushToast('نشست منقضی شده. دوباره وارد شو.', 'error')
      navigate('/login', { replace: true })
    })

    return () => registerUnauthorizedHandler(null)
  }, [navigate, pushToast])

  useEffect(() => {
    if (isAuthed && !getToken()) {
      logout()
      navigate('/login', { replace: true })
    }
  }, [isAuthed, logout, navigate])

  return null
}
