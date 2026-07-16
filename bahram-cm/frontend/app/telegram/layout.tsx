import type { ReactNode } from 'react';

export default function TelegramMiniAppLayout({ children }: { children: ReactNode }) {
  return (
    <div dir="rtl" className="min-h-dvh bg-[#0f172a] text-white">
      <main className="mx-auto max-w-md px-4 py-6">{children}</main>
    </div>
  );
}
