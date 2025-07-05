'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface TranslateContextType {
  isTranslateVisible: boolean;
  setTranslateVisible: (visible: boolean) => void;
  isTranslateInitialized: boolean;
  setTranslateInitialized: (initialized: boolean) => void;
}

const TranslateContext = createContext<TranslateContextType | undefined>(undefined);

export function TranslateProvider({ children }: { children: React.ReactNode }) {
  const [isTranslateVisible, setTranslateVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('translateVisible');
      return stored === null || stored === 'true';
    }
    return true;
  });
  const [isTranslateInitialized, setTranslateInitialized] = useState(false);

  useEffect(() => {
    if (!isTranslateVisible) {
      localStorage.setItem('translateVisible', 'false');
    } else {
      localStorage.setItem('translateVisible', 'true');
    }
  }, [isTranslateVisible]);

  return (
    <TranslateContext.Provider
      value={{
        isTranslateVisible,
        setTranslateVisible,
        isTranslateInitialized,
        setTranslateInitialized
      }}
    >
      {children}
    </TranslateContext.Provider>
  );
}

export function useTranslate() {
  const context = useContext(TranslateContext);
  if (context === undefined) {
    throw new Error('useTranslate must be used within a TranslateProvider');
  }
  return context;
} 