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
import { QuickActionSheet } from '@/components/layout/QuickActionSheet'
import { CallMethodSheet } from '@/components/domain/CallMethodSheet'
import { ToastHost } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { canMakeCalls, isAgentRole, isManagementRole } from '@/lib/roles'
import { isShiftOpen } from '@/lib/shiftUtils'

import { SplashScreen } from '@/features/auth/SplashScreen'
import { OnboardingScreen } from '@/features/auth/OnboardingScreen'
import { LoginScreen } from '@/features/auth/LoginScreen'
import { ShiftStartScreen } from '@/features/shift/ShiftStartScreen'
import { WorkStatusScreen } from '@/features/status/WorkStatusScreen'
import { HomeRouter } from '@/features/home/HomeRouter'
import { LeadsScreen } from '@/features/leads/LeadsScreen'
import { LeadDetailScreen } from '@/features/leads/LeadDetailScreen'
import { LockedLeadsScreen } from '@/features/leads/LockedLeadsScreen'
import { LeadIntakeScreen } from '@/features/leads/LeadIntakeScreen'
import { ReturnedLeadsScreen } from '@/features/leads/ReturnedLeadsScreen'
import { DialerScreen } from '@/features/dialer/DialerScreen'
import { CallResultScreen } from '@/features/call/CallResultScreen'
import { FollowupsScreen } from '@/features/followups/FollowupsScreen'
import { PerformanceScreen } from '@/features/gamification/PerformanceScreen'
import { ReportsScreen } from '@/features/reports/ReportsScreen'
import { ProfileScreen } from '@/features/profile/ProfileScreen'
import { NotificationsScreen } from '@/features/notifications/NotificationsScreen'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { SalesScreen } from '@/features/sales/SalesScreen'
import { PendingPaymentsScreen } from '@/features/sales/PendingPaymentsScreen'
import { WalletScreen } from '@/features/wallet/WalletScreen'
import { CommissionDetailScreen } from '@/features/wallet/CommissionDetailScreen'
import { CommissionRulesScreen } from '@/features/wallet/CommissionRulesScreen'
import { TrainingScreen } from '@/features/training/TrainingScreen'
import { ObjectionsScreen } from '@/features/training/ObjectionsScreen'
import { TeamLiveScreen } from '@/features/team/TeamLiveScreen'
import { SupervisorTeamsScreen } from '@/features/team/SupervisorTeamsScreen'
import { TeamReportsScreen } from '@/features/team/TeamReportsScreen'
import { AgentReportsScreen } from '@/features/team/AgentReportsScreen'
import { ActivityHistoryScreen } from '@/features/activity/ActivityHistoryScreen'
import { CommissionApprovalsScreen } from '@/features/wallet/CommissionApprovalsScreen'
import { PayoutQueueScreen } from '@/features/wallet/PayoutQueueScreen'
import { BankAccountApprovalScreen } from '@/features/wallet/BankAccountApprovalScreen'
import { AgentManagementScreen } from '@/features/admin/AgentManagementScreen'
import { TeamManagementScreen } from '@/features/admin/TeamManagementScreen'
import { StaffManagementScreen } from '@/features/admin/StaffManagementScreen'
import { AdminSettingsScreen } from '@/features/admin/AdminSettingsScreen'
import { LiveOpsScreen } from '@/features/liveops/LiveOpsScreen'
import { QaReviewsScreen } from '@/features/qa/QaReviewsScreen'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { AppLockScreen } from '@/components/domain/AppLockScreen'
import { OfflineBanner } from '@/components/pwa/DataGate'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { SyncProvider } from '@/providers/SyncProvider'
import { ShiftPresenceWatcher } from '@/providers/ShiftPresenceWatcher'
import { DayRolloverWatcher } from '@/providers/DayRolloverWatcher'
import { useStandalonePwa } from '@/lib/pwa'

const NAV_ROUTES = ['/home', '/leads', '/followups', '/profile', '/team', '/teams']

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthed = useStore((s) => s.isAuthed)
  if (!isAuthed) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAgentCall({ children }: { children: React.ReactNode }) {
  const role = useStore((s) => s.role)
  if (isManagementRole(role)) return <Navigate to="/home" replace />
  return <>{children}</>
}

function RequireShift({ children }: { children: React.ReactNode }) {
  const role = useStore((s) => s.role)
  const shiftStarted = useStore((s) => isShiftOpen(s.workSession))
  if (isAgentRole(role) && !shiftStarted) return <Navigate to="/shift-start" replace />
  return <>{children}</>
}

function AutoLockWatcher() {
  const autoLockEnabled = useStore((s) => s.autoLockEnabled)
  const autoLockMinutes = useStore((s) => s.autoLockMinutes)
  const isAuthed = useStore((s) => s.isAuthed)
  const lockApp = useStore((s) => s.lockApp)
  const hiddenAt = useRef<number | null>(null)

  useEffect(() => {
    if (!autoLockEnabled || !isAuthed) return
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now()
      } else if (hiddenAt.current) {
        const elapsedMin = (Date.now() - hiddenAt.current) / 60_000
        if (elapsedMin >= autoLockMinutes) lockApp()
        hiddenAt.current = null
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [autoLockEnabled, autoLockMinutes, isAuthed, lockApp])

  return null
}

function Shell() {
  const location = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const isAuthed = useStore((s) => s.isAuthed)
  const isLocked = useStore((s) => s.isLocked)
  const availability = useStore((s) => s.availability)
  const role = useStore((s) => s.role)
  const [fabOpen, setFabOpen] = useState(false)

  const showNav = isAuthed && NAV_ROUTES.includes(location.pathname)
  const showCallFab = canMakeCalls(role)
  const lockScroll = location.pathname.startsWith('/dialer/')

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <main
      className={cn(
        'relative h-full overflow-hidden transition-colors duration-500',
        availability === 'doing_follow_up' && 'bg-warning-50/55 dark:bg-warning-500/8',
      )}
    >
      <div
        ref={scrollRef}
        className={cn('h-full no-scrollbar', lockScroll ? 'overflow-hidden' : 'overflow-y-auto')}
      >
        <div className={lockScroll ? 'h-full' : 'h-full min-h-full'}>
          <Routes location={location} key={location.pathname.split('/').slice(0, 2).join('/')}>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/onboarding" element={<OnboardingScreen />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/shift-start" element={<RequireAuth><ShiftStartScreen /></RequireAuth>} />
            <Route path="/work-status" element={<RequireAuth><WorkStatusScreen /></RequireAuth>} />

            <Route
              path="/home"
              element={
                <RequireAuth>
                  <RequireShift>
                    <HomeRouter />
                  </RequireShift>
                </RequireAuth>
              }
            />
            <Route path="/team" element={<RequireAuth><TeamLiveScreen /></RequireAuth>} />
            <Route path="/teams" element={<RequireAuth><SupervisorTeamsScreen /></RequireAuth>} />
            <Route path="/team-reports" element={<RequireAuth><TeamReportsScreen /></RequireAuth>} />
            <Route path="/agent-reports" element={<RequireAuth><AgentReportsScreen /></RequireAuth>} />
            <Route path="/leads" element={<RequireAuth><LeadsScreen /></RequireAuth>} />
            <Route path="/leads/intake" element={<RequireAuth><RequirePermission permission="leads.import"><LeadIntakeScreen /></RequirePermission></RequireAuth>} />
            <Route path="/leads/locked" element={<RequireAuth><LockedLeadsScreen /></RequireAuth>} />
            <Route path="/leads/returned" element={<RequireAuth><ReturnedLeadsScreen /></RequireAuth>} />
            <Route path="/leads/:id" element={<RequireAuth><LeadDetailScreen /></RequireAuth>} />
            <Route path="/dialer/:id" element={<RequireAuth><RequireAgentCall><DialerScreen /></RequireAgentCall></RequireAuth>} />
            <Route path="/call-result/:id" element={<RequireAuth><RequireAgentCall><CallResultScreen /></RequireAgentCall></RequireAuth>} />
            <Route path="/followups" element={<RequireAuth><FollowupsScreen /></RequireAuth>} />
            <Route path="/sales" element={<RequireAuth><SalesScreen /></RequireAuth>} />
            <Route path="/sales/pending-payments" element={<RequireAuth><PendingPaymentsScreen /></RequireAuth>} />
            <Route path="/wallet" element={<RequireAuth><WalletScreen /></RequireAuth>} />
            <Route path="/wallet/approvals" element={<RequireAuth><CommissionApprovalsScreen /></RequireAuth>} />
            <Route path="/wallet/payouts" element={<RequireAuth><RequirePermission permission="wallet.manage-payouts"><PayoutQueueScreen /></RequirePermission></RequireAuth>} />
            <Route path="/wallet/bank-accounts" element={<RequireAuth><RequirePermission permission="users.manage-team"><BankAccountApprovalScreen /></RequirePermission></RequireAuth>} />
            <Route path="/wallet/rules" element={<RequireAuth><CommissionRulesScreen /></RequireAuth>} />
            <Route path="/wallet/commissions/:id" element={<RequireAuth><CommissionDetailScreen /></RequireAuth>} />
            <Route path="/training" element={<RequireAuth><TrainingScreen /></RequireAuth>} />
            <Route path="/training/objections" element={<RequireAuth><ObjectionsScreen /></RequireAuth>} />
            <Route path="/performance" element={<RequireAuth><PerformanceScreen /></RequireAuth>} />
            <Route path="/reports" element={<RequireAuth><ReportsScreen /></RequireAuth>} />
            <Route path="/live-ops" element={<RequireAuth><RequirePermission permission="reports.view"><LiveOpsScreen /></RequirePermission></RequireAuth>} />
            <Route path="/qa" element={<RequireAuth><RequirePermission permission="training.manage"><QaReviewsScreen /></RequirePermission></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><ProfileScreen /></RequireAuth>} />
            <Route path="/notifications" element={<RequireAuth><NotificationsScreen /></RequireAuth>} />
            <Route path="/activity" element={<RequireAuth><ActivityHistoryScreen /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><SettingsScreen /></RequireAuth>} />
            <Route path="/admin/agents" element={<RequireAuth><RequirePermission permission="users.view"><AgentManagementScreen /></RequirePermission></RequireAuth>} />
            <Route path="/admin/teams" element={<RequireAuth><RequirePermission permission="teams.manage"><TeamManagementScreen /></RequirePermission></RequireAuth>} />
            <Route path="/admin/staff" element={<RequireAuth><RequirePermission permission="users.view"><StaffManagementScreen /></RequirePermission></RequireAuth>} />
            <Route path="/admin/settings" element={<RequireAuth><RequirePermission permission="admin.settings"><AdminSettingsScreen /></RequirePermission></RequireAuth>} />

            <Route path="*" element={<Navigate to={isAuthed ? '/home' : '/'} replace />} />
          </Routes>
        </div>
      </div>

      {showNav && (
        <BottomNav
          showFab={showCallFab}
          onFabClick={showCallFab ? () => setFabOpen(true) : undefined}
        />
      )}
      {showCallFab && <QuickActionSheet open={fabOpen} onClose={() => setFabOpen(false)} />}
      <CallMethodSheet />
      <ToastHost />
      <AutoLockWatcher />
      <ShiftPresenceWatcher />
      <DayRolloverWatcher />
      {isAuthed && isLocked && <AppLockScreen />}
    </main>
  )
}

export default function App() {
  const standalone = useStandalonePwa()

  useEffect(() => {
    initTelegram()
  }, [])

  return (
    <SyncProvider>
      <div
        className={cn(
          'flex min-h-[100dvh] w-full items-center justify-center',
          standalone ? 'bg-background' : 'bg-neutral-200 sm:p-4',
        )}
      >
        <div
          className={cn(
            'relative overflow-hidden bg-background',
            standalone
              ? 'h-[100dvh] w-full'
              : 'h-[100dvh] w-full max-w-[440px] sm:h-[896px] sm:max-h-[94vh] sm:rounded-[44px] sm:border-[8px] sm:border-neutral-900 sm:shadow-2xl',
          )}
        >
          <OfflineBanner />
          <BrowserRouter>
            <Shell />
          </BrowserRouter>
          <InstallPrompt />
        </div>
      </div>
    </SyncProvider>
  )
}
