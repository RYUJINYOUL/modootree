import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function KakaoLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!searchParams) return; // null 체크 추가

    const code = searchParams.get('code');
    
    if (code) {
      fetch('/api/auth/kakao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          router.push('/');
        } else {
          console.error('카카오 로그인 실패:', data.error);
          alert('로그인에 실패했습니다. 다시 시도해주세요.');
          router.push('/login');
        }
      })
      .catch((error) => {
        console.error('카카오 로그인 에러:', error);
        alert('로그인 처리 중 오류가 발생했습니다.');
        router.push('/login');
      })
      .finally(() => {
        setIsLoading(false);
      });
    }
  }, [searchParams, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold text-white mb-2">카카오 로그인 처리 중...</h2>
        <p className="text-gray-400">잠시만 기다려주세요.</p>
      </div>
    );
  }

  return null;
} 