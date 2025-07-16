import NextAuth from 'next-auth';
import KakaoProvider from 'next-auth/providers/kakao';

console.log('\n=== KAKAO AUTH DEBUG (pages) ===');
console.log('Environment Variables:', {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_URL: process.env.VERCEL_URL
});
console.log('Kakao Config:', {
  clientId: process.env.KAKAO_CLIENT_ID,
  clientSecret: process.env.KAKAO_CLIENT_SECRET?.slice(0, 5) + '...',
  redirectUri: process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI
});
console.log('========================\n');

export default NextAuth({
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
    // ... 다른 providers
  ],
  debug: true, // 디버그 모드 활성화
}); 