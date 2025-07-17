import NextAuth from 'next-auth';
import KakaoProvider from 'next-auth/providers/kakao';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
  providers: [
    KakaoProvider({
      clientId: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  debug: true,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log('SignIn callback:', { user, account, profile });
      return true;
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect callback:', { url, baseUrl });
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
});

export { handler as GET, handler as POST }; 