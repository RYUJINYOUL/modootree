'use client';

import * as React from "react";
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { useSelector } from 'react-redux';
import { useState, useEffect, useRef } from 'react';
import { db } from '@/firebase';
import { doc, getDoc, setDoc, updateDoc, DocumentData } from 'firebase/firestore';
import { Dialog } from '@headlessui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function BottomTabs() {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser?.uid) return;
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      } catch (e) {
        console.error('사용자 데이터 로드 중 오류:', e);
      }
    };
    loadUserData();
  }, [currentUser]);

  const handleSaveUsername = async () => {
    if (!username) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    const usernameRef = doc(db, 'usernames', username);
    const existing = await getDoc(usernameRef);
    if (existing.exists()) {
      setError('이미 사용 중인 닉네임입니다.');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        username,
      });

      await setDoc(doc(db, "users", currentUser.uid, "links", "page"), {
        components: [],
        type: null
      });
      
      await setDoc(usernameRef, {
        uid: currentUser.uid,
      });

      setIsOpen(false);
      router.push(`/editor/${username}`);
    } catch (err) {
      setError('저장 중 오류가 발생했습니다.');
    }
  };

  // 에디터 페이지에서는 bottom tabs를 숨김
  if (pathname?.startsWith('/editor/')) {
    return null;
  }

  const menuItems = [
    {
      title: "피드",
      icon: "/logos/feed.png",
      path: "/feed"
    },
    {
      title: "AI 예술",
      icon: "/logos/ai2.png",
      path: "/art-generation"
    },
    {
      title: "AI 건강",
      icon: "/logos/ai1.png",
      path: "/health"
    },
    {
      title: "사진 AI",
      icon: "/logos/ai2.png",
      path: "/photo-story"
    },
    {
      title: "사연 AI",
      icon: "/logos/ai3.png",
      path: "/modoo-ai"
    },
    {
      title: "내 사이트",
      icon: "/logos/m12.png",
      path: userData?.username ? `/${userData.username}` : undefined,
      onClick: () => {
        if (!currentUser?.uid) {
          router.push('/login');
          return;
        }
        if (userData?.username) {
          router.push(`/${userData.username}`);
        } else {
          setIsOpen(true);
        }
      }
    }
  ];

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowLeftArrow(container.scrollLeft > 0);
      setShowRightArrow(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll(); // 초기 상태 체크

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth;
    const targetScroll = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    
    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-gray-900/95 backdrop-blur-lg border-t border-blue-500/20">
          <div className="max-w-[1100px] mx-auto relative">
            {/* 모바일용 스크롤 버튼 */}
            {showLeftArrow && (
              <button
                onClick={() => scrollTo('left')}
                className="md:hidden absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-900/95 to-transparent z-10 flex items-center justify-center text-white/70 hover:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {showRightArrow && (
              <button
                onClick={() => scrollTo('right')}
                className="md:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-900/95 to-transparent z-10 flex items-center justify-center text-white/70 hover:text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* 메뉴 아이템 컨테이너 */}
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto md:overflow-x-visible scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex h-16 min-w-max md:min-w-0 md:justify-center">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={item.onClick || (() => router.push(item.path!))}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 transition-colors px-4 md:px-[80px]",
                      pathname === item.path
                        ? "text-blue-500"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <div className="relative w-6 h-6">
                      <Image
                        src={item.icon}
                        alt={item.title}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span className="text-xs font-medium whitespace-nowrap">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 모달 */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

        <Dialog.Panel className="bg-blue-900/90 p-8 rounded-2xl shadow-lg z-50 max-w-sm w-full relative border border-blue-500/30 backdrop-blur-lg">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 text-blue-200 hover:text-white text-xl transition-colors"
            aria-label="닫기"
          >
            &times;
          </button>

          <h2 className="text-blue-100 text-xl font-bold mb-6 text-center">새 페이지 만들기</h2>
          
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center bg-blue-950/50 rounded-xl shadow-inner p-4 border border-blue-400/20 focus-within:border-blue-400 transition-all w-full">
              <span className="text-blue-200 text-lg mr-1">modootree.com/</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.trim());
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveUsername();
                  }
                }}
                placeholder="ID"
                className="flex-grow text-blue-200 text-lg outline-none bg-transparent placeholder-blue-300/30"
              />
            </div>

            <p className="text-blue-200/80 text-sm">
              ID 입력 후 Enter를 눌러주세요
            </p>
          </div>

          {error && (
            <p className="text-red-300 text-sm mt-4 text-center animate-pulse">
              {error}
            </p>
          )}
        </Dialog.Panel>
      </Dialog>
    </>
  );
}
