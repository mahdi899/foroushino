export default function Loading() {
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-2xl space-y-4 animate-pulse">
        <div className="h-8 w-1/3 rounded-lg bg-surface-muted/40" />
        <div className="h-40 rounded-2xl bg-surface-muted/30" />
        <div className="h-12 rounded-xl bg-surface-muted/30" />
      </div>
    </div>
  );
}
