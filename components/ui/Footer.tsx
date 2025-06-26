'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  
  // 메인페이지, 로그인, 회원가입 페이지에서는 푸터를 숨김
  const isMainPage = pathname === '/';
  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (isMainPage || isAuthPage) {
    return null;
  }

  console.log('Footer shown');

  return (
    <footer className="w-full py-6 mt-auto bg-black/40 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4">
          {/* 로고 섹션 */}
          <div className="flex items-center gap-2">
            <Image
              src="/Image/logo.png"
              alt="모두트리 로고"
              width={30}
              height={30}
              className="rounded-lg"
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
                className="inline-block px-4 py-1.5 rounded-full transition-all duration-300 bg-white/10 hover:bg-white/20 text-white/90 text-sm">
                무료시작
              </Link>
              <Link
                href="/farmtoolceo"
                className="inline-block px-4 py-1.5 rounded-full transition-all duration-300 border border-white/20 hover:border-white/40 text-white/90 hover:bg-white/10 text-sm"
              >
                문의하기
              </Link>
            </div>
          </div>

          {/* 카피라이트 */}
          <div className="text-xs text-white/60">

            © {new Date().getFullYear()} 모두트리

          </div>
        </div>
      </div>
    </footer>
  );
} 