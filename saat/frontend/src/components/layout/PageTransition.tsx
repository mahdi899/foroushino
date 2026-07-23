import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'

interface PageTransitionProps {
  children: ReactNode
}

/** Light route enter animation — opacity + small horizontal translate only. */
export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const routeKey = location.pathname.split('/').slice(0, 2).join('/') || '/'

  if (reduceMotion) {
    return <>{children}</>
  }

  return (
    <motion.div
      key={routeKey}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      className="min-h-full"
    >
      {children}
    </motion.div>
  )
}
