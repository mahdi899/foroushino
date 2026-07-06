import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  amount?: number;
  className?: string;
};

export function Parallax({ children, className }: Props) {
  return <div className={className}>{children}</div>;
}
