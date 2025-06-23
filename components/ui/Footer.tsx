import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const isMainPage = pathname === '/';
  const isAuthPage = pathname === '/login' || pathname === '/register';

  // 메인 페이지나 로그인/회원가입 페이지에서는 푸터를 표시하지 않음
  if (isMainPage || isAuthPage) return null;

  return (
    <footer className="w-full py-8 mt-auto bg-gradient-to-r from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-6">
          {/* 로고 섹션 */}
          <div className="flex items-center gap-2">
            <Image
              src="/Image/logo.png"
              alt="모두트리 로고"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              모두트리
            </span>
          </div>

          {/* CTA 섹션 */}
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2 text-gray-800">
              나만의 특별한 한 페이지를 만들어보세요
            </h3>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/"
                className="inline-block px-6 py-2 rounded-full transition-all duration-300 shadow-md hover:shadow-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600"
              >
                무료시작
              </Link>
              <Link
                href="/farmtoolceo"
                className="inline-block px-6 py-2 rounded-full transition-all duration-300 shadow-md hover:shadow-lg border-2 border-indigo-500 text-indigo-500 hover:bg-indigo-500 hover:text-white"
              >
                문의하기
              </Link>
            </div>
          </div>

          {/* 카피라이트 */}
          <div className="text-sm mt-4 text-gray-500">
            © {new Date().getFullYear()} 모두트리. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
} 