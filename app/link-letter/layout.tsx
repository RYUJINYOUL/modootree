import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '모두트리 - 링크편지',
  description: '퀴즈를 풀어야 볼 수 있는 특별한 편지를 작성하고 공유해보세요',
  keywords: ['링크편지', '편지쓰기', '퀴즈편지', '각종 카테고리별 편지', '고백편지', '감사편지', '우정편지', '효도편지', '사과편지', '축하편지', '모두트리'],
  openGraph: {
    title: '모두트리 - 링크편지',
    description: '퀴즈를 풀어야 볼 수 있는 특별한 편지를 작성하고 공유해보세요',
    type: 'website',
    locale: 'ko_KR',
    siteName: '모두트리',
    images: [
      {
        url: '/icons/icon-192.png',
        width: 192,
        height: 192,
        alt: '모두트리 - 링크편지',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: '모두트리 - 링크편지',
    description: '퀴즈를 풀어야 볼 수 있는 특별한 편지를 작성하고 공유해보세요',
    images: ['/icons/icon-192.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/link-letter',
  },
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#1e293b',
};

export default function LinkLetterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
