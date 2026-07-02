import { cn } from "@/lib/cn";

const idle = "icon-live";

const ease = "ease-[var(--ease-luxe)]";

/** Decorative icons: idle pulse + stronger pop on parent `group` hover */
export function liveIcon(className?: string) {
  return cn(
    idle,
    `transition-transform duration-300 ${ease} motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-[10deg]`,
    className,
  );
}

/** Arrow icons: idle pulse + slide + slight scale (keeps RTL flip compatible) */
export function liveIconArrow(className?: string) {
  return cn(
    idle,
    `transition-transform duration-300 ${ease} motion-safe:group-hover:scale-105 motion-safe:group-hover:-translate-x-0.5`,
    className,
  );
}

/** Icons in fields: respond to `group` focus-within (e.g. newsletter input) */
export function liveIconInField(className?: string) {
  return cn(
    idle,
    `transition-transform duration-300 ${ease} motion-safe:group-focus-within:scale-110 motion-safe:group-focus-within:-rotate-[8deg]`,
    className,
  );
}
