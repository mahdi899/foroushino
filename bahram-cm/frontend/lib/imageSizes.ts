/** Shared `sizes` hints for next/image — keeps optimizer requests close to rendered width. */
export const IMAGE_SIZES = {
  /** Article / blog in-content cover (~container-content). */
  blogCover: '(max-width:1024px) 100vw, 720px',
  /** Hero LCP image — max ~28rem (448px) on desktop. */
  hero: '(max-width:640px) 92vw, (max-width:1024px) 45vw, 448px',
  /** Journey visual hub — ~half grid on desktop (~470px rendered). */
  journeyVisual: '(max-width:640px) 88vw, (max-width:1024px) 45vw, 470px',
  /** Journey step thumbnail on mobile. */
  journeyStep: '(max-width:768px) 88vw, 45vw',
  /** 3-column card grid — cap to avoid oversized tiles. */
  cardThird: '(max-width:640px) 45vw, (max-width:1024px) 30vw, 280px',
  /** 2-column card grid. */
  cardHalf: '(max-width:768px) 92vw, (max-width:1024px) 48vw, 560px',
  /** Safe default when a fill image has no explicit sizes. */
  fillDefault: '(max-width:768px) 100vw, 50vw',
} as const;

/** Max delivery width — caps Next.js optimizer requests on large monitors. */
export const MAX_IMAGE_DELIVERY_WIDTH = 1920;
