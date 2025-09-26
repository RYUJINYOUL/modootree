import React, { useState } from 'react';

interface KakaoAuthButtonProps {
  returnToMain?: boolean;  // true면 메인 페이지로 이동, false면 현재 페이지에 머무름
}

const KakaoAuthButton = ({ returnToMain = true }: KakaoAuthButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
    // Vercel 도메인을 실제 도메인으로 변경
    let redirectUri = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI;
    if (redirectUri?.includes('modootree.vercel.app')) {
      redirectUri = redirectUri.replace('modootree.vercel.app', 'www.modootree.com');
    }
    
    if (!clientId || !redirectUri) {
      console.error('카카오 로그인 설정이 없습니다.', { clientId, redirectUri });
      alert('카카오 로그인 설정에 문제가 있습니다.');
      return;
    }

    const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
    // 현재 URL을 state로 저장
    // 현재 호스트 기반으로 리다이렉트 URL 설정
    const returnUrl = returnToMain ? (window.location.origin + '/login') : window.location.href;
    const kakaoAuthUrlWithState = `${KAKAO_AUTH_URL}&state=${encodeURIComponent(returnUrl)}`;
    window.location.href = kakaoAuthUrlWithState;
  };

  // ... rest of the component


  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className={`w-full flex items-center justify-center gap-2 py-3 mb-6 rounded-xl ${
        isLoading ? 'bg-[#FEE500]/70 cursor-not-allowed' : 'bg-[#FEE500] hover:bg-[#FEE500]/90'
      } text-[#000000] font-semibold shadow transition relative`}
    >
      {isLoading ? (
        <>
          <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin mr-2"></div>
          <span>로그인 중...</span>
        </>
      ) : (
        <>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2.25C6.47715 2.25 2 5.82076 2 10.1991C2 12.9035 3.74275 15.2919 6.45036 16.7105L5.00377 21.2153C4.92516 21.4689 5.16707 21.6831 5.39576 21.5435L10.8222 18.1352C11.2057 18.1809 11.5989 18.2045 12 18.2045C17.5229 18.2045 22 14.6338 22 10.2554C22 5.87702 17.5229 2.25 12 2.25Z"
              fill="black"
            />
          </svg>
          <span>카카오로 로그인</span>
        </>
      )}
    </button>
  );
};

export default KakaoAuthButton; 