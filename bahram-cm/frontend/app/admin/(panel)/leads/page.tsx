import { getLeads } from '@/lib/admin/data';
import { AdminPage, Table } from '../ui';
import { LeadRow } from './LeadRow';
import { LeadsFilter } from './LeadsFilter';

export const dynamic = 'force-dynamic';

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const formType = sp.type || undefined;
  const leads = await getLeads({ form_type: formType });

  return (
    <AdminPage title="لیدها و فرم‌ها" desc="تمام فرم‌های پر شده در سایت — دسته‌بندی بر اساس نوع فرم">
      <LeadsFilter currentType={sp.type ?? ''} />
      {leads.length > 0 ? (
        <Table head={['نام', 'تلفن', 'نوع فرم', 'علاقه', 'وضعیت', 'تاریخ', 'عملیات']}>
          {leads.map((l) => (
            <LeadRow
              key={l.id}
              lead={{
                id: l.id,
                name: l.name,
                phone: l.phone,
                formType: l.form_type,
                treatmentTags: l.treatment_tags ?? null,
                selection: l.selection ?? null,
                preferredContact: l.preferred_contact ?? null,
                budgetPref: l.budget_pref ?? null,
                bestCallTime: l.best_call_time ?? null,
                pageUrl: l.page_url ?? null,
                source: l.source,
                statusName: l.status?.name ?? 'NEW',
                statusLabel: l.status?.label ?? null,
                campaign: l.campaign ?? null,
                createdAt: l.created_at,
                utm: l.utm ?? null,
                answers: (l.answers ?? []).map((a) => ({ questionKey: a.question_key, answerValue: a.answer_value })),
                notes: (l.notes ?? []).map((n) => ({ id: n.id, note: n.note, createdAt: n.created_at })),
                photos: (l.media ?? [])
                  .map((m) => ({ id: m.id, url: m.view_url ?? m.url ?? '' }))
                  .filter((m) => m.url),
              }}
            />
          ))}
        </Table>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-h3 text-primary-dark">
            {formType ? 'لیدی در این دسته نیست' : 'هنوز سرنخی ثبت نشده'}
          </p>
          <p className="mx-auto mt-2 max-w-md text-small text-text-muted">
            {formType
              ? 'فرم‌های این دسته هنوز پر نشده‌اند یا فیلتر را تغییر دهید.'
              : 'با اجرای بک‌اند Laravel و ارسال فرم از سایت، لیدها اینجا نمایش داده می‌شوند. مطمئن شوید migrate و seeder اجرا شده و NEXT_PUBLIC_API_URL درست تنظیم شده.'}
          </p>
        </div>
      )}
    </AdminPage>
  );
}
