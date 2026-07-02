import {
  Headphones,
  Instagram,
  Newspaper,
  Radio,
  Send,
  Youtube,
} from "lucide-react";
import { Marquee } from "@/components/motion/Marquee";
import { cn } from "@/lib/cn";
import {
  PressPresenceChannelChip,
  type PressChannel,
} from "@/components/sections/PressPresenceChannelChip";

const presence: PressChannel[] = [
  { icon: Instagram, label: "اینستاگرام", note: "حضور پایدار", tint: "jade" },
  { icon: Youtube, label: "یوتیوب", note: "محتوای عمیق", tint: "gold" },
  { icon: Send, label: "تلگرام", note: "کانال روزانه", tint: "jade" },
  { icon: Headphones, label: "پادکست", note: "گفتگوهای حرفه‌ای", tint: "gold" },
  { icon: Newspaper, label: "نشریه‌ها", note: "ارجاع مرجع", tint: "jade" },
  { icon: Radio, label: "نشست‌های زنده", note: "تعامل واقعی", tint: "gold" },
];

export function PressPresenceMarquee({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative pt-1",
        "[-webkit-mask-image:linear-gradient(90deg,transparent,black_4%,black_96%,transparent)]",
        "[mask-image:linear-gradient(90deg,transparent,black_4%,black_96%,transparent)]",
        className,
      )}
    >
      <Marquee speed={54} className="py-0.5">
        {presence.map((p) => (
          <PressPresenceChannelChip key={p.label} item={p} />
        ))}
      </Marquee>
    </div>
  );
}
