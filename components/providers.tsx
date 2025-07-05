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
  type: 'image',
  value: '/defaults/backgrounds/default-background.jpg'  // 신규 가입자용 기본 이미지 경로
};

const BackgroundContext = createContext<BackgroundContextType>({
  background: DEFAULT_BACKGROUND,
  setBackground: () => {},
});

export const useBackground = () => useContext(BackgroundContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [background, setBackgroundState] = useState<BackgroundState>(DEFAULT_BACKGROUND);

  useEffect(() => {
    // 기본 이미지 URL 가져오기
    const loadDefaultBackground = async () => {
      try {
        const defaultImageRef = ref(storage, DEFAULT_BACKGROUND.value);
        const url = await getDownloadURL(defaultImageRef);
        setBackgroundState({
          type: 'image',
          value: url
        });
      } catch (error) {
        console.error('기본 배경 이미지 로드 실패:', error);
        // 이미지 로드 실패시 기본 색상으로 fallback
        setBackgroundState({
          type: 'color',
          value: '#f5f5f5'
        });
      }
    };

    loadDefaultBackground();
  }, []);

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