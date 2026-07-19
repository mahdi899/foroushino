function StatSkeleton() {
  return <div className="admin-stat-card admin-panel-skeleton h-[5.5rem] sm:h-[6rem]" aria-hidden />;
}

function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="admin-dashboard-kpi-grid">
      {Array.from({ length: rows }).map((_, index) => (
        <StatSkeleton key={index} />
      ))}
    </div>
  );
}

/** Instant shell feedback while admin routes stream in. */
export default function AdminPanelLoading() {
  return (
    <div className="admin-dashboard" aria-busy="true" aria-label="در حال بارگذاری پنل">
      <div className="admin-panel-skeleton admin-dashboard-welcome mb-6 h-20 rounded-card" />
      <section className="admin-dashboard-section">
        <div className="admin-panel-skeleton mb-4 h-5 w-36 rounded" />
        <PanelSkeleton />
      </section>
      <section className="admin-dashboard-section">
        <div className="admin-panel-skeleton mb-4 h-5 w-44 rounded" />
        <PanelSkeleton rows={6} />
      </section>
    </div>
  );
}
