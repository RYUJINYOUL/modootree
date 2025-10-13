'use client';

import { useSelector, useDispatch } from 'react-redux';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebase';
import { clearUser, setUser } from '../../store/userSlice';
import { Menu } from 'lucide-react';
import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function LoginOutButton() {
  const [hasMounted, setHasMounted] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();
  const auth = getAuth();
  const currentUser = useSelector((state) => state.user.currentUser);

  useEffect(() => {
    setHasMounted(true);
    // Firebase 인증 상태 변경 리스너 추가
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 사용자가 로그인한 경우
        dispatch(setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }));
      } else {
        // 사용자가 로그아웃한 경우
        dispatch(clearUser());
      }
    });

    // 컴포넌트 언마운트 시 리스너 제거
    return () => unsubscribe();
  }, [dispatch, auth]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      dispatch(clearUser());
      router.push('/');
    } catch (error) {
      console.error('로그아웃 에러:', error);
    }
  };

  if (!hasMounted) return null;

  return (
    <nav className="bg-zinc-900 shadow-lg border-b border-zinc-800">
      <div className="md:w-[1100px] container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <button className="text-white/80 hover:text-white relative group">
                <Menu className="w-6 h-6" />
                <div className="absolute -right-1 -top-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse group-hover:animate-none"></div>
                  <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping"></div>
                </div>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] bg-zinc-900 border-r border-zinc-800 overflow-y-auto flex flex-col h-full">
              <SheetHeader className="pb-4 border-b border-white/10 flex-shrink-0">
                <div className="flex flex-col items-center text-center">
                  <Image
                    src="/Image/logo.png"
                    alt="모두트리 로고"
                    width={80}
                    height={80}
                    className="mb-3"
                  />
                  <SheetTitle className="text-2xl font-bold text-white mb-1">모두트리</SheetTitle>
                  <p className="text-white/70 text-sm">우주 안의 나, 모두트리의 너</p>
                </div>
              </SheetHeader>
              <nav className="flex-1 mt-2 space-y-3 overflow-y-auto py-2">
                {/* 공지사항 */}
                <div className="mx-4 py-3 px-4 bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-lg text-center">
                  <p className="text-white/90 text-sm">10월 15일 정식 오픈 예정</p>
                  <p className="text-white/70 text-xs mt-0.5">일부 오류가 있을 수 있습니다.</p>
                </div>

                {[
                  {
                    title: "모두트리 AI",
                    description: "AI와 함께 이야기하며 공감과 위로를 나눠요",
                    icon: "/logos/m1.png",
                    path: "/ai-comfort"
                  },
                  {
                    title: "AI 예술 작품",
                    description: "사진을 예술 작품으로 변화되는 즐거움을 선물합니다",
                    icon: "/logos/ai5.png",
                    path: "/art-generation"
                  },
                  {
                    title: "AI 건강 기록",
                    description: "당신의 건강한 하루를 AI가 분석해 드립니다",
                    icon: "/logos/ai1.png",
                    path: "/health"
                  },
                  {
                    title: "AI 사진 투표",
                    description: "AI가 만들어 주는 사진 투표 당신의 선택은?",
                    icon: "/logos/ai2.png",
                    path: "/photo-story"
                  },
                  {
                    title: "AI 사연 투표",
                    description: "AI가 만들어 주는 사연 투표 당신의 선택은?",
                    icon: "/logos/ai3.png",
                    path: "/modoo-ai"
                  },
                  {
                    title: "공감 한 조각",
                    description: "기쁨 슬픔 등의 내 감정 기록 은근 공감 받는 공유 익명 일기",
                    icon: "/logos/ai6.png",
                    path: "/likes/all"
                  }
                ].map((item) => (
                  <Link 
                    key={item.path}
                    href={item.path}
                    className="flex items-center gap-4 px-4 py-3 text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/10 p-2 shadow-sm backdrop-blur-sm">
                      <Image
                        src={item.icon}
                        alt={item.title}
                        width={24}
                        height={24}
                        className="w-full h-full object-contain"
                      />
                    </div>
                     <div className="flex flex-col">
                       <span className="text-sm text-white/80 group-hover:text-white leading-snug">{item.description}</span>
                     </div>
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <Link 
            href="/" 
            className="text-xl font-bold text-white hover:text-zinc-200 transition-colors"
          >
            모두트리
          </Link>
        </div>
        <div className="flex gap-4 items-center">
          {currentUser?.uid && (
            <span className="text-sm text-blue-300 font-semibold">
              {currentUser.displayName || currentUser.email}
            </span>
          )}
          {currentUser?.uid ? (
            <button
              onClick={handleLogout}
              className="text-sm text-zinc-300 hover:text-white transition-colors"
            >
              로그아웃
            </button>
          ) : (
            <Link
              href="/login"
              className="text-sm text-zinc-300 hover:text-white transition-colors"
            >
              로그인
            </Link>
          )}
          {!currentUser?.uid && (
            <Link
              href="/register"
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors font-medium"
            >
              회원가입
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
