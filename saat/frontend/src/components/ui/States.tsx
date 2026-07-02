import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Inbox, WifiOff, TriangleAlert } from 'lucide-react'
import { Button } from './Button'

interface StateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  tone?: 'neutral' | 'error'
}

function BaseState({ icon, title, description, action, tone = 'neutral' }: StateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center px-8 py-12"
    >
      <div
        className={
          'mb-4 flex h-20 w-20 items-center justify-center rounded-3xl ' +
          (tone === 'error' ? 'bg-error-50 text-error-500' : 'bg-primary-50 text-primary-600')
        }
      >
        {icon}
      </div>
      <h3 className="text-base font-extrabold text-neutral-900">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-neutral-500 leading-6 max-w-[260px]">{description}</p>
      )}
      {action && (
        <Button size="sm" variant="soft" className="mt-5" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  )
}

export function EmptyState(props: Omit<StateProps, 'icon' | 'tone'> & { icon?: ReactNode }) {
  return <BaseState {...props} icon={props.icon ?? <Inbox size={34} />} />
}

export function ErrorState(props: Omit<StateProps, 'icon' | 'tone'>) {
  return <BaseState {...props} tone="error" icon={<TriangleAlert size={34} />} />
}

export function OfflineState(props: Omit<StateProps, 'icon' | 'tone'>) {
  return <BaseState {...props} icon={<WifiOff size={34} />} />
}
