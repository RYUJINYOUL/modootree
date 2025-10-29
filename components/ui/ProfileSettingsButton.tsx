'use client';

import { Plus, Settings, Home } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';

export default function ProfileSettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser } = useSelector((state: any) => state.user);

  if (!currentUser) return null;

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
      <div className="relative">
        {/* 서브 버튼들 */}
        <div className={`absolute right-full mr-2 flex gap-1 transition-all duration-200 ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
          <Link
            href="/"
            className="bg-[#2A4D45]/60 backdrop-blur-sm text-white p-2.5 rounded-lg hover:bg-[#2A4D45]/80 transition-all flex items-center justify-center"
            onClick={() => setIsOpen(false)}
            title="모두트리홈"
          >
            <Home className="w-4 h-4" />
          </Link>

          <Link
            href="/profile/background"
            className="bg-[#2A4D45]/60 backdrop-blur-sm text-white p-2.5 rounded-lg hover:bg-[#2A4D45]/80 transition-all flex items-center justify-center"
            onClick={() => setIsOpen(false)}
            title="배경설정"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>

        {/* 메인 토글 버튼 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`bg-[#56ab91]/60 backdrop-blur-sm text-white p-2.5 rounded-l-lg hover:bg-[#56ab91]/80 transition-all ${isOpen ? 'rotate-45' : ''}`}
          title="메뉴 열기"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
