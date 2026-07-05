/**
 * A film-grain overlay produced from inline SVG noise — no network requests,
 * scales infinitely, blends as a soft luminosity layer. Renders once at the
 * top of <body>; opacity is intentionally low. Server component (no JS).
 */
export function GrainOverlay({
  opacity = 0.06,
  className,
}: {
  opacity?: number;
  className?: string;
}) {
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>
      <filter id='n'>
        <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>
        <feColorMatrix type='saturate' values='0'/>
        <feComponentTransfer><feFuncA type='linear' slope='0.55'/></feComponentTransfer>
      </filter>
      <rect width='100%' height='100%' filter='url(#n)'/>
    </svg>
  `;
  const dataUri = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

  return (
    <div
      aria-hidden
      className={
        "pointer-events-none fixed inset-0 z-[1] mix-blend-overlay " +
        (className ?? "")
      }
      style={{
        backgroundImage: dataUri,
        opacity,
      }}
    />
  );
}
