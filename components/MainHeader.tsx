"use client";

import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { getAuth, signOut } from 'firebase/auth';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from '@/firebase';
import { doc, getDoc, onSnapshot, updateDoc, increment, setDoc, deleteDoc } from 'firebase/firestore';
import { MessageCircle, ChevronDown, X } from 'lucide-react';

export default function MainHeader() {
  const user = useSelector((state: any) => state.user);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showHeader, setShowHeader] = useState(true);

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

  if (!mounted || !showHeader) return null;

  return (
    <header className="fixed top-1/2 -translate-y-1/2 left-4 md:left-6 z-50">
      <div className="relative">
        <div className="flex items-center">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-2 md:space-x-3 bg-white/10 hover:bg-white/20 transition-all duration-200 rounded-full px-3 md:px-4 py-1.5 md:py-2 backdrop-blur-md"
          >
            <Image
              src="/Image/logo.png"
              alt="ModooTree Logo"
              width={120}
              height={120}
              className="w-6 h-6 md:w-8 md:h-8"
            />
            <span className="text-white/90 text-xs md:text-sm font-medium">
              {user?.currentUser?.uid ? '로그인 중' : '로그아웃 중'}
            </span>
            <ChevronDown className={`w-3 h-3 md:w-4 md:h-4 text-white/70 transition-transform duration-200 ${
              showDropdown ? 'rotate-180' : ''
            }`} />
          </button>
          <button
            onClick={() => setShowHeader(false)}
            className="ml-1.5 md:ml-2 p-1.5 md:p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 backdrop-blur-md"
          >
            <X className="w-3 h-3 md:w-4 md:h-4 text-white/70" />
          </button>
        </div>

        {showDropdown && (
          <div className="absolute mt-2 bg-white/10 backdrop-blur-md rounded-xl shadow-lg py-1 text-sm text-white/90 w-48">
            <button
              onClick={() => {
                window.open('http://pf.kakao.com/_pGNPn/chat', '_blank', 'noopener,noreferrer');
                setShowDropdown(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors duration-200 flex items-center justify-between"
            >
              <span>문의하기</span>
              <MessageCircle className="w-4 h-4 text-white/70" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
} 