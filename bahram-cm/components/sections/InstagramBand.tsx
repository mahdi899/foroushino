"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/motion/Reveal";
import { PressPresenceMarquee } from "@/components/sections/PressPresenceMarquee";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { sitePhotos } from "@/lib/site-photo-paths";

const tiles: {
  ratio?: "square" | "portrait" | "landscape";
  variant?: "radial" | "grid" | "soft";
  label?: string;
}[] = [
  { ratio: "square", variant: "radial", label: "نشست رسمی" },
  { ratio: "square", variant: "soft", label: "صبح استودیو" },
  { ratio: "square", variant: "grid", label: "جلسه‌ی آکادمی" },
  { ratio: "square", variant: "radial", label: "پشت صحنه" },
  { ratio: "square", variant: "soft", label: "خط برند" },
  { ratio: "square", variant: "grid", label: "گفت‌وگو" },
];

export function InstagramBand() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-obsidian py-section" aria-label="حضور در شبکه‌های اجتماعی">
      <div className="container-luxe">
        <div className="max-w-3xl">
          <Reveal>
            <Eyebrow>برند زنده</Eyebrow>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-4 max-w-3xl text-h2 text-balance">هر هفته، یک پنجره کوتاه.</h2>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="mt-5 max-w-xl text-bone-dim">پشت صحنه، نشست‌ها و تحلیل‌ها در یک جریان.</p>
          </Reveal>
        </div>

        <PressPresenceMarquee className="mt-8 md:mt-10" />

        {/* موبایل / تبلت باریک: اسلایدر افقی */}
        <div
          className="mt-8 flex w-full min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-visible pb-2 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden"
          dir="rtl"
          aria-label="پیش‌نمایش پست‌های اینستاگرام"
        >
          {tiles.map((t, i) => (
            <div
              key={`slide-${i}`}
              className="w-[min(78vw,17.5rem)] shrink-0 snap-start last:me-4"
            >
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-5% 0px" }}
                transition={{
                  duration: 0.55,
                  ease: [0.16, 1, 0.3, 1],
                  delay: i * 0.04,
                }}
              >
                <PhotoFrame
                  ratio={t.ratio ?? "square"}
                  variant={t.variant ?? "radial"}
                  rounded="card"
                  label={t.label}
                  showIcon={false}
                  src={sitePhotos.social[i]}
                  alt={t.label ?? "محتوای اینستاگرام"}
                />
              </motion.div>
            </div>
          ))}
        </div>

        {/* دسکتاپ و تبلت عریض: گرید */}
        <div className="mt-8 hidden grid-cols-2 gap-2.5 sm:grid sm:grid-cols-3 sm:gap-3 md:mt-12 lg:mt-14 lg:grid-cols-6">
          {tiles.map((t, i) => (
            <motion.div
              key={i}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
                delay: i * 0.06,
              }}
            >
              <PhotoFrame
                ratio={t.ratio ?? "square"}
                variant={t.variant ?? "radial"}
                rounded="card"
                label={t.label}
                showIcon={false}
                src={sitePhotos.social[i]}
                alt={t.label ?? "محتوای اینستاگرام"}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
