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
    <nav className="bg-white/20 shadow-lg border-b border-white/30 backdrop-blur-md">
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
            <SheetContent side="left" className="w-[300px] bg-gradient-to-b from-pink-300/90 to-rose-300/90 border-r border-pink-200/50 backdrop-blur-md overflow-y-auto flex flex-col h-full [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-pink-400 [&::-webkit-scrollbar-track]:bg-pink-900/10">
              <SheetHeader className="pb-4 border-b border-pink-200/30 flex-shrink-0">
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
               

                {[
                  {
                    title: "AI 투표",
                    description: "AI가 만들어 주는 사연 · 사진 · 뉴스 투표",
                    icon: "/logos/news.png",
                    path: "/modoo-vote"
                  },
                  {
                    title: "링크 편지",
                    description: "퀴즈를 풀어야만 읽을 수 있는 링크 편지",
                    icon: "/logos/m12.png",
                    path: "/pros-menu"
                  },
                  // {
                  //   title: "AI 건강 기록",
                  //   description: "당신의 건강한 하루를 AI가 분석해 드립니다",
                  //   icon: "/logos/ai1.png",
                  //   path: "/health"
                  // },

                  {
                    title: "내 기록 페이지",
                    description: "OCR스캔 · 메모 · 링크 자동 분류 내 기록 페이지",
                    icon: "/logos/m1.png",
                    path: "/profile"
                  },
                  
                 
                  {
                    title: "열린 게시판",
                    description: "모두트리의 열린 게시판과 1:1 채팅 문의",
                    icon: "/logos/ai4.png",
                    path: "/inquiry"
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

              <div className="mt-8">
                <h3 className="text-white/80 text-md font-semibold mb-3 text-center">모두트리 SNS</h3>
                <div className="flex justify-center gap-3">
                  <a 
                    href="https://www.youtube.com/@%EB%AA%A8%EB%91%90%ED%8A%B8%EB%A6%AC"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:opacity-80 transition-opacity"
                    aria-label="YouTube"
                  >
                    <Image
                      src="/Image/sns/youtube.png"
                      alt="YouTube"
                      width={40}
                      height={40}
                    />
                  </a>

                  <a 
                    href="https://www.instagram.com/modootree"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:opacity-80 transition-opacity"
                    aria-label="Instagram"
                  >
                    <Image
                      src="/Image/sns/instagram.png"
                      alt="Instagram"
                      width={40}
                      height={40}
                    />
                  </a>

                  <a 
                    href="https://www.tiktok.com/@modootree"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:opacity-80 transition-opacity"
                    aria-label="TikTok"
                  >
                    <Image
                      src="/Image/sns/tiktok.png"
                      alt="TikTok"
                      width={40}
                      height={40}
                    />
                  </a>
                </div>
              </div>
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
            <Link href="/profile" className="flex items-center gap-2 text-sm text-white font-bold hover:text-gray-200 transition-colors">
              <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-100">
                {currentUser.displayName?.[0]?.toUpperCase() || currentUser.email?.[0]?.toUpperCase()}
              </div>
              <span className="font-bold">{currentUser.displayName || currentUser.email}</span>
            </Link>
          )}
          {currentUser?.uid ? (
            <button
              onClick={handleLogout}
              className="text-sm text-white font-bold hover:text-gray-200 transition-colors"
            >
              로그아웃
            </button>
          ) : (
            <Link
              href="/login"
              className="text-sm text-white font-bold hover:text-gray-200 transition-colors"
            >
              로그인
            </Link>
          )}
          {!currentUser?.uid && (
            <Link
              href="/register"
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors font-bold"
            >
              회원가입
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
