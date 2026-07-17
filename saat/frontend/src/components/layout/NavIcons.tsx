import { cn } from '@/lib/cn'

export type NavIconProps = {
  active?: boolean
  className?: string
}

const base = 'h-[24px] w-[24px] shrink-0'

export function NavHomeIcon({ active, className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      {active ? (
        <path
          d="M11.2 2.8 3.6 8.6v11.4a1.1 1.1 0 0 0 1.1 1.1h4.8v-5.9h3.2v5.9h4.8a1.1 1.1 0 0 0 1.1-1.1V8.6L11.2 2.8Z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M11.2 3.6 4.8 8.8v10.6a.85.85 0 0 0 .85.85h4.3v-5.6h2.6v5.6h4.3a.85.85 0 0 0 .85-.85V8.8L11.2 3.6Zm0-1.6 8 6.4a1.3 1.3 0 0 1 .5 1v10.6a2 2 0 0 1-2 2h-4.8v-5.6h-3.2v5.6H5.65a2 2 0 0 1-2-2V9.4c0-.38.18-.72.5-.94l8-6.4a1.3 1.3 0 0 1 1.6 0Z"
          fill="currentColor"
        />
      )}
    </svg>
  )
}

export function NavLeadsIcon({ active, className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      {active ? (
        <>
          <path
            d="M7.8 4.6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-2.5 12.8c0-2.4 1.9-3.9 4.4-3.9h3.8c2.5 0 4.4 1.5 4.4 3.9v.35a1.2 1.2 0 0 1-1.2 1.2H6.5a1.2 1.2 0 0 1-1.2-1.2v-.35Z"
            fill="currentColor"
          />
          <path
            d="M16.2 5.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Zm-1.8 5.8c1.9 0 3.4 1.1 3.4 2.8v.25a.85.85 0 0 1-.85.85h-2.9a4.1 4.1 0 0 0 .35-3.9Z"
            fill="currentColor"
            opacity="0.7"
          />
        </>
      ) : (
        <>
          <circle cx="7.8" cy="7.6" r="2.5" stroke="currentColor" strokeWidth="1.65" />
          <path
            d="M4.6 17.4c0-2.1 1.7-3.4 3.8-3.4h3.3c2.1 0 3.8 1.3 3.8 3.4"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
          <circle cx="16.2" cy="7.9" r="1.85" stroke="currentColor" strokeWidth="1.65" />
          <path
            d="M13.8 12.2c1.5 0 2.7.85 2.7 2.1"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  )
}

export function NavFollowupsIcon({ active, className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      {active ? (
        <>
          <path
            d="M5.9 5h12.2a1.3 1.3 0 0 1 1.3 1.3v11.8a1.3 1.3 0 0 1-1.3 1.3H5.9a1.3 1.3 0 0 1-1.3-1.3V6.3a1.3 1.3 0 0 1 1.3-1.3Z"
            fill="currentColor"
          />
          <path
            d="M7.7 3.9V6.4M16.3 3.9V6.4M5.9 9.4h12.2"
            stroke="white"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
          <path
            d="m9 13.5 1.7 1.7 4.2-4.2"
            stroke="white"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <rect
            x="4.9"
            y="5.9"
            width="14.2"
            height="14.2"
            rx="1.9"
            stroke="currentColor"
            strokeWidth="1.65"
          />
          <path
            d="M7.7 4.6V7.1M16.3 4.6V7.1M4.9 9.7h14.2"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
          <path
            d="m9 13.5 1.7 1.7 4.2-4.2"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  )
}

export function NavProfileIcon({ active, className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      {active ? (
        <>
          <circle cx="12" cy="12" r="8.9" fill="currentColor" />
          <circle cx="12" cy="9.7" r="2.65" fill="white" />
          <path
            d="M6.9 16.7c.85-2.1 2.65-3.2 5.1-3.2s4.25 1.1 5.1 3.2"
            stroke="white"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="8.3" stroke="currentColor" strokeWidth="1.65" />
          <circle cx="12" cy="9.7" r="2.35" stroke="currentColor" strokeWidth="1.65" />
          <path
            d="M7.2 16.4c.85-1.9 2.55-2.95 4.8-2.95s3.95 1.05 4.8 2.95"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  )
}

export function NavTeamIcon({ active, className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      {active ? (
        <>
          <path
            d="M8 5.5a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8ZM5.1 17c0-1.95 1.55-3.15 3.5-3.15h2.2c1.95 0 3.5 1.2 3.5 3.15v.28a1 1 0 0 1-1 1H6.1a1 1 0 0 1-1-1V17Z"
            fill="currentColor"
          />
          <path
            d="M16.1 6.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-2.1 5.9c1.65 0 2.95 1 2.95 2.5v.18a.75.75 0 0 1-.75.75h-2.55a3.6 3.6 0 0 0 .35-3.43Z"
            fill="currentColor"
            opacity="0.7"
          />
        </>
      ) : (
        <>
          <circle cx="8" cy="7.9" r="2" stroke="currentColor" strokeWidth="1.65" />
          <path
            d="M5.1 17c0-1.65 1.35-2.75 3.1-2.75h2.2c1.75 0 3.1 1.1 3.1 2.75"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
          <circle cx="16.1" cy="8.5" r="1.75" stroke="currentColor" strokeWidth="1.65" />
          <path
            d="M14 12.4c1.35 0 2.45.8 2.45 2"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  )
}

export function NavTeamsIcon({ active, className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(base, className)} aria-hidden>
      {active ? (
        <>
          <rect x="4.5" y="4.5" width="6.5" height="6.5" rx="1.7" fill="currentColor" />
          <rect x="13" y="4.5" width="6.5" height="6.5" rx="1.7" fill="currentColor" />
          <rect x="4.5" y="13" width="6.5" height="6.5" rx="1.7" fill="currentColor" />
          <rect x="13" y="13" width="6.5" height="6.5" rx="1.7" fill="currentColor" />
        </>
      ) : (
        <>
          <rect x="4.9" y="4.9" width="5.7" height="5.7" rx="1.5" stroke="currentColor" strokeWidth="1.65" />
          <rect x="13.4" y="4.9" width="5.7" height="5.7" rx="1.5" stroke="currentColor" strokeWidth="1.65" />
          <rect x="4.9" y="13.4" width="5.7" height="5.7" rx="1.5" stroke="currentColor" strokeWidth="1.65" />
          <rect x="13.4" y="13.4" width="5.7" height="5.7" rx="1.5" stroke="currentColor" strokeWidth="1.65" />
        </>
      )}
    </svg>
  )
}
