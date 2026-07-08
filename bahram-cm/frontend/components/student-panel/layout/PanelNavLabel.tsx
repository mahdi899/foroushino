export function PanelNavLabel({ label, className }: { label: string; className?: string }) {
  return (
    <span className={className}>
      {label}
    </span>
  );
}
