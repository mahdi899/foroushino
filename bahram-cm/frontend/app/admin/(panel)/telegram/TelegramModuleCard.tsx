import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AdminLucideIcon } from '@/lib/admin/lucide-icons';
import type { TelegramModule } from '@/lib/admin/telegram.types';
import { cn } from '@/lib/utils';

export function TelegramModuleCard({ module }: { module: TelegramModule }) {
  return (
    <Link href={module.href} className={cn('admin-telegram-module-card', `admin-telegram-module-card--${module.tone}`)}>
      <span className={cn('admin-telegram-module-card__icon', `admin-telegram-module-card__icon--${module.tone}`)}>
        <AdminLucideIcon name={module.icon} className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" strokeWidth={1.85} />
      </span>
      <div className="admin-telegram-module-card__body">
        <h3 className="admin-telegram-module-card__title">{module.label}</h3>
        <p className="admin-telegram-module-card__desc">{module.description}</p>
      </div>
      <span className="admin-telegram-module-card__cta" aria-hidden>
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
      </span>
    </Link>
  );
}
