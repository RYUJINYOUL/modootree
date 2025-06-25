'use client';

import React, { createContext, useContext, useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { Provider } from 'react-redux';
import { store } from '@/store';

interface BackgroundState {
  type: string;
  value: string;
}

interface BackgroundContextType {
  background: BackgroundState;
  setBackground: (type: string, value: string) => void;
}

const BackgroundContext = createContext<BackgroundContextType>({
  background: { type: 'color', value: '#ffffff' },
  setBackground: () => {},
});

export const useBackground = () => useContext(BackgroundContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [background, setBackgroundState] = useState<BackgroundState>({
    type: 'color',
    value: '#ffffff',
  });

  const setBackground = (type: string, value: string) => {
    setBackgroundState({ type, value });
  };

  return (
    <Provider store={store}>
      <BackgroundContext.Provider value={{ background, setBackground }}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </BackgroundContext.Provider>
    </Provider>
  );
} 