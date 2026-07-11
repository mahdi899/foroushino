import { Bell, BookOpen, Clapperboard, FileText, KeyRound, MessageSquare, Receipt, ShieldCheck, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PanelNotificationPayload } from '@/lib/student/panelActions';

const TOASTABLE_SYSTEM_TYPES = new Set([
  'welcome',
  'order_paid',
  'license_ready',
  'mini_course_enrolled',
  'ticket_reply',
  'identity_approved',
  'identity_rejected',
  'identity_needs_correction',
]);

/** Admin broadcasts and selected system events surface as panel popups. */
export function shouldShowNotificationToast(notification: PanelNotificationPayload): boolean {
  if (notification.show_toast === true) return true;
  return TOASTABLE_SYSTEM_TYPES.has(notification.type ?? '');
}

export function notificationTypeIcon(type: string | null | undefined): LucideIcon {
  switch (type) {
    case 'order_paid':
      return Receipt;
    case 'license_ready':
      return KeyRound;
    case 'mini_course_enrolled':
      return Clapperboard;
    case 'ticket_created':
    case 'ticket_reply':
      return MessageSquare;
    case 'product_new':
      return Sparkles;
    case 'article_new':
      return FileText;
    case 'welcome':
      return BookOpen;
    case 'identity_approved':
    case 'identity_rejected':
    case 'identity_needs_correction':
      return ShieldCheck;
    default:
      return Bell;
  }
}

export function notificationTypeLabel(type: string | null | undefined) {
  switch (type) {
    case 'order_paid':
      return 'سفارش';
    case 'license_ready':
      return 'لایسنس';
    case 'mini_course_enrolled':
      return 'مینی‌دوره';
    case 'ticket_created':
      return 'تیکت';
    case 'ticket_reply':
      return 'پاسخ تیکت';
    case 'product_new':
      return 'محصول جدید';
    case 'article_new':
      return 'مطلب جدید';
    case 'welcome':
      return 'خوش‌آمد';
    case 'identity_approved':
      return 'تأیید هویت';
    case 'identity_rejected':
      return 'رد هویت';
    case 'identity_needs_correction':
      return 'اصلاح مدارک';
    default:
      return 'اعلان';
  }
}

export function notificationTypeVariant(type: string | null | undefined): 'teal' | 'gold' | 'success' | 'neutral' {
  switch (type) {
    case 'order_paid':
    case 'license_ready':
    case 'mini_course_enrolled':
      return 'teal';
    case 'welcome':
      return 'gold';
    case 'ticket_created':
    case 'ticket_reply':
      return 'success';
    case 'identity_approved':
      return 'success';
    case 'identity_rejected':
      return 'neutral';
    case 'identity_needs_correction':
      return 'gold';
    default:
      return 'neutral';
  }
}
