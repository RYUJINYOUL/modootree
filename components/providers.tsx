'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { setUser, clearUser } from '@/store/userSlice';

// Background Context
interface BackgroundContextType {
  background: {
    type: string;
    value: string;
  };
  setBackground: (type: string, value: string) => void;
}

const BackgroundContext = createContext<BackgroundContextType>({
  background: { type: 'none', value: '' },
  setBackground: () => {},
});

export function useBackground() {
  return useContext(BackgroundContext);
}

// Auth Provider Component
function AuthProviderComponent({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Firebase 인증 상태 변경:', user ? '로그인됨' : '로그아웃됨');
      
      if (user) {
        dispatch(setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }));
      } else {
        dispatch(clearUser());
      }
    });

    return () => unsubscribe();
  }, [dispatch, auth]);

  return <>{children}</>;
}

// Combined Provider Component
export function Providers({ children }: { children: React.ReactNode }) {
  const [background, setBackgroundState] = useState({ type: 'none', value: '' });

  const setBackground = (type: string, value: string) => {
    setBackgroundState({ type, value });
  };

  return (
    <BackgroundContext.Provider value={{ background, setBackground }}>
      <AuthProviderComponent>
        {children}
      </AuthProviderComponent>
    </BackgroundContext.Provider>
  );
}

// Export AuthProvider separately if needed
export const AuthProvider = AuthProviderComponent;