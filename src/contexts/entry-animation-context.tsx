'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface EntryAnimationData {
  entryId: string;
  date: Date;
}

interface EntryAnimationContextType {
  animationData: EntryAnimationData | null;
  setAnimationData: (data: EntryAnimationData | null) => void;
}

const EntryAnimationContext = createContext<EntryAnimationContextType | undefined>(undefined);

export function EntryAnimationProvider({ children }: { children: ReactNode }) {
  const [animationData, setAnimationData] = useState<EntryAnimationData | null>(null);

  return (
    <EntryAnimationContext.Provider value={{ animationData, setAnimationData }}>
      {children}
    </EntryAnimationContext.Provider>
  );
}

export function useEntryAnimation() {
  const context = useContext(EntryAnimationContext);
  if (context === undefined) {
    throw new Error('useEntryAnimation must be used within an EntryAnimationProvider');
  }
  return context;
}