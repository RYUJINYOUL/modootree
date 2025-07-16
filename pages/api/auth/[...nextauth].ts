import NextAuth from 'next-auth';
import KakaoProvider from 'next-auth/providers/kakao';

console.log('=== KAKAO AUTH DEBUG (pages) ===');
console.log('KAKAO CONFIG:', {
  clientId: process.env.KAKAO_CLIENT_ID,
  clientSecret: process.env.KAKAO_CLIENT_SECRET?.slice(0, 5) + '...',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
});
console.log('========================');

export default NextAuth({
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
    // ... 다른 providers
  ],
}); 