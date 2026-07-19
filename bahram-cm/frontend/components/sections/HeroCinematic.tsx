import { HeroCinematicClient } from '@/components/sections/HeroCinematicClient';
import { HeroCinematicMedia } from '@/components/sections/HeroCinematicMedia';
import '@/styles/hero-cinematic.css';

/**
 * Homepage hero — LCP images are server-rendered; copy/CTA motion hydrates separately.
 */
export function HeroCinematic() {
  return (
    <section aria-label="معرفی" className="hero-light-section relative isolate pt-3 pb-3 md:pt-8 md:pb-6">
      <div className="container-luxe min-h-0">
        <div className="hero-light-panel hero-light-panel--entrance relative overflow-hidden lg:rounded-card-lg">
          <HeroCinematicClient />
          <HeroCinematicMedia />
        </div>
      </div>
    </section>
  );
}
