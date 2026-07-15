export function FeedDateSeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-1">
      <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-medium text-bone/55 backdrop-blur-sm">
        {label}
      </span>
    </div>
  );
}
