'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BottomTabs } from '@/components/ui/bottom-tabs';
import { FilePen, Edit3 } from 'lucide-react';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showWriteMenu, setShowWriteMenu] = useState(false); // 플로팅 글쓰기 메뉴 상태 추가
  
  // AI 플로팅 버튼을 숨길 페이지 목록
  const hideAiButton = ['/ai-comfort', '/', '/anonymous-chat', '/login', '/register' ];

  // AI 플로팅 버튼을 숨길 페이지 목록 (동적 경로 포함)
  const shouldHideAiButton = hideAiButton.includes(pathname) ||
    pathname.startsWith('/admin-request/') ||
    pathname.startsWith('/link-letter/') ||
    pathname.startsWith('/news-vote') ||
    pathname.startsWith('/modoo-vote') ||
    pathname.startsWith('/photo-story');

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

      {/* 플로팅 글쓰기 버튼 */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* 카테고리 메뉴 */}
        {showWriteMenu && (
          <div className="absolute bottom-16 right-0 bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-3 min-w-48">
            <button
              onClick={() => {
                router.push('/photo-story');
                setShowWriteMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors text-white text-left"
            >
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <FilePen className="w-4 h-4 text-white" />
              </div>
              <span>사진 투표</span>
            </button>
            
            <button
              onClick={() => {
                router.push('/modoo-vote');
                setShowWriteMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg transition-colors text-white text-left"
            >
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <FilePen className="w-4 h-4 text-white" />
              </div>
              <span>사연 투표</span>
            </button>

            <button
              onClick={() => {
                router.push('/pros-menu');
                setShowWriteMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors text-white text-left"
            >
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <FilePen className="w-4 h-4 text-white" />
              </div>
              <span>퀴즈 편지</span>
            </button>

            <button
              onClick={() => {
                router.push('/news-vote');
                setShowWriteMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors text-white text-left"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <FilePen className="w-4 h-4 text-white" />
              </div>
              <span>뉴스 투표</span>
            </button>

            <button
              onClick={() => {
                router.push('/inquiry');
                setShowWriteMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-500/20 hover:bg-gray-500/30 rounded-lg transition-colors text-white text-left"
            >
              <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                <FilePen className="w-4 h-4 text-white" />
              </div>
              <span>불편 신고</span>
            </button>
            
          </div>
        )}
        
        {/* 메인 글쓰기 버튼 */}
        <button
          onClick={() => setShowWriteMenu(!showWriteMenu)}
          className={`w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300 ${
            showWriteMenu ? 'rotate-45' : 'hover:scale-110'
          }`}
        >
          <Edit3 className="w-6 h-6" />
        </button>
      </div>

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