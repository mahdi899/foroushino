import {
  CalendarCheck2,
  CircleUserRound,
  ContactRound,
  House,
  LayoutGrid,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'

export type NavIconProps = {
  active?: boolean
  className?: string
}

const size = 'h-[23px] w-[23px] shrink-0'

function createNavIcon(Icon: LucideIcon) {
  return function NavIcon({ active, className }: NavIconProps) {
    return (
      <Icon
        aria-hidden
        className={cn(size, className)}
        strokeWidth={active ? 2.4 : 1.75}
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.14 : 0}
      />
    )
  }
}

export const NavHomeIcon = createNavIcon(House)
export const NavLeadsIcon = createNavIcon(ContactRound)
export const NavFollowupsIcon = createNavIcon(CalendarCheck2)
export const NavProfileIcon = createNavIcon(CircleUserRound)
export const NavTeamIcon = createNavIcon(UsersRound)
export const NavTeamsIcon = createNavIcon(LayoutGrid)
