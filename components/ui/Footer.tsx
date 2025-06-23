import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Footer() {
  const pathname = usePathname();
  const isMainPage = pathname === '/';
  const [isKakao, setIsKakao] = useState(false);

  useEffect(() => {
    // 카카오톡 인앱 브라우저 감지
    const userAgent = navigator.userAgent.toLowerCase();
    setIsKakao(userAgent.includes('kakaotalk'));
  }, []);

  const handleShare = async () => {
    const currentUrl = window.location.href;

    if (isKakao) {
      // 카카오톡 인앱 브라우저에서는 새 탭으로 열기 유도
      window.open(currentUrl, '_blank');
      alert('기본 브라우저에서 공유 기능을 사용해주세요.');
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: '모두트리',
          url: currentUrl
        });
      } catch (error) {
        console.error('공유 실패:', error);
        handleCopyLink(); // 공유 API를 지원하지 않는 경우 링크 복사로 대체
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl);
    alert('링크가 복사되었습니다.');
  };

  return (
    <>
      {isMainPage && <div className="w-full h-px bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-800" />}
      <footer className={`w-full py-8 mt-auto ${
        isMainPage 
        ? 'bg-zinc-900/50 backdrop-blur-sm' 
        : 'bg-gradient-to-r from-blue-50 to-indigo-50'
      }`}>
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
              <span className={`text-xl font-bold ${
                isMainPage 
                ? 'text-white' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'
              }`}>
                모두트리
              </span>
            </div>

            {/* CTA 섹션 */}
            <div className="text-center">
              <h3 className={`text-lg font-semibold mb-2 ${
                isMainPage ? 'text-white' : 'text-gray-800'
              }`}>
                나만의 특별한 한 페이지를 만들어보세요
              </h3>
              <div className="flex items-center justify-center gap-4">
                {!isMainPage && (
                  <Link
                    href="/"
                    className="inline-block px-6 py-2 rounded-full transition-all duration-300 shadow-md hover:shadow-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600"
                  >
                    무료시작
                  </Link>
                )}
                <button
                  onClick={handleShare}
                  className={`inline-block px-6 py-2 rounded-full transition-all duration-300 shadow-md hover:shadow-lg border-2 ${
                    isMainPage
                    ? 'border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-500'
                    : 'border-indigo-500 text-indigo-500 hover:bg-indigo-500 hover:text-white'
                  }`}
                >
                  {isKakao ? '브라우저에서 열기' : '공유하기'}
                </button>
              </div>
            </div>

            {/* 카피라이트 */}
            <div className={`text-sm mt-4 ${
              isMainPage ? 'text-zinc-500' : 'text-gray-500'
            }`}>
              © {new Date().getFullYear()} 모두트리. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </>
  );
} 