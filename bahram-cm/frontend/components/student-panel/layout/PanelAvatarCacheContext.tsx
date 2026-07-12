'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type PanelAvatarCacheContextValue = {
  cacheBuster: number | null;
  bumpAvatarCache: () => void;
};

const PanelAvatarCacheContext = createContext<PanelAvatarCacheContextValue | null>(null);

export function PanelAvatarCacheProvider({ children }: { children: React.ReactNode }) {
  const [cacheBuster, setCacheBuster] = useState<number | null>(null);

  const bumpAvatarCache = useCallback(() => {
    setCacheBuster(Date.now());
  }, []);

  const value = useMemo(
    () => ({
      cacheBuster,
      bumpAvatarCache,
    }),
    [cacheBuster, bumpAvatarCache],
  );

  return <PanelAvatarCacheContext.Provider value={value}>{children}</PanelAvatarCacheContext.Provider>;
}

export function usePanelAvatarCache() {
  return useContext(PanelAvatarCacheContext);
}
