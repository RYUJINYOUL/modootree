'use client';

import { useState, useEffect } from 'react';
import RefreshDialog from './RefreshDialog';

interface ProfileRefreshWrapperProps {
  children: React.ReactNode;
}

export default function ProfileRefreshWrapper({ children }: ProfileRefreshWrapperProps) {
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // PWA 환경 감지
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      const isInWebAppChrome = window.matchMedia('(display-mode: standalone)').matches;
      
      return isStandalone || isInWebAppiOS || isInWebAppChrome;
    };

    setIsPWA(checkPWA());

    // 스토리지 키를 PWA 환경에 따라 다르게 설정
    const storageKey = checkPWA() ? 'profile-refreshed-pwa' : 'profile-refreshed';
    
    // 이미 새로고침을 했는지 확인 (localStorage와 sessionStorage 둘 다 확인)
    const hasRefreshedSession = sessionStorage.getItem(storageKey);
    
    console.log('🔍 PWA 환경:', checkPWA());
    console.log('🔍 새로고침 상태 확인:', { hasRefreshedSession });
    
    if (!hasRefreshedSession) {
      // 프로필 페이지 방문 시 다이얼로그 표시
      const timer = setTimeout(() => {
        console.log('📱 새로고침 다이얼로그 표시');
        setShowRefreshDialog(true);
      }, 800); // PWA에서는 조금 더 늦게 표시

      return () => clearTimeout(timer);
    } else {
      console.log('✅ 이미 새로고침 완료됨');
    }
  }, []);

  const handleRefresh = () => {
    const storageKey = isPWA ? 'profile-refreshed-pwa' : 'profile-refreshed';
    
    console.log('🔄 새로고침 실행, PWA:', isPWA);
    
    // 새로고침 했다는 표시를 두 곳 모두에 저장 (PWA 환경에서 더 안정적)
    try {
      sessionStorage.setItem(storageKey, 'true');
    } catch (error) {
      console.error('스토리지 저장 실패:', error);
    }
    
    // 페이지 새로고침
    window.location.reload();
  };

  return (
    <>
      {children}
      <RefreshDialog 
        isOpen={showRefreshDialog} 
        onConfirm={handleRefresh}
      />
    </>
  );
}
