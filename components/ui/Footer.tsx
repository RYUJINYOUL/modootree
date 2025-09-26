'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  
  // 로그인, 회원가입 페이지, username 페이지에서는 푸터를 숨김
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isUserPage = /^\/[^/]+$/.test(pathname) && pathname !== '/inquiry'; // /username 형식의 경로 체크, inquiry 페이지 제외
  const isLikesPage = pathname === '/likes/all'; // /likes/all 페이지 체크
  const isMainPage = pathname === '/'; // 메인 페이지 체크
  const isModooAiTestPage = pathname.startsWith('/modoo-ai/tests/'); // 모두AI 테스트 페이지 체크

  if (isAuthPage || isUserPage || isLikesPage || isMainPage || isModooAiTestPage) {
    return null;
  }

  return (
    <footer className="w-full py-6 bg-black/80">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4">
          {/* 로고 섹션 */}
          <div className="flex items-center gap-2">
            <Image
              src="/Image/logo.png"
              alt="모두트리 로고"
              width={120}
              height={120}
              className="w-8 h-8"
            />
            <span className="text-lg font-bold text-white/90">
              모두트리
            </span>
          </div>

          {/* CTA 섹션 */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-block px-4 py-1.5 rounded-full transition-all duration-300 bg-black/50 hover:bg-black/70 text-white/90 text-sm"
                prefetch={false}
              >
                무료시작
              </Link>
              <Link
                href="/inquiry"
                className="inline-block px-4 py-1.5 rounded-full transition-all duration-300 border border-white/20 hover:border-white/40 text-white/90 hover:bg-black/50 text-sm"
                prefetch={false}
              >
                문의하기
              </Link>
            </div>
          </div>

          {/* 회사 정보 */}
          <div className="flex flex-col items-center text-xs text-white/50 space-y-1">
            <div>모두트리 1899-1651 farmtoolceo@naver.com</div>
            <div>주식회사 팜툴 303-81-76392 유진열</div>
            <div>© {new Date().getFullYear()} 모두트리</div>
          </div>
        </div>
      </div>
    </footer>
  );
} 