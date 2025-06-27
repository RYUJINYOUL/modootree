"use client";

import { useSelector } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import { getAuth, signOut } from 'firebase/auth';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Header() {
  const user = useSelector((state: any) => state.user);
  const router = useRouter();
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  // 로그인 상태가 아니거나 메인 페이지가 아닐 경우 표시하지 않음
  const isMainPage = pathname === '/' || pathname === '/(site)' || pathname === '/(site)/page';
  if (!mounted || !user?.currentUser?.uid || !isMainPage) return null;

  const handleInquiry = () => {
    window.open('http://pf.kakao.com/_pGNPn/chat', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed left-0 top-1/2 -translate-y-1/2 ml-6 z-50">
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-3 bg-white/10 hover:bg-white/20 transition-all duration-200 rounded-full px-4 py-2 backdrop-blur-md"
        >
          <Image
            src="/Image/logo.png"
            alt="모두트리 로고"
            width={24}
            height={24}
            className="rounded-full"
          />
          <span className="text-white/90 text-sm font-medium">
            로그인 중
          </span>
          <svg
            className={`w-4 h-4 text-white/70 transition-transform duration-200 ${
              showDropdown ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute left-0 mt-2 w-48 bg-white/10 backdrop-blur-md rounded-xl shadow-lg py-1 text-sm text-white/90">
            <button
              onClick={handleInquiry}
              className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors duration-200"
            >
              문의 주세요
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 