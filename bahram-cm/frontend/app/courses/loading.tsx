export default function Loading() {
  return (
    <div className="container-page py-16">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 rounded-2xl bg-surface-muted/30" />
        ))}
      </div>
    </div>
  );
}
