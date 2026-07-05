import { GraduationCap, Star, TrendingUp, Users } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

type Stat = { icon: typeof Users; value: string; label: string };

const DEFAULT_STATS: Stat[] = [
  { icon: Users, value: "۵۰٬۰۰۰+", label: "دانشجو در بازار فارسی" },
  { icon: GraduationCap, value: "۱۰+", label: "سال تجربه‌ی آموزش" },
  { icon: TrendingUp, value: "۳٫۸×", label: "میانگین رشد درآمد دانشجوها" },
  { icon: Star, value: "۴٫۹/۵", label: "رضایت از مسیرها" },
];

/**
 * Compact, server-rendered social-proof strip. Reused across conversion pages
 * (courses, apply) to surface trust signals near the decision point.
 */
export function SocialProofStats({
  stats = DEFAULT_STATS,
  className,
}: {
  stats?: Stat[];
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="container-luxe">
        <div className="grid gap-4 rounded-card border border-bone/10 bg-charcoal/40 p-6 sm:grid-cols-2 md:p-8 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06}>
              <div className="flex flex-col items-center text-center">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-gold/25 bg-gold/[0.06] text-gold">
                  <s.icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                </span>
                <p className="mt-4 font-display text-h2 leading-none text-bone num-latin">
                  {s.value}
                </p>
                <p className="mt-2 text-caption text-mist">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
