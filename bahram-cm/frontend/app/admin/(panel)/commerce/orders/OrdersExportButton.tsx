'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { exportOrdersCsv } from '../actions';

export function OrdersExportButton({
  search,
  status,
  productType,
  sort,
  dir,
  days,
  from,
  to,
}: {
  search?: string;
  status?: string;
  productType?: string;
  sort?: string;
  dir?: string;
  days?: string;
  from?: string;
  to?: string;
}) {
  const [pending, setPending] = useState(false);

  async function onExport() {
    setPending(true);
    const res = await exportOrdersCsv({
      search: search?.trim() || undefined,
      status: status || undefined,
      product_type: productType || undefined,
      sort: sort || undefined,
      dir: dir || undefined,
      days: days || undefined,
      from: from || undefined,
      to: to || undefined,
    });
    setPending(false);

    if (!res.ok) {
      window.alert(res.error);
      return;
    }

    const url = URL.createObjectURL(res.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = res.filename;
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
