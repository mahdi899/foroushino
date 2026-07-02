import { useEffect, useRef, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { initTelegram } from '@/lib/telegram'
import { BottomNav } from '@/components/layout/BottomNav'
import { RoleSwitcher } from '@/components/layout/RoleSwitcher'
import { QuickActionSheet } from '@/components/layout/QuickActionSheet'
import { ToastHost } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

import { SplashScreen } from '@/features/auth/SplashScreen'
import { OnboardingScreen } from '@/features/auth/OnboardingScreen'
import { LoginScreen } from '@/features/auth/LoginScreen'
import { HomeRouter } from '@/features/home/HomeRouter'
import { LeadsScreen } from '@/features/leads/LeadsScreen'
import { LeadDetailScreen } from '@/features/leads/LeadDetailScreen'
import { DialerScreen } from '@/features/dialer/DialerScreen'
import { CallResultScreen } from '@/features/call/CallResultScreen'
import { FollowupsScreen } from '@/features/followups/FollowupsScreen'
import { PerformanceScreen } from '@/features/gamification/PerformanceScreen'
import { ReportsScreen } from '@/features/reports/ReportsScreen'
import { ProfileScreen } from '@/features/profile/ProfileScreen'
import { NotificationsScreen } from '@/features/notifications/NotificationsScreen'
import { SettingsScreen } from '@/features/settings/SettingsScreen'

const NAV_ROUTES = ['/home', '/leads', '/followups', '/performance', '/reports', '/profile']

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthed = useStore((s) => s.isAuthed)
  if (!isAuthed) return <Navigate to="/login" replace />
  return <>{children}</>
}

function Shell() {
  const location = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const isAuthed = useStore((s) => s.isAuthed)
  const [fabOpen, setFabOpen] = useState(false)

  const showNav = isAuthed && NAV_ROUTES.includes(location.pathname)
  const lockScroll = location.pathname.startsWith('/dialer/')

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <main className="relative h-full overflow-hidden">
      <div
        ref={scrollRef}
        className={cn('h-full no-scrollbar', lockScroll ? 'overflow-hidden' : 'overflow-y-auto')}
      >
        <div className={lockScroll ? 'h-full' : 'h-full min-h-full'}>
          <Routes location={location} key={location.pathname.split('/').slice(0, 2).join('/')}>
            <Route path="/splash" element={<SplashScreen />} />
            <Route path="/onboarding" element={<OnboardingScreen />} />
            <Route path="/login" element={<LoginScreen />} />

            <Route path="/home" element={<RequireAuth><HomeRouter /></RequireAuth>} />
            <Route path="/leads" element={<RequireAuth><LeadsScreen /></RequireAuth>} />
            <Route path="/leads/:id" element={<RequireAuth><LeadDetailScreen /></RequireAuth>} />
            <Route path="/dialer/:id" element={<RequireAuth><DialerScreen /></RequireAuth>} />
            <Route path="/call-result/:id" element={<RequireAuth><CallResultScreen /></RequireAuth>} />
            <Route path="/followups" element={<RequireAuth><FollowupsScreen /></RequireAuth>} />
            <Route path="/performance" element={<RequireAuth><PerformanceScreen /></RequireAuth>} />
            <Route path="/reports" element={<RequireAuth><ReportsScreen /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><ProfileScreen /></RequireAuth>} />
            <Route path="/notifications" element={<RequireAuth><NotificationsScreen /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><SettingsScreen /></RequireAuth>} />

            <Route path="*" element={<Navigate to={isAuthed ? '/home' : '/splash'} replace />} />
          </Routes>
        </div>
      </div>

      {showNav && (
        <>
          <BottomNav onFabClick={() => setFabOpen(true)} />
          <RoleSwitcher />
        </>
      )}
      <QuickActionSheet open={fabOpen} onClose={() => setFabOpen(false)} />
      <ToastHost />
    </main>
  )
}

export default function App() {
  useEffect(() => {
    initTelegram()
  }, [])

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-neutral-200 sm:p-4">
      <div className="relative h-[100dvh] w-full max-w-[440px] overflow-hidden bg-background sm:h-[896px] sm:max-h-[94vh] sm:rounded-[44px] sm:border-[8px] sm:border-neutral-900 sm:shadow-2xl">
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </div>
    </div>
  )
}
