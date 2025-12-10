'use client';

import * as React from "react";
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function BottomTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const [isUserSite, setIsUserSite] = useState(false);


  // 특정 페이지에서는 bottom tabs를 숨김
  const hiddenPaths = ['/editor/', '/ai-comfort', '/profile', '/link-letter/', '/search', '/anonymous-chat', '/admin-request', '/link-letter', '/login', '/register'];
  const exactHiddenPaths = ['/ai-chat-simple', '/', '/search', '/pros-menu', '/anonymous-chat', '/admin-request', '/link-letter', '/login', '/register'];

  // 현재 경로가 유저 사이트인지 확인
  useEffect(() => {
    const checkIfUserSite = async () => {
      if (!pathname) return;
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length === 1) {
        const username = segments[0];
        const usernameRef = doc(db, 'usernames', username);
        const usernameDoc = await getDoc(usernameRef);
        setIsUserSite(usernameDoc.exists());
      } else {
        setIsUserSite(false);
      }
    };
    checkIfUserSite();
  }, [pathname]);

  const shouldHide = pathname === '/' || hiddenPaths.some(path => pathname?.startsWith(path)) || isUserSite || exactHiddenPaths.includes(pathname || '');

  const menuItems = [
    {
      title: "홈",
      icon: "/logos/feed.png",
      path: "/"
    },
    
    {
      title: "투표 AI",
      icon: "/logos/news.png",
      path: "/modoo-vote"
    },
    {
      title: "내 페이지",
      icon: "/logos/m1.png",
      path: "/profile"
    }
  ];

  if (shouldHide) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-gray-900/95 backdrop-blur-lg border-t border-blue-500/20">
          <div className="max-w-md md:max-w-[1300px] mx-auto">
            <div className="flex h-16">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => router.push(item.path)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 transition-colors flex-1",
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

    </>
  );
}