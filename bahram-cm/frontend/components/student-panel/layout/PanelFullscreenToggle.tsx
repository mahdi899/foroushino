'use client';

import { useCallback, useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PanelFullscreenToggle() {
  const [browserFullscreen, setBrowserFullscreen] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setStandalone(isStandaloneDisplay());
    setSupported(typeof document !== 'undefined' && document.fullscreenEnabled === true);

    const onFullscreenChange = () => {
      setBrowserFullscreen(document.fullscreenElement?.id === 'panel-root');
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggle = useCallback(async () => {
    const root = document.getElementById('panel-root');
    if (!root || !document.fullscreenEnabled) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await root.requestFullscreen();
      }
    } catch {
      /* user gesture required or unsupported */
    }
  }, []);

  if (standalone || !supported) return null;

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      className="panel-header__icon-btn hidden lg:flex"
      aria-label={browserFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
      title={browserFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
    >
      {browserFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
    </button>
  );
}
