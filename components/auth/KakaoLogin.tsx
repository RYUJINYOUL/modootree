import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function KakaoLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const code = searchParams.get('code');
    
    if (code) {
      // 카카오 인증 코드를 받았을 때의 처리
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
          router.push('/'); // 로그인 성공 시 메인 페이지로 이동
        } else {
          console.error('카카오 로그인 실패:', data.error);
        }
      })
      .catch((error) => {
        console.error('카카오 로그인 에러:', error);
      });
    }
  }, [searchParams, router]);

  return null;
} 