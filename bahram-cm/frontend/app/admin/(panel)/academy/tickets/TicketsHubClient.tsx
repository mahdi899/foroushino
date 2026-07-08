'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2, MessageSquarePlus, Search, Users, BarChart3 } from 'lucide-react';
import { fetchTicketDetail, fetchTicketUsers, fetchTicketsByUser } from '../actions';
import { Badge } from '../../ui';
import { CreateTicketForStudentForm } from './CreateTicketForStudentForm';
import { TicketChatPanel } from './TicketChatPanel';
import { TicketReportPanel } from './TicketReportPanel';
import { TICKET_STATUS_LABELS, formatDateTime, type AdminTicket, type AdminTicketDetail, type AdminTicketUserGroup, type PageMeta } from '@/lib/admin/academyTypes';

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

  return (
    <div>
      <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-surface-soft p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-small font-semibold transition ${tab === id ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'}`}>
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === 'send' && (
        <div>
          <CreateTicketForStudentForm defaultOpen />
          {initialTickets.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-3 text-small font-bold text-primary-dark">آخرین تیکت‌ها</h3>
              <TicketTable tickets={initialTickets.slice(0, 20)} />
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && <TicketReportPanel />}

      {tab === 'users' && (
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input className="field-input w-full ps-9" placeholder="جستجو نام یا موبایل..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            {usersLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : users.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-caption text-text-muted">کاربری یافت نشد</div>
            ) : (
              <ul className="space-y-1">
                {users.map((user) => (
                  <li key={user.user_id}>
                    <button type="button" onClick={() => void selectUser(user)} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-start text-small transition hover:bg-surface-soft ${selectedUser?.user_id === user.user_id ? 'bg-accent-soft ring-1 ring-accent/30' : ''}`}>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-text">{user.name ?? '—'}</span>
                        <span className="block text-caption text-text-muted" dir="ltr">{user.mobile}</span>
                      </span>
                      <span className="shrink-0 text-caption text-text-muted">{user.tickets_count} تیکت</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {usersMeta && usersMeta.last_page > 1 && (
              <div className="flex items-center justify-between text-caption text-text-muted">
                <button className="btn btn-secondary py-1 text-caption" disabled={usersMeta.current_page <= 1} onClick={() => void loadUsers(usersMeta.current_page - 1)}>
                  <ChevronRight className="h-3 w-3" />
                  قبلی
                </button>
                <span>{usersMeta.current_page}/{usersMeta.last_page}</span>
                <button className="btn btn-secondary py-1 text-caption" disabled={usersMeta.current_page >= usersMeta.last_page} onClick={() => void loadUsers(usersMeta.current_page + 1)}>
                  بعدی
                  <ChevronLeft className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <div className="min-w-0">
            {!selectedUser && (
              <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-caption text-text-muted">
                یک کاربر را انتخاب کنید
              </div>
            )}
            {selectedUser && !activeTicket && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-small font-bold text-primary-dark">{selectedUser.name ?? 'دانشجو'}</h3>
                    <p dir="ltr" className="text-caption text-text-muted">{selectedUser.mobile}</p>
                  </div>
                  <Link href={`/admin/academy/students/${selectedUser.user_id}`} className="text-caption text-accent hover:underline">پروفایل دانشجو</Link>
                </div>
                {ticketsLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : <TicketTable tickets={tickets} onSelect={(id) => void openTicket(id)} />}
              </div>
            )}
            {ticketLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
            {activeTicket && !ticketLoading && (
              <div className="overflow-hidden rounded-xl border border-border">
                <TicketChatPanel ticket={activeTicket} compact />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TicketTable({ tickets, onSelect }: { tickets: AdminTicket[]; onSelect?: (id: number) => void }) {
  if (tickets.length === 0) {
    return <div className="rounded-xl border border-dashed border-border p-8 text-center text-caption text-text-muted">تیکتی یافت نشد</div>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-right text-small">
        <thead>
          <tr className="border-b border-border bg-surface-soft/60 text-text-muted">
            <th className="px-4 py-3 font-semibold">موضوع</th>
            <th className="px-4 py-3 font-semibold">وضعیت</th>
            <th className="hidden px-4 py-3 font-semibold md:table-cell">تاریخ</th>
            <th className="px-4 py-3 font-semibold">عملیات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-surface-soft/40">
              <td className="px-4 py-3">{ticket.subject}</td>
              <td className="px-4 py-3"><Badge tone={STATUS_TONE[ticket.status] ?? 'default'}>{TICKET_STATUS_LABELS[ticket.status]}</Badge></td>
              <td className="hidden whitespace-nowrap px-4 py-3 text-caption text-text-muted md:table-cell">{formatDateTime(ticket.created_at)}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  {onSelect && <button type="button" onClick={() => onSelect(ticket.id)} className="text-caption text-accent hover:underline">چت</button>}
                  <Link href={`/admin/academy/tickets/${ticket.id}`} className="text-caption text-text-muted hover:text-accent">صفحه</Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
