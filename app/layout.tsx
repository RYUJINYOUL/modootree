import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import { Providers } from '@/components/providers';
import { cn } from '@/lib/utils';
import { TranslateProvider } from '@/context/TranslateContext';
import ClientLayout from '@/components/ClientLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '모두트리 - AI 대화로 기록하는 나의 페이지',
  description: '모두트리에서 나만의 특별한 페이지를 만들어 보세요',
  keywords: '모두트리, 모두트리AI, 메모장, 일기장, 사연투표, 뉴스투표, 건강분석, ',
  openGraph: {
    title: '모두트리 - AI 대화로 기록하는 나의 페이지',
    description: 'AI 대화로 기록하는 나만의 특별한 페이지를 만들어 보세요',
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
        <link rel="manifest" href="/manifest.json" />
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