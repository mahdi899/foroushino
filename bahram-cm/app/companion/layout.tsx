import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Academy Companion",
  description: "نمایش سریع دفتر و آرشیو روی وب — فقط برای اعضای آکادمی.",
  path: "/companion",
  noIndex: true,
});

export default function CompanionLayout({ children }: { children: ReactNode }) {
  return children;
}
