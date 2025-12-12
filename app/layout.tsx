import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import { Providers } from '@/components/providers';
import { cn } from '@/lib/utils';
import { TranslateProvider } from '@/context/TranslateContext';
import ClientLayout from '@/components/ClientLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '모두트리 - 퀴즈 링크 편지',
  description: '누구나 쉽게 만들어 공유하는 퀴즈 링크 편지',
  keywords: '모두트리, 링크편지, 퀴즈링크편지',
  openGraph: {
    title: '모두트리 - 퀴즈 링크 편지',
    description: '누구나 쉽게 만들어 공유하는 퀴즈 링크 편지',
    locale: 'ko_KR',
    type: 'website',
  },
  icons: {
    icon: [
      { url: '/Image/logo.png', type: 'image/png' },
    ],
    shortcut: ['/Image/logo.png'],
    apple: [
      { url: '/Image/logo.png' },
    ],
  },
  verification: {
    other: {
      'naver-site-verification': '9f741f94681059d45853466618ab08aecdc3852c',
      'google-adsense-account': 'ca-pub-6697023128093217',
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="manifest" href="/manifest.json" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@100;300;400;500;700;900&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#56ab91" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="모두트리" />
        <script 
          async 
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID || 'ca-pub-6697023128093217'}`}
          crossOrigin="anonymous"
        />
        <script
          async
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.6.0/kakao.min.js"
          integrity="sha384-6MFdIr0zOira1DhCDHDuFrEUdYZXyglZWM9ViVK2KMF1/PDxHQ/OoqnYyO6jSBO"
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.Kakao && window.Kakao.init('${process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY}');
              console.log('카카오 SDK 초기화 상태:', window.Kakao?.isInitialized());
            `
          }}
        />
      </head>
      <body
        className={cn(
          inter.className,
          'min-h-screen bg-background antialiased transition-colors duration-300'
        )}
        suppressHydrationWarning
      >
        <TranslateProvider>
          <Providers>
            <ClientLayout>
              {children}
            </ClientLayout>
          </Providers>
        </TranslateProvider>
      </body>
    </html>
  );
}