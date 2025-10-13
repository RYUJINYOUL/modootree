'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AiChatBox from '@/components/ui/AiChatBox';
import Footer from '@/components/ui/Footer';
import { BottomTabs } from '@/components/ui/bottom-tabs';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [showMobileChat, setShowMobileChat] = useState(false);
  
  // AI 플로팅 버튼을 숨길 페이지 목록
  const hideAiButton = ['/ai-comfort'];
  
  // 동적 경로 체크 (예: /[username])
  const isDynamicUserPage = pathname.split('/').length === 2 && pathname !== '/' && !hideAiButton.includes(pathname);

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-16">
        {children}
      </main>
      <Footer />
      <BottomTabs />

      {/* 플로팅 채팅 버튼 */}
          {!hideAiButton.includes(pathname) && !isDynamicUserPage && (
        <button
          onClick={() => router.push('/ai-comfort')}
          className="fixed bottom-20 right-4 z-[40] w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all group"
        >
          <span className="text-white font-medium text-base">AI</span>
          <span className="absolute right-full mr-3 px-2 py-1 bg-gray-900/80 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            모두트리 AI와 대화하기
          </span>
        </button>
      )}
    </div>
  );
}