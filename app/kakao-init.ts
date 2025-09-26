declare global {
  interface Window {
    Kakao: any;
  }
}

export function initializeKakao() {
  if (typeof window !== 'undefined' && window.Kakao) {
    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
    if (!window.Kakao.isInitialized() && kakaoKey) {
      window.Kakao.init(kakaoKey);
      console.log('카카오 SDK 초기화 상태:', window.Kakao.isInitialized());
    }
  }
}
