'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { exportOrdersCsv } from '../actions';

export function OrdersExportButton({
  search,
  status,
  paymentStatus,
  productType,
}: {
  search?: string;
  status?: string;
  paymentStatus?: string;
  productType?: string;
}) {
  const [pending, setPending] = useState(false);

  async function onExport() {
    setPending(true);
    const res = await exportOrdersCsv({
      search: search?.trim() || undefined,
      status: status || undefined,
      payment_status: paymentStatus || undefined,
      product_type: productType || undefined,
    });
    setPending(false);

    if (!res.ok) {
      window.alert(res.error);
      return;
    }

    const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={() => void onExport()}
      disabled={pending}
      className="btn btn-secondary shrink-0 text-small"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      خروجی اکسل
    </button>
  );
}
