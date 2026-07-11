'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { grantCourseAccess } from '../actions';
import { StudentSearchPicker, type SelectedStudent } from '../tickets/StudentSearchPicker';
import type { AdminProduct } from '@/lib/admin/commerceTypes';

export function GrantAccessForm({ products }: { products: AdminProduct[] }) {
  const router = useRouter();
  const [student, setStudent] = useState<SelectedStudent | null>(null);
  const [productId, setProductId] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const activeProducts = products.filter((product) => product.is_active);

  function handleStudentChange(next: SelectedStudent | null) {
    setStudent(next);
    setError('');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setMessage('');

    if (!student) {
      setPending(false);
      setError('یک دانشجو انتخاب کنید.');
      return;
    }

    if (!student.mobile) {
      setPending(false);
      setError('دانشجوی انتخاب‌شده شماره موبایل ندارد.');
      return;
    }

    if (!productId) {
      setPending(false);
      setError('یک محصول انتخاب کنید.');
      return;
    }

    const res = await grantCourseAccess({
      mobile: student.mobile,
      name: student.display_name || undefined,
      product_id: Number(productId),
    });

    setPending(false);
    if (res.ok) {
      setMessage('دسترسی با موفقیت اعطا شد.');
      setStudent(null);
      setProductId('');
      router.refresh();
    } else {
      setError('error' in res ? (res.error ?? 'خطا') : 'خطا');
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
      <div className="md:col-span-1">
        <StudentSearchPicker value={student} onChange={handleStudentChange} required />
      </div>

      <label className="md:col-span-1">
        <span className="field-label">محصول *</span>
        <select
          required
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="field-input"
        >
          <option value="">انتخاب محصول...</option>
          {activeProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.title}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-end gap-3 md:col-span-1">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          اعطای دسترسی دستی
        </button>
      </div>

      {message && <p className="text-small text-success md:col-span-3">{message}</p>}
      {error && <p className="text-small text-error md:col-span-3">{error}</p>}
    </form>
  );
}
