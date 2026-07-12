import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminMobileBackLink({
  href,
  label = 'بازگشت',
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn('admin-mobile-back lg:hidden', className)}>
      <ChevronRight className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
