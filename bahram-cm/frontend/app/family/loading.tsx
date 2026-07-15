import { FamilyRouteSkeleton } from '@/components/family/FamilyRouteSkeleton';

export default function FamilyLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <FamilyRouteSkeleton />
    </div>
  );
}
