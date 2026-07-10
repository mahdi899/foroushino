import { GraduationCap, Star, TrendingUp, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/cn";

type Stat = { icon: LucideIcon; value: string; label: string };

const DEFAULT_STATS: Stat[] = [
  { icon: Users, value: "۵۰٬۰۰۰+", label: "دانشجو در بازار فارسی" },
  { icon: GraduationCap, value: "۱۰+", label: "سال تجربه آموزش" },
  { icon: TrendingUp, value: "۳٫۸×", label: "میانگین رشد درآمد" },
  { icon: Star, value: "۴٫۹/۵", label: "رضایت از مسیرها" },
];

export function SocialProofStats({
  stats = DEFAULT_STATS,
  className,
  as: Tag = "section",
}: {
  stats?: Stat[];
  className?: string;
  as?: "section" | "div";
}) {
  return (
    <Tag className={cn("courses-stats-strip", className)}>
      <div className="container-luxe">
        <div className="courses-stats-strip__panel">
          <div className="courses-stats-strip__grid">
            {stats.map((stat, i) => (
              <Reveal
                key={stat.label}
                delay={i * 0.05}
                className="courses-stats-strip__item"
              >
                <span className="courses-stats-strip__icon" aria-hidden>
                  <stat.icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.55} />
                </span>
                <p className="courses-stats-strip__value num-latin">{stat.value}</p>
                <p className="courses-stats-strip__label">{stat.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </Tag>
  );
}
