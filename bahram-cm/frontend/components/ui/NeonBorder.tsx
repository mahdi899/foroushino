import { cn } from "@/lib/cn";
import {
  Children,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

export type NeonBorderTone = "brand" | "gold" | "sales" | "vip";
export type NeonBorderShape = "pill" | "rounded";

export type NeonBorderProps = {
  children: ReactNode;
  className?: string;
  /** Ring thickness in px (default 3) */
  width?: number;
  /** Full rotation cycle in seconds (default 3) */
  speed?: number;
  /** Color preset */
  tone?: NeonBorderTone;
  /** Subtle lift + faster spin on hover */
  hoverLift?: boolean;
  /** Outer corner radius */
  shape?: NeonBorderShape;
  /** Soft outer glow (no static frame) */
  glow?: boolean;
};

type NeonChildProps = {
  className?: string;
  style?: CSSProperties;
};

const toneClass: Record<Exclude<NeonBorderTone, "brand">, string> = {
  gold: "neon-border--gold",
  sales: "neon-border--sales",
  vip: "neon-border--vip",
};

/**
 * Invisible padding shell — neon beam spins in the gap *outside* the child button.
 *
 * @example
 * <NeonBorder>
 *   <LinkButton variant="primary">آغاز مسیر</LinkButton>
 * </NeonBorder>
 */
export function NeonBorder({
  children,
  className,
  width = 3,
  speed = 3,
  tone = "brand",
  hoverLift = true,
  shape = "pill",
  glow = true,
}: NeonBorderProps) {
  const child = Children.only(children);

  if (!isValidElement<NeonChildProps>(child)) {
    throw new Error("NeonBorder expects a single React element child");
  }

  const cssVars = {
    "--neon-border-width": `${width}px`,
    "--neon-border-speed": `${speed}s`,
  } as CSSProperties;

  return (
    <span
      className={cn(
        "neon-border",
        hoverLift && "neon-border--hover-lift",
        shape === "rounded" && "neon-border--rounded",
        glow && "neon-border--glow",
        tone !== "brand" && toneClass[tone],
        className,
      )}
      style={cssVars}
    >
      <span className="neon-border__spin" aria-hidden />
      {cloneElement(child as ReactElement<NeonChildProps>, {
        className: cn(child.props.className, "neon-border__btn"),
      })}
    </span>
  );
}
