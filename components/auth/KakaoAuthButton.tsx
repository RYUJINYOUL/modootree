import React from 'react';

const KakaoAuthButton = () => {
  const handleKakaoLogin = () => {
    const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_BASE_URL}/auth/kakao/callback&response_type=code`;
    window.location.href = KAKAO_AUTH_URL;
  };

  return (
    <button
      onClick={handleKakaoLogin}
      className="w-full flex items-center justify-center gap-2 py-3 mb-6 rounded-xl bg-[#FEE500] text-[#000000] font-semibold shadow hover:bg-[#FEE500]/90 transition"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2.25C6.47715 2.25 2 5.82076 2 10.1991C2 12.9035 3.74275 15.2919 6.45036 16.7105L5.00377 21.2153C4.92516 21.4689 5.16707 21.6831 5.39576 21.5435L10.8222 18.1352C11.2057 18.1809 11.5989 18.2045 12 18.2045C17.5229 18.2045 22 14.6338 22 10.2554C22 5.87702 17.5229 2.25 12 2.25Z"
          fill="black"
        />
      </svg>
      <span>카카오로 로그인</span>
    </button>
  );
};

export default KakaoAuthButton; 