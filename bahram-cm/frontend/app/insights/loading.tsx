export default function Loading() {
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
        <div className="h-10 w-2/3 rounded-lg bg-surface-muted/40" />
        <div className="h-4 w-full rounded bg-surface-muted/30" />
        <div className="h-4 w-5/6 rounded bg-surface-muted/30" />
        <div className="aspect-[16/9] rounded-2xl bg-surface-muted/30" />
      </div>
    </div>
  );
}
