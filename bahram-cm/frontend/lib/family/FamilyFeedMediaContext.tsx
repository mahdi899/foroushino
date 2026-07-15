'use client';

import { createContext, useContext, type ReactNode } from 'react';

type FamilyFeedMediaContextValue = {
  /** True when the feed has not scrolled recently. */
  scrollIdle: boolean;
};

const FamilyFeedMediaContext = createContext<FamilyFeedMediaContextValue>({
  scrollIdle: true,
});

export function FamilyFeedMediaProvider({
  scrollIdle,
  children,
}: {
  scrollIdle: boolean;
  children: ReactNode;
}) {
  return (
    <FamilyFeedMediaContext.Provider value={{ scrollIdle }}>
      {children}
    </FamilyFeedMediaContext.Provider>
  );
}

export function useFamilyFeedMedia() {
  return useContext(FamilyFeedMediaContext);
}
