import {
  Bell,
  CheckCircle2,
  Megaphone,
  MessageCircle,
  Sparkles,
  Timer,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

export type FamilyNotificationVariant = 'accent' | 'success' | 'warning' | 'neutral' | 'welcome';

export function familyNotificationIcon(type: string | null | undefined): LucideIcon {
  switch (type) {
    case 'welcome':
      return Sparkles;
    case 'family_comment_approved':
      return CheckCircle2;
    case 'family_comment_rejected':
      return XCircle;
    case 'family_bahram_replied':
      return MessageCircle;
    case 'family_action_follow_up':
      return Timer;
    case 'family_important_post':
      return Megaphone;
    default:
      return Bell;
  }
}

export function familyNotificationVariant(type: string | null | undefined): FamilyNotificationVariant {
  switch (type) {
    case 'welcome':
      return 'welcome';
    case 'family_comment_approved':
    case 'family_bahram_replied':
      return 'success';
    case 'family_comment_rejected':
      return 'warning';
    case 'family_action_follow_up':
      return 'neutral';
    case 'family_important_post':
      return 'accent';
    default:
      return 'accent';
  }
}
