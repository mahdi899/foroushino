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
} from 'lucide-react';
import { fetchTicketDetail, fetchTicketUsers, fetchTicketsByUser } from '../actions';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { Badge, Table } from '../../ui';
import { CreateTicketForStudentForm } from './CreateTicketForStudentForm';
import { TicketChatPanel } from './TicketChatPanel';
import { TicketReportPanel } from './TicketReportPanel';
import {
  TICKET_STATUS_LABELS,
  formatDateTime,
  type AdminTicket,
  type AdminTicketDetail,
  type AdminTicketUserGroup,
  type PageMeta,
} from '@/lib/admin/academyTypes';
import { cn } from '@/lib/utils';

type TabId = 'send' | 'users' | 'reports';

const TABS: { id: TabId; label: string; icon: typeof MessageSquarePlus }[] = [
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

export function TicketsHubClient({ initialTickets }: { initialTickets: AdminTicket[] }) {
  const [tab, setTab] = useState<TabId>('users');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [users, setUsers] = useState<AdminTicketUserGroup[]>([]);
  const [usersMeta, setUsersMeta] = useState<PageMeta | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminTicketUserGroup | null>(null);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [activeTicket, setActiveTicket] = useState<AdminTicketDetail | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);

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

  useEffect(() => {
    if (tab === 'users') void loadUsers(1, debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, debouncedQuery]);

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

  return (
    <div className="admin-tickets-hub">
      <div className="admin-period-toolbar admin-tickets-hub__tabs">
        <div className="admin-period-segments">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className="admin-period-btn inline-flex items-center gap-2"
              data-active={tab === id ? 'true' : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        {tab === 'users' && usersMeta ? (
          <span className="admin-period-summary">
            {usersMeta.total.toLocaleString('fa-IR')} کاربر با تیکت
          </span>
        ) : null}
      </div>

      {tab === 'send' && (
        <div className="admin-tickets-hub__send">
          <CreateTicketForStudentForm defaultOpen />
          {initialTickets.length > 0 && (
            <div className="admin-dashboard-panel">
              <div className="admin-dashboard-panel__head">
                <h2 className="admin-dashboard-panel__title">آخرین تیکت‌ها</h2>
              </div>
              <div className="admin-dashboard-panel__body admin-dashboard-panel__body--padded">
                <TicketTable tickets={initialTickets.slice(0, 20)} />
              </div>
            </div>
          )}
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
                  <Link
                    href={`/admin/academy/students/${selectedUser.user_id}`}
                    className="admin-dashboard-panel__action"
                  >
                    پروفایل دانشجو
                  </Link>
                </div>
                <div className="admin-tickets-hub__main-body">
                  <div className="admin-tickets-hub__main-head lg:hidden">
                    <div className="min-w-0">
                      <h2 className="admin-dashboard-panel__title">{selectedUser.name ?? 'دانشجو'}</h2>
                      <p className="text-caption text-text-muted" dir="ltr">
                        {selectedUser.mobile}
                      </p>
                    </div>
                    <Link
                      href={`/admin/academy/students/${selectedUser.user_id}`}
                      className="admin-dashboard-panel__action shrink-0"
                    >
                      پروفایل
                    </Link>
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
                <TicketChatPanel ticket={activeTicket} compact />
              </div>
            ) : null}
          </main>
        </div>
      )}
    </div>
  );
}

function TicketTable({ tickets, onSelect }: { tickets: AdminTicket[]; onSelect?: (id: number) => void }) {
  if (tickets.length === 0) {
    return (
      <HubEmptyState
        icon={<Inbox className="h-6 w-6" strokeWidth={1.75} />}
        title="تیکتی یافت نشد"
        description="برای این دانشجو هنوز تیکتی ثبت نشده است."
      />
    );
  }

  return (
    <Table
      head={['موضوع', 'وضعیت', 'تاریخ', 'عملیات']}
      mobile={tickets.map((ticket) => (
        <AdminTableCard
          key={ticket.id}
          title={ticket.subject}
          fields={[
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
        <tr key={ticket.id} className="hover:bg-surface-soft/40">
          <td className="px-4 py-3 font-medium text-text">{ticket.subject}</td>
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
