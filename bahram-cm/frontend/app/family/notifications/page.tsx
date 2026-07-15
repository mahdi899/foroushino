import { FamilyMain, FamilyShell } from '@/components/family/FamilyShell';
import { FamilyNotificationsPanel } from '@/components/family/FamilyNotificationsPanel';

/** Mobile / deep-link notifications — desktop uses inline panel in FeedView. */
export default function FamilyNotificationsPage() {
  return (
    <FamilyShell>
      <FamilyMain className="min-h-0">
        <FamilyNotificationsPanel />
      </FamilyMain>
    </FamilyShell>
  );
}
