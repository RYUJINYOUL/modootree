import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import { Providers } from '@/components/providers';
// import { Toaster } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import Footer from '@/components/ui/Footer';
import Header from '@/components/Header';
import { TranslateProvider } from '@/context/TranslateContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '모두트리 - 나의 특별한 페이지',
  description: '모두트리에서 나만의 특별한 페이지를 만들어 보세요',
  keywords: '모두트리, 링크모음, 일기장, 포트폴리오, 동네게시판, 방명록, 일정표, ',
  openGraph: {
    title: '모두트리 - 나의 특별한 페이지',
    description: '모두트리에서 나만의 특별한 페이지를 만들어 보세요',
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
              window.Kakao && window.Kakao.init('${process.env.NEXT_PUBLIC_KAKAO_JS_ID}');
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
            {/* Header는 메인 페이지가 아닐 때만 표시 */}
            <div className="flex flex-col min-h-screen">
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
            {/* <Toaster /> */}
          </Providers>
        </TranslateProvider>
      </body>
    </html>
  );
}
