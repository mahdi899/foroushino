'use client';

import { useEffect, useState } from 'react';
import { JalaliDateField } from '@/components/ui/JalaliDateField';

export function OrdersDateRangeFields({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  const [fromValue, setFromValue] = useState(from ?? '');
  const [toValue, setToValue] = useState(to ?? '');

  useEffect(() => {
    setFromValue(from ?? '');
  }, [from]);

  useEffect(() => {
    setToValue(to ?? '');
  }, [to]);

  return (
    <>
      <input type="hidden" name="from" value={fromValue} />
      <input type="hidden" name="to" value={toValue} />

      <label className="admin-orders-toolbar__field min-w-0">
        <span className="field-label">از تاریخ</span>
        <JalaliDateField
          value={fromValue}
          onChange={setFromValue}
          placeholder="از تاریخ"
          compact
        />
      </label>

      <label className="admin-orders-toolbar__field min-w-0">
        <span className="field-label">تا تاریخ</span>
        <JalaliDateField
          value={toValue}
          onChange={setToValue}
          placeholder="تا تاریخ"
          compact
        />
      </label>
    </>
  );
}
