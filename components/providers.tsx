'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { storage } from '@/firebase';
import { ref, getDownloadURL } from 'firebase/storage';

interface BackgroundState {
  type: string;
  value: string;
}

interface BackgroundContextType {
  background: BackgroundState;
  setBackground: (type: string, value: string) => void;
}

const DEFAULT_BACKGROUND = {
  type: 'video',
  value: 'https://cdn.pixabay.com/video/2024/03/18/204565-924698132_large.mp4'
};

const BackgroundContext = createContext<BackgroundContextType>({
  background: DEFAULT_BACKGROUND,
  setBackground: () => {},
});

export const useBackground = () => useContext(BackgroundContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [background, setBackgroundState] = useState<BackgroundState>(DEFAULT_BACKGROUND);

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