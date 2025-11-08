import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '모두트리 링크편지 - 링크편지와 특별한 서비스',
  description: '퀴즈를 풀어야만 볼 수 있는 특별한 링크편지와 모두트리의 다양한 서비스를 만나보세요. 고백, 감사, 우정, 가족의 마음을 전하는 새로운 방법.',
  keywords: '모두트리, 링크편지, 퀴즈편지, 고백편지, 감사편지, 우정편지, 가족편지, 특별한편지',
  authors: [{ name: '모두트리' }],
  creator: '모두트리',
  publisher: '모두트리',
  openGraph: {
    title: '모두트리 링크편지 - 링크편지와 특별한 서비스',
    description: '퀴즈를 풀어야만 볼 수 있는 특별한 링크편지와 모두트리의 다양한 서비스를 만나보세요.',
    url: 'https://modootree.com/pros-menu',
    siteName: '모두트리',
    images: [
      {
        url: '/logos/m12.png',
        width: 1200,
        height: 630,
        alt: '모두트리 링크편지',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '모두트리 링크편지 - 링크편지와 특별한 서비스',
    description: '퀴즈를 풀어야만 볼 수 있는 특별한 링크편지와 모두트리의 다양한 서비스를 만나보세요.',
    images: ['/logos/m12.png'],
    creator: '@modootree',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
  alternates: {
    canonical: 'https://modootree.com/pros-menu',
  },
  category: 'technology',
};

export default function ProsMenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
