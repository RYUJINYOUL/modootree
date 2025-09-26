'use client';

import Script from 'next/script';
import { AuthProvider } from '@/components/providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.6.0/kakao.min.js"
          integrity="sha384-6MFdIr0zOira1DhCDHgE7pgMzE2PQg4jDbJWtJP5O0u8P5pJoXVKVrtQD5MpEjs"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        <Script
          id="kakao-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY);
              console.log('카카오 SDK 초기화 상태:', window.Kakao.isInitialized());
            `,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}