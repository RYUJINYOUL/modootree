'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { BottomTabs } from '@/components/ui/bottom-tabs';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showMobileChat, setShowMobileChat] = useState(false);
  
  // AI 플로팅 버튼을 숨길 페이지 목록
  const hideAiButton = ['/ai-comfort', '/', '/anonymous-chat'];

  // AI 플로팅 버튼을 숨길 페이지 목록 (동적 경로 포함)
  const shouldHideAiButton = hideAiButton.includes(pathname) ||
    pathname.startsWith('/admin-request/') ||
    pathname.startsWith('/link-letter/');

  // 하단 탭을 숨길 페이지 목록 추가
  const hideBottomTabs = ['/ai-chat-simple', '/ai-comfort', '/', '/anonymous-chat']; // ai-comfort와 메인 페이지도 추가
  
  // 동적 경로 체크 (예: /[username])
  const pathParts = pathname.split('/').filter(Boolean);
  const isDynamicUserPage = pathParts.length === 1 && 
    !hideAiButton.includes(pathname) && 
    !['feed', 'login', 'register', 'settings', 'admin', 'news-vote', 'modoo-vote'].includes(pathParts[0]);

  const shouldHideBottomTabs = hideBottomTabs.includes(pathname);

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
      {!shouldHideBottomTabs && <BottomTabs />}

      {/* 플로팅 채팅 버튼 */}
      {!shouldHideAiButton && !isDynamicUserPage && !pathname.startsWith('/profile') && (
        <Link
          href="/ai-comfort"
          className="fixed bottom-[80px] right-4 z-[40] w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all group"
        >
          <span className="text-white font-medium text-base">AI</span>
        </Link>
      )}
    </div>
  );
}