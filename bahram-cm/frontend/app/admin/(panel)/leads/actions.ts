'use server';

import { revalidatePath } from 'next/cache';
import { adminFetch } from '@/lib/auth/session';

export interface UpdateLeadInput {
  name?: string;
  phone?: string;
  treatment_tags?: string | null;
  preferred_contact?: string | null;
  budget_pref?: string | null;
  best_call_time?: string | null;
  user_notes?: string | null;
  answers?: { question_key: string; answer_value: string }[];
}

export interface LeadNoteItem {
  id: number;
  note: string;
  createdAt: string;
}

function mapNote(raw: { id: number; note: string; created_at: string }): LeadNoteItem {
  return { id: raw.id, note: raw.note, createdAt: raw.created_at };
}

export async function updateLeadStatus(id: number, status: string): Promise<{ ok: boolean }> {
  try {
    await adminFetch(`/leads/${id}`, { method: 'PATCH', body: { status } });
    revalidatePath('/admin/leads');
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function addLeadNote(
  id: number,
  note: string,
): Promise<{ ok: boolean; note?: LeadNoteItem; error?: string }> {
  try {
    const res = await adminFetch<{ data: { id: number; note: string; created_at: string } }>(`/leads/${id}/notes`, {
      method: 'POST',
      body: { note },
    });
    revalidatePath('/admin/leads');
    return { ok: true, note: mapNote(res.data) };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'خطا در ثبت یادداشت';
    return { ok: false, error: message };
  }
}

export async function updateLeadNote(
  leadId: number,
  noteId: number,
  note: string,
): Promise<{ ok: boolean; note?: LeadNoteItem; error?: string }> {
  try {
    const res = await adminFetch<{ data: { id: number; note: string; created_at: string } }>(
      `/leads/${leadId}/notes/${noteId}`,
      { method: 'PATCH', body: { note } },
    );
    revalidatePath('/admin/leads');
    return { ok: true, note: mapNote(res.data) };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'خطا در ویرایش یادداشت';
    return { ok: false, error: message };
  }
}

export async function deleteLeadNote(
  leadId: number,
  noteId: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/leads/${leadId}/notes/${noteId}`, { method: 'DELETE' });
    revalidatePath('/admin/leads');
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'خطا در حذف یادداشت';
    return { ok: false, error: message };
  }
}

export async function updateLead(id: number, data: UpdateLeadInput): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/leads/${id}`, { method: 'PATCH', body: data });
    revalidatePath('/admin/leads');
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'خطا در ذخیره';
    return { ok: false, error: message };
  }
}

export async function deleteLead(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/leads/${id}`, { method: 'DELETE' });
    revalidatePath('/admin/leads');
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'خطا در حذف';
    return { ok: false, error: message };
  }
}
