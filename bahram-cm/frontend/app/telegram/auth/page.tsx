'use client';

import { useEffect, useState } from 'react';

export default function TelegramAuthPage() {
  const [status, setStatus] = useState('در حال اتصال به تلگرام…');

  useEffect(() => {
    const initData = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData;
    if (!initData) {
      setStatus('این صفحه باید داخل Telegram Mini App باز شود.');
      return;
    }

    fetch('/api/v1/telegram/miniapp/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ init_data: initData }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setStatus(json?.error?.message_fa || 'ورود ناموفق بود.');
          return;
        }
        setStatus('ورود موفق. می‌توانید احراز هویت را ادامه دهید.');
      })
      .catch(() => setStatus('خطا در ارتباط با سرور.'));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">ورود از ربات</h1>
      <p className="text-sm text-white/80">{status}</p>
    </div>
  );
}
