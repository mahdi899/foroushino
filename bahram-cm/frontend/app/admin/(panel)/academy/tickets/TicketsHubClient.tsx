'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
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
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { Badge, Table } from '../../ui';
import { CreateTicketForStudentForm } from './CreateTicketForStudentForm';
import { TicketChatPanel } from './TicketChatPanel';
import { TicketReportPanel } from './TicketReportPanel';
import {
  TICKET_DEPARTMENT_LABELS,
  TICKET_DEPARTMENT_OPTIONS,
  TICKET_STATUS_LABELS,
  formatDateTime,
  type AdminTicket,
  type AdminTicketDetail,
  type AdminTicketUserGroup,
  type PageMeta,
} from '@/lib/admin/academyTypes';
import { cn } from '@/lib/utils';

type TabId = 'technical' | 'send' | 'users' | 'reports';

const BASE_TABS: { id: Exclude<TabId, 'technical'>; label: string; icon: typeof MessageSquarePlus }[] = [
  { id: 'send', label: 'ارسال تیکت', icon: MessageSquarePlus },
  { id: 'users', label: 'تیکت‌های کاربران', icon: Users },
  { id: 'reports', label: 'گزارش', icon: BarChart3 },
];

const STATUS_TONE: Record<string, 'default' | 'success' | 'warning'> = {
  closed: 'default',
  answered: 'success',
  open: 'warning',
  waiting_user: 'warning',
};

type TicketRowVariant = 'closed' | 'answered' | 'pending';

function ticketRowVariant(status: AdminTicket['status']): TicketRowVariant | null {
  if (status === 'closed') return 'closed';
  if (status === 'answered' || status === 'waiting_user') return 'answered';
  if (status === 'open') return 'pending';
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

export function TicketsHubClient({
  canViewStudents = false,
  canSearchStudents = false,
  showTechnicalQueue = false,
}: {
  canViewStudents?: boolean;
  canSearchStudents?: boolean;
  showTechnicalQueue?: boolean;
}) {
  const [tab, setTab] = useState<TabId>(showTechnicalQueue ? 'technical' : 'users');
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
  const [activeTicket, setActiveTicket] = useState<AdminTicketDetail | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);

  const tabs = showTechnicalQueue
    ? ([{ id: 'technical' as const, label: 'پشتیبانی فنی', icon: Wrench }, ...BASE_TABS])
    : BASE_TABS;

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

  async function loadTechnicalTickets() {
    setTechnicalLoading(true);
    const res = await fetchRecentTickets(50, 'technical');
    setTechnicalLoading(false);
    if (res.ok) {
      setTechnicalTickets(res.items);
      setTechnicalMeta(res.meta);
    }
  }

  useEffect(() => {
    if (tab === 'users') void loadUsers(1, debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, debouncedQuery]);

  useEffect(() => {
    if (!showTechnicalQueue) return;
    void loadTechnicalTickets();
  }, [showTechnicalQueue]);

  useEffect(() => {
    if (tab !== 'technical') return;
    void loadTechnicalTickets();
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
    const res = await fetchTicketsByUser(user.user_id);
    setTicketsLoading(false);
    if (res.ok) setTickets(res.items);
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
              {id === 'technical' && technicalCount > 0 ? (
                <Badge tone="warning">{technicalCount.toLocaleString('fa-IR')}</Badge>
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
                    <TicketChatPanel ticket={activeTicket} compact canViewStudents={canViewStudents} />
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
                  {technicalLoading ? (
                    <HubLoading />
                  ) : (
                    <TicketTable
                      tickets={technicalTickets}
                      showUser
                      emptyDescription="فعلاً تیکتی برای بررسی پشتیبانی فنی علامت نخورده است."
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
                <div className="admin-dashboard-panel__head hidden lg:flex">
                  <div className="min-w-0">
                    <h2 className="admin-dashboard-panel__title">{selectedUser.name ?? 'دانشجو'}</h2>
                    <p className="text-caption text-text-muted" dir="ltr">
                      {selectedUser.mobile}
                    </p>
                  </div>
                  {canViewStudents ? (
                    <Link
                      href={`/admin/academy/students/${selectedUser.user_id}`}
                      className="admin-dashboard-panel__action"
                    >
                      پروفایل دانشجو
                    </Link>
                  ) : null}
                </div>
                <div className="admin-tickets-hub__main-body">
                  <div className="admin-tickets-hub__main-head lg:hidden">
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
                <TicketChatPanel ticket={activeTicket} compact canViewStudents={canViewStudents} />
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

  const head = showUser
    ? ['موضوع', 'کاربر', 'بخش', 'وضعیت', 'تاریخ', 'عملیات']
    : ['موضوع', 'بخش', 'وضعیت', 'تاریخ', 'عملیات'];

  return (
    <Table
      head={head}
      mobile={tickets.map((ticket) => (
        <AdminTableCard
          key={ticket.id}
          title={ticket.subject}
          className={ticketRowClass(ticket.status)}
          fields={[
            ...(showUser
              ? [
                  {
                    label: 'کاربر',
                    value: (
                      <span>
                        {ticket.user_name ?? '—'}
                        {ticket.user_mobile ? (
                          <span className="ms-2 text-text-muted" dir="ltr">
                            {ticket.user_mobile}
                          </span>
                        ) : null}
                      </span>
                    ),
                  },
                ]
              : []),
            {
              label: 'بخش',
              value: (
                <Badge tone={ticket.department === 'technical' ? 'warning' : 'default'}>
                  {departmentLabel(ticket.department)}
                </Badge>
              ),
            },
            {
              label: 'وضعیت',
              value: (
                <Badge tone={STATUS_TONE[ticket.status] ?? 'default'}>
                  {TICKET_STATUS_LABELS[ticket.status]}
                </Badge>
              ),
            },
            { label: 'تاریخ', value: formatDateTime(ticket.created_at) },
          ]}
          footer={
            <div className="flex w-full flex-wrap justify-end gap-2">
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(ticket.id)}
                  className="btn btn-secondary py-1.5 text-caption"
                >
                  گفت‌وگو
                </button>
              ) : null}
              <Link
                href={`/admin/academy/tickets/${ticket.id}`}
                className="btn btn-secondary py-1.5 text-caption"
              >
                صفحه تیکت
              </Link>
            </div>
          }
        />
      ))}
    >
      {tickets.map((ticket) => (
        <tr key={ticket.id} className={cn('hover:bg-surface-soft/40', ticketRowClass(ticket.status))}>
          <td className="px-4 py-3 font-medium text-text">{ticket.subject}</td>
          {showUser ? (
            <td className="px-4 py-3 text-small">
              <div>{ticket.user_name ?? '—'}</div>
              {ticket.user_mobile ? (
                <div className="text-caption text-text-muted" dir="ltr">
                  {ticket.user_mobile}
                </div>
              ) : null}
            </td>
          ) : null}
          <td className="px-4 py-3">
            <Badge tone={ticket.department === 'technical' ? 'warning' : 'default'}>
              {departmentLabel(ticket.department)}
            </Badge>
          </td>
          <td className="px-4 py-3">
            <Badge tone={STATUS_TONE[ticket.status] ?? 'default'}>
              {TICKET_STATUS_LABELS[ticket.status]}
            </Badge>
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-caption text-text-muted">
            {formatDateTime(ticket.created_at)}
          </td>
          <td className="px-4 py-3">
            <div className="flex gap-2">
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(ticket.id)}
                  className="text-caption font-semibold text-accent hover:text-primary"
                >
                  گفت‌وگو
                </button>
              ) : null}
              <Link
                href={`/admin/academy/tickets/${ticket.id}`}
                className="text-caption text-text-muted hover:text-accent"
              >
                صفحه
              </Link>
            </div>
          </td>
        </tr>
      ))}
    </Table>
  );
}
