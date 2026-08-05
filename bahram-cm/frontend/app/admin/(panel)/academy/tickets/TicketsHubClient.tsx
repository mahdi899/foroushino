'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Search,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react';
import { fetchRecentTickets, fetchTicketDetail, fetchTicketUsers, fetchTicketsByUser } from '../actions';
import { Badge } from '../../ui';
import { CreateTicketForStudentForm } from './CreateTicketForStudentForm';
import { TicketChatPanel } from './TicketChatPanel';
import { TicketReportPanel } from './TicketReportPanel';
import {
  TICKET_DEPARTMENT_LABELS,
  TICKET_DEPARTMENT_OPTIONS,
  TICKET_STATUS_LABELS,
  TICKET_TECH_ESCALATION_LABELS,
  formatDateTime,
  type AdminTicket,
  type AdminTicketDetail,
  type AdminTicketUserGroup,
  type PageMeta,
  type TicketTechActorLevel,
  type TicketTechEscalation,
} from '@/lib/admin/academyTypes';
import { cn } from '@/lib/utils';

type TabId = 'technical' | 'resolved' | 'send' | 'users' | 'reports';

type TechQueueFilter = 'mine' | 'resolved' | 'tech_support' | 'tech_manager';

const BASE_TABS: { id: Exclude<TabId, 'technical' | 'resolved'>; label: string; icon: typeof MessageSquarePlus }[] = [
  { id: 'send', label: 'ارسال تیکت', icon: MessageSquarePlus },
  { id: 'users', label: 'تیکت‌های کاربران', icon: Users },
  { id: 'reports', label: 'گزارش', icon: BarChart3 },
];

const MINE_FILTER_LABELS: Record<TicketTechActorLevel, string> = {
  tech_support: 'صف پشتیبان فنی',
  tech_manager: 'ارجاع به مدیر فنی',
  super_admin: 'ارجاع به مدیر کل',
};

type TicketRowVariant = 'closed' | 'answered' | 'pending';

function ticketRowVariant(status: AdminTicket['status']): TicketRowVariant | null {
  if (status === 'closed') return 'closed';
  if (status === 'answered' || status === 'waiting_user') return 'answered';
  if (status === 'open' || status === 'in_review') return 'pending';
  return null;
}

function ticketRowClass(status: AdminTicket['status']): string {
  const variant = ticketRowVariant(status);
  return variant ? `admin-tickets-hub__ticket-row--${variant}` : '';
}

function HubEmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="admin-tickets-hub__empty">
      <span className="admin-tickets-hub__empty-icon">{icon}</span>
      <p className="admin-tickets-hub__empty-title">{title}</p>
      {description ? <p className="admin-tickets-hub__empty-desc">{description}</p> : null}
    </div>
  );
}

function HubLoading() {
  return (
    <div className="admin-tickets-hub__loading">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );
}

function departmentLabel(department: string | null): string {
  if (!department) return TICKET_DEPARTMENT_LABELS.general;
  return TICKET_DEPARTMENT_LABELS[department] ?? department;
}

function defaultTab(showTechnicalQueue: boolean, showResolvedForSupport: boolean): TabId {
  if (showTechnicalQueue) return 'technical';
  if (showResolvedForSupport) return 'resolved';
  return 'users';
}

function escalationForTechFilter(
  filter: TechQueueFilter,
  techActorLevel: TicketTechActorLevel | null,
): TicketTechEscalation | undefined {
  if (filter === 'mine') return techActorLevel ?? undefined;
  return filter;
}

export function TicketsHubClient({
  canViewStudents = false,
  canSearchStudents = false,
  showTechnicalQueue = false,
  showResolvedForSupport = false,
  techActorLevel = null,
  canReplyToUser = true,
  mustUseInternal = false,
}: {
  canViewStudents?: boolean;
  canSearchStudents?: boolean;
  showTechnicalQueue?: boolean;
  showResolvedForSupport?: boolean;
  techActorLevel?: TicketTechActorLevel | null;
  canReplyToUser?: boolean;
  mustUseInternal?: boolean;
}) {
  const [tab, setTab] = useState<TabId>(() => defaultTab(showTechnicalQueue, showResolvedForSupport));
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [users, setUsers] = useState<AdminTicketUserGroup[]>([]);
  const [usersMeta, setUsersMeta] = useState<PageMeta | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminTicketUserGroup | null>(null);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [recentTickets, setRecentTickets] = useState<AdminTicket[]>([]);
  const [recentTicketsLoading, setRecentTicketsLoading] = useState(false);
  const [technicalTickets, setTechnicalTickets] = useState<AdminTicket[]>([]);
  const [technicalMeta, setTechnicalMeta] = useState<PageMeta | null>(null);
  const [technicalLoading, setTechnicalLoading] = useState(false);
  const [techQueueFilter, setTechQueueFilter] = useState<TechQueueFilter>(
    () => (techActorLevel ? 'mine' : 'resolved'),
  );
  const [activeTicket, setActiveTicket] = useState<AdminTicketDetail | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const ticketsBodyRef = useRef<HTMLDivElement>(null);

  const tabs: { id: TabId; label: string; icon: typeof MessageSquarePlus }[] = showTechnicalQueue
    ? [
        { id: 'technical', label: 'پشتیبانی فنی', icon: Wrench },
        ...(mustUseInternal ? BASE_TABS.filter((t) => t.id !== 'send') : BASE_TABS),
      ]
    : showResolvedForSupport
      ? [{ id: 'resolved', label: 'آماده اعلام', icon: CheckCircle2 }, ...BASE_TABS]
      : BASE_TABS;

  const techQueueFilters: { id: TechQueueFilter; label: string }[] = [
    ...(techActorLevel
      ? [{ id: 'mine' as const, label: MINE_FILTER_LABELS[techActorLevel] }]
      : []),
    ...(techActorLevel === 'tech_manager' || techActorLevel === 'super_admin'
      ? [{ id: 'tech_support' as const, label: 'صف پشتیبان فنی' }]
      : []),
    ...(techActorLevel === 'super_admin'
      ? [{ id: 'tech_manager' as const, label: 'ارجاع به مدیر فنی' }]
      : []),
    { id: 'resolved', label: 'حل‌شده' },
  ];

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  async function loadUsers(page = 1, search = debouncedQuery) {
    setUsersLoading(true);
    const res = await fetchTicketUsers({ page, search });
    setUsersLoading(false);
    if (res.ok) {
      setUsers(res.items);
      setUsersMeta(res.meta);
    }
  }

  async function loadTechnicalTickets(escalation?: TicketTechEscalation) {
    setTechnicalLoading(true);
    const res = await fetchRecentTickets(50, 'technical', escalation);
    setTechnicalLoading(false);
    if (res.ok) {
      setTechnicalTickets(res.items);
      setTechnicalMeta(res.meta);
    }
  }

  function reloadCurrentTechnicalQueue() {
    if (tab === 'resolved') {
      void loadTechnicalTickets('resolved');
      return;
    }
    void loadTechnicalTickets(escalationForTechFilter(techQueueFilter, techActorLevel));
  }

  useEffect(() => {
    if (tab === 'users') void loadUsers(1, debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, debouncedQuery]);

  useEffect(() => {
    if (!showTechnicalQueue) return;
    void loadTechnicalTickets(escalationForTechFilter(techQueueFilter, techActorLevel));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTechnicalQueue]);

  useEffect(() => {
    if (tab !== 'technical') return;
    void loadTechnicalTickets(escalationForTechFilter(techQueueFilter, techActorLevel));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, techQueueFilter]);

  useEffect(() => {
    if (tab !== 'resolved') return;
    void loadTechnicalTickets('resolved');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab !== 'send') return;
    let cancelled = false;
    async function loadRecent() {
      setRecentTicketsLoading(true);
      const res = await fetchRecentTickets(20, departmentFilter || undefined);
      setRecentTicketsLoading(false);
      if (cancelled) return;
      if (res.ok) setRecentTickets(res.items);
    }
    void loadRecent();
    return () => {
      cancelled = true;
    };
  }, [tab, departmentFilter]);

  function switchTab(next: TabId) {
    setTab(next);
    setSelectedUser(null);
    setActiveTicket(null);
    setTickets([]);
  }

  async function selectUser(user: AdminTicketUserGroup) {
    setSelectedUser(user);
    setActiveTicket(null);
    setTicketsLoading(true);
    document.querySelector('.admin-main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
    ticketsBodyRef.current?.scrollTo({ top: 0 });
    const res = await fetchTicketsByUser(user.user_id);
    setTicketsLoading(false);
    if (res.ok) setTickets(res.items);
    requestAnimationFrame(() => ticketsBodyRef.current?.scrollTo({ top: 0 }));
  }

  async function openTicket(id: number) {
    setTicketLoading(true);
    const res = await fetchTicketDetail(id);
    setTicketLoading(false);
    if (res.ok && res.data) setActiveTicket(res.data);
  }

  function goBack() {
    if (activeTicket) setActiveTicket(null);
    else setSelectedUser(null);
  }

  const showMobileDetail = Boolean(selectedUser || activeTicket || ticketLoading);
  const technicalCount = technicalMeta?.total ?? technicalTickets.length;

  return (
    <div className="admin-tickets-hub">
      <div className="admin-period-toolbar admin-tickets-hub__tabs">
        <div className="admin-period-segments">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className="admin-period-btn inline-flex items-center gap-2"
              data-active={tab === id ? 'true' : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{label}</span>
              {(id === 'technical' || id === 'resolved') && technicalCount > 0 && tab === id ? (
                <Badge tone={id === 'resolved' ? 'success' : 'warning'}>
                  {technicalCount.toLocaleString('fa-IR')}
                </Badge>
              ) : null}
            </button>
          ))}
        </div>
        {tab === 'users' && usersMeta ? (
          <span className="admin-period-summary">
            {usersMeta.total.toLocaleString('fa-IR')} کاربر با تیکت
          </span>
        ) : null}
        {tab === 'technical' && technicalMeta ? (
          <span className="admin-period-summary">
            {technicalMeta.total.toLocaleString('fa-IR')} تیکت فنی
          </span>
        ) : null}
        {tab === 'resolved' && technicalMeta ? (
          <span className="admin-period-summary">
            {technicalMeta.total.toLocaleString('fa-IR')} آماده اعلام
          </span>
        ) : null}
      </div>

      {tab === 'technical' && (
        <div className={cn('admin-tickets-hub__technical', activeTicket && 'admin-tickets-hub__technical--chat')}>
          <div className="admin-dashboard-panel admin-tickets-hub__main">
            {activeTicket ? (
              <>
                <div className="admin-dashboard-panel__head">
                  <button type="button" onClick={goBack} className="admin-tickets-hub__back">
                    <ChevronRight className="h-4 w-4" />
                    بازگشت به صف فنی
                  </button>
                </div>
                {ticketLoading ? (
                  <div className="admin-tickets-hub__main-body">
                    <HubLoading />
                  </div>
                ) : (
                  <div className="admin-tickets-hub__chat">
                    <TicketChatPanel
                      ticket={activeTicket}
                      compact
                      canViewStudents={canViewStudents}
                      techActorLevel={techActorLevel}
                      canReplyToUser={canReplyToUser}
                      mustUseInternal={mustUseInternal}
                      onTechEscalationChanged={reloadCurrentTechnicalQueue}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="admin-dashboard-panel__head">
                  <div className="min-w-0">
                    <h2 className="admin-dashboard-panel__title">تیکت‌های پشتیبانی فنی</h2>
                    <p className="mt-1 text-caption text-text-muted">
                      تیکت‌هایی که پشتیبان برای بررسی فنی علامت زده است
                    </p>
                  </div>
                </div>
                <div className="admin-dashboard-panel__body admin-dashboard-panel__body--padded admin-tickets-hub__technical-body">
                  <div className="admin-period-segments mb-4 flex-wrap">
                    {techQueueFilters.map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setTechQueueFilter(id);
                          setActiveTicket(null);
                        }}
                        className="admin-period-btn inline-flex items-center gap-2"
                        data-active={techQueueFilter === id ? 'true' : undefined}
                      >
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                  {technicalLoading ? (
                    <HubLoading />
                  ) : (
                    <TicketTable
                      tickets={technicalTickets}
                      showUser
                      emptyDescription="فعلاً تیکتی در این صف نیست."
                      onSelect={(id) => void openTicket(id)}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'resolved' && (
        <div className={cn('admin-tickets-hub__technical', activeTicket && 'admin-tickets-hub__technical--chat')}>
          <div className="admin-dashboard-panel admin-tickets-hub__main">
            {activeTicket ? (
              <>
                <div className="admin-dashboard-panel__head">
                  <button type="button" onClick={goBack} className="admin-tickets-hub__back">
                    <ChevronRight className="h-4 w-4" />
                    بازگشت به آماده اعلام
                  </button>
                </div>
                {ticketLoading ? (
                  <div className="admin-tickets-hub__main-body">
                    <HubLoading />
                  </div>
                ) : (
                  <div className="admin-tickets-hub__chat">
                    <TicketChatPanel
                      ticket={activeTicket}
                      compact
                      canViewStudents={canViewStudents}
                      techActorLevel={techActorLevel}
                      canReplyToUser={canReplyToUser}
                      mustUseInternal={mustUseInternal}
                      onTechEscalationChanged={reloadCurrentTechnicalQueue}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="admin-dashboard-panel__head">
                  <div className="min-w-0">
                    <h2 className="admin-dashboard-panel__title">آماده اعلام</h2>
                    <p className="mt-1 text-caption text-text-muted">
                      تیکت‌های فنی حل‌شده که آماده اعلام به دانشجو هستند
                    </p>
                  </div>
                </div>
                <div className="admin-dashboard-panel__body admin-dashboard-panel__body--padded admin-tickets-hub__technical-body">
                  {technicalLoading ? (
                    <HubLoading />
                  ) : (
                    <TicketTable
                      tickets={technicalTickets}
                      showUser
                      emptyDescription="فعلاً تیکت حل‌شده‌ای برای اعلام نیست."
                      onSelect={(id) => void openTicket(id)}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'send' && (
        <div className="admin-tickets-hub__send">
          <CreateTicketForStudentForm defaultOpen canSearchStudents={canSearchStudents} />
          <div className="admin-dashboard-panel">
            <div className="admin-dashboard-panel__head flex flex-wrap items-center justify-between gap-3">
              <h2 className="admin-dashboard-panel__title">آخرین تیکت‌ها</h2>
              <select
                className="field-input w-auto py-1.5 text-caption"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                aria-label="فیلتر بخش"
              >
                {TICKET_DEPARTMENT_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-dashboard-panel__body admin-dashboard-panel__body--padded">
              {recentTicketsLoading ? (
                <HubLoading />
              ) : (
                <TicketTable tickets={recentTickets} showUser />
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'reports' && <TicketReportPanel />}

      {tab === 'users' && (
        <div
          className={cn(
            'admin-tickets-hub__layout',
            showMobileDetail && 'admin-tickets-hub__layout--detail',
          )}
        >
          <aside className="admin-dashboard-panel admin-tickets-hub__sidebar">
            <div className="admin-dashboard-panel__head">
              <h2 className="admin-dashboard-panel__title">دانشجویان</h2>
            </div>
            <div className="admin-dashboard-panel__body admin-tickets-hub__sidebar-body">
              <div className="admin-tickets-hub__search-wrap">
                <Search className="admin-tickets-hub__search-icon" strokeWidth={2} />
                <input
                  className="field-input admin-tickets-hub__search"
                  placeholder="جستجو نام یا موبایل..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {usersLoading ? (
                <HubLoading />
              ) : users.length === 0 ? (
                <HubEmptyState
                  icon={<Users className="h-6 w-6" strokeWidth={1.75} />}
                  title="کاربری یافت نشد"
                  description={debouncedQuery ? 'عبارت جستجو را تغییر دهید یا فیلتر را پاک کنید.' : 'هنوز تیکتی از سمت دانشجوها ثبت نشده است.'}
                />
              ) : (
                <ul className="admin-tickets-hub__user-list">
                  {users.map((user) => (
                    <li key={user.user_id}>
                      <button
                        type="button"
                        onClick={() => void selectUser(user)}
                        className={cn(
                          'admin-tickets-hub__user',
                          selectedUser?.user_id === user.user_id && 'admin-tickets-hub__user--active',
                          user.open_count > 0 && 'admin-tickets-hub__user--pending',
                        )}
                      >
                        <span className="admin-tickets-hub__user-avatar">
                          <UserRound className="h-4 w-4" strokeWidth={2} />
                        </span>
                        <span className="admin-tickets-hub__user-meta min-w-0">
                          <span className="admin-tickets-hub__user-name">{user.name ?? '—'}</span>
                          <span className="admin-tickets-hub__user-mobile" dir="ltr">
                            {user.mobile}
                          </span>
                        </span>
                        <span className="admin-tickets-hub__user-count">{user.tickets_count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {usersMeta && usersMeta.last_page > 1 ? (
                <div className="admin-tickets-hub__pager">
                  <button
                    type="button"
                    className="btn btn-secondary py-1.5 text-caption"
                    disabled={usersMeta.current_page <= 1}
                    onClick={() => void loadUsers(usersMeta.current_page - 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                    قبلی
                  </button>
                  <span>
                    {usersMeta.current_page.toLocaleString('fa-IR')}/
                    {usersMeta.last_page.toLocaleString('fa-IR')}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary py-1.5 text-caption"
                    disabled={usersMeta.current_page >= usersMeta.last_page}
                    onClick={() => void loadUsers(usersMeta.current_page + 1)}
                  >
                    بعدی
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          </aside>

          <main className="admin-dashboard-panel admin-tickets-hub__main">
            {showMobileDetail ? (
              <div className="admin-dashboard-panel__head lg:hidden">
                <button type="button" onClick={goBack} className="admin-tickets-hub__back">
                  <ChevronRight className="h-4 w-4" />
                  بازگشت
                </button>
              </div>
            ) : null}

            {!selectedUser && !ticketLoading && !activeTicket && (
              <div className="admin-tickets-hub__main-body">
                <HubEmptyState
                  icon={<MessageSquare className="h-7 w-7" strokeWidth={1.75} />}
                  title="یک کاربر را انتخاب کنید"
                  description="از لیست دانشجویان یک نفر را انتخاب کنید تا تیکت‌ها و گفت‌وگو نمایش داده شود."
                />
              </div>
            )}

            {selectedUser && !activeTicket && !ticketLoading && (
              <>
                <div className="admin-dashboard-panel__head">
                  <div className="min-w-0">
                    <h2 className="admin-dashboard-panel__title">{selectedUser.name ?? 'دانشجو'}</h2>
                    <p className="text-caption text-text-muted" dir="ltr">
                      {selectedUser.mobile}
                    </p>
                  </div>
                  {canViewStudents ? (
                    <Link
                      href={`/admin/academy/students/${selectedUser.user_id}`}
                      className="admin-dashboard-panel__action shrink-0"
                    >
                      پروفایل
                    </Link>
                  ) : null}
                </div>
                <div className="admin-tickets-hub__main-body" ref={ticketsBodyRef}>
                  {ticketsLoading ? (
                    <HubLoading />
                  ) : (
                    <TicketTable tickets={tickets} onSelect={(id) => void openTicket(id)} />
                  )}
                </div>
              </>
            )}

            {ticketLoading ? (
              <div className="admin-tickets-hub__main-body">
                <HubLoading />
              </div>
            ) : null}

            {activeTicket && !ticketLoading ? (
              <div className="admin-tickets-hub__chat">
                <TicketChatPanel
                  ticket={activeTicket}
                  compact
                  canViewStudents={canViewStudents}
                  techActorLevel={techActorLevel}
                  canReplyToUser={canReplyToUser}
                  mustUseInternal={mustUseInternal}
                />
              </div>
            ) : null}
          </main>
        </div>
      )}
    </div>
  );
}

function TicketTable({
  tickets,
  onSelect,
  showUser = false,
  emptyDescription = 'برای این دانشجو هنوز تیکتی ثبت نشده است.',
}: {
  tickets: AdminTicket[];
  onSelect?: (id: number) => void;
  showUser?: boolean;
  emptyDescription?: string;
}) {
  if (tickets.length === 0) {
    return (
      <HubEmptyState
        icon={<Inbox className="h-6 w-6" strokeWidth={1.75} />}
        title="تیکتی یافت نشد"
        description={emptyDescription}
      />
    );
  }

  return (
    <ul className="admin-tickets-hub__ticket-list">
      {tickets.map((ticket) => {
        const statusLabel = TICKET_STATUS_LABELS[ticket.status] ?? ticket.status;
        const dept = departmentLabel(ticket.department);
        const escalation =
          showUser && ticket.tech_escalation
            ? TICKET_TECH_ESCALATION_LABELS[ticket.tech_escalation] ?? ticket.tech_escalation
            : null;
        const meta = [
          showUser ? ticket.user_name || ticket.user_mobile : null,
          dept,
          statusLabel,
          escalation,
          formatDateTime(ticket.created_at),
        ].filter(Boolean);

        const open = () => {
          if (onSelect) onSelect(ticket.id);
        };

        return (
          <li key={ticket.id}>
            <div
              className={cn('admin-tickets-hub__ticket', ticketRowClass(ticket.status))}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              onClick={onSelect ? open : undefined}
              onKeyDown={
                onSelect
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        open();
                      }
                    }
                  : undefined
              }
            >
              <span className="admin-tickets-hub__ticket-dot" aria-hidden />
              <div className="admin-tickets-hub__ticket-body">
                <p className="admin-tickets-hub__ticket-subject">{ticket.subject}</p>
                <p className="admin-tickets-hub__ticket-meta">
                  {meta.map((part, i) => (
                    <span key={`${ticket.id}-${i}`}>
                      {i > 0 ? <span className="admin-tickets-hub__ticket-sep">·</span> : null}
                      {part}
                    </span>
                  ))}
                </p>
              </div>
              <div className="admin-tickets-hub__ticket-actions">
                {onSelect ? (
                  <span className="admin-tickets-hub__ticket-cta">
                    گفت‌وگو
                    <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                ) : (
                  <Link
                    href={`/admin/academy/tickets/${ticket.id}`}
                    className="admin-tickets-hub__ticket-cta"
                    onClick={(e) => e.stopPropagation()}
                  >
                    مشاهده
                    <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  </Link>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
