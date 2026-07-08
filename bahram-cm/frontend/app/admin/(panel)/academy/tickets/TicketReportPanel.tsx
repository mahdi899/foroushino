'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { fetchTicketReports } from '../actions';
import { StatCard } from '../../ui';
import type { AdminTicketReport } from '@/lib/admin/academyTypes';

const STATUS_OPTIONS = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'open', label: 'باز' },
  { value: 'answered', label: 'پاسخ داده شده' },
  { value: 'waiting_user', label: 'در انتظار کاربر' },
  { value: 'closed', label: 'بسته' },
];

const DEPARTMENT_OPTIONS = [
  { value: '', label: 'همه واحدها' },
  { value: 'technical', label: 'فنی' },
  { value: 'financial', label: 'مالی' },
  { value: 'course', label: 'دوره' },
];

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function TicketReportPanel() {
  const [report, setReport] = useState<AdminTicketReport | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    const res = await fetchTicketReports({ from, to, status, department });
    setLoading(false);
    if (res.ok && res.data) {
      setReport(res.data);
    } else {
      setError(res.error ?? 'بارگذاری گزارش ناموفق بود.');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportCsv() {
    if (!report) return;
    const rows = [
      ['date', 'created', 'closed'],
      ...report.by_day.map((row) => [row.date, row.created, row.closed]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ticket-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <label>
          <span className="field-label">از تاریخ</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="field-input" />
        </label>
        <label>
          <span className="field-label">تا تاریخ</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="field-input" />
        </label>
        <label>
          <span className="field-label">وضعیت</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="field-input">
            {STATUS_OPTIONS.map((item) => <option key={item.value || 'all'} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label>
          <span className="field-label">واحد</span>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className="field-input">
            {DEPARTMENT_OPTIONS.map((item) => <option key={item.value || 'all'} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void load()} className="btn btn-primary">اعمال فیلتر</button>
        <button type="button" onClick={exportCsv} disabled={!report} className="btn btn-secondary ms-auto">
          <Download className="h-4 w-4" />
          CSV
        </button>
      </div>

      {loading && <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>}
      {error && <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{error}</div>}

      {report && !loading && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="کل تیکت‌ها" value={report.summary.total} icon="Ticket" />
            <StatCard label="باز" value={report.summary.open} icon="AlertCircle" />
            <StatCard label="پاسخ داده" value={report.summary.answered} icon="CheckCircle" />
            <StatCard label="بسته" value={report.summary.closed} icon="XCircle" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-4">
              <h3 className="mb-3 text-small font-bold text-primary-dark">بر اساس واحد</h3>
              <ul className="space-y-2 text-small">
                {report.by_department.map((row) => (
                  <li key={row.department} className="flex justify-between">
                    <span>{DEPARTMENT_OPTIONS.find((d) => d.value === row.department)?.label ?? row.department}</span>
                    <span className="font-bold text-primary">{row.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-4">
              <h3 className="mb-3 text-small font-bold text-primary-dark">کاربران پرتکرار</h3>
              <ul className="space-y-2 text-small">
                {report.top_users.map((user) => (
                  <li key={user.user_id} className="flex justify-between gap-3">
                    <span className="truncate">{user.name ?? '—'} <span dir="ltr" className="text-caption text-text-muted">{user.mobile}</span></span>
                    <span className="font-bold text-primary">{user.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card overflow-x-auto p-4">
            <h3 className="mb-3 text-small font-bold text-primary-dark">روند روزانه</h3>
            <table className="w-full text-small">
              <thead className="text-text-muted">
                <tr className="border-b border-border">
                  <th className="py-2 text-right">تاریخ</th>
                  <th className="py-2 text-right">ایجاد شده</th>
                  <th className="py-2 text-right">بسته شده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.by_day.map((row) => (
                  <tr key={row.date}>
                    <td className="py-2" dir="ltr">{row.date}</td>
                    <td className="py-2">{row.created}</td>
                    <td className="py-2">{row.closed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
