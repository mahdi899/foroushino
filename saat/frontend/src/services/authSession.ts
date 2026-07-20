import { clearToken } from './auth'
import { useStore } from '@/store/useStore'

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null
let handlingUnauthorized = false

export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

/** Clears invalid session state and notifies the app shell (toast + redirect). */
export function handleUnauthorizedSession() {
  if (handlingUnauthorized) return

  const state = useStore.getState()
  clearToken()

  if (!state.isAuthed) return

  handlingUnauthorized = true
  try {
    state.logout()
    unauthorizedHandler?.()
  } finally {
    handlingUnauthorized = false
  }
}
