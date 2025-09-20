import type { Metadata } from "next";

export const metadata: Metadata = {
  title: '모두트리 AI - 사진 한 조각',
  description: 'AI가 분석하는 당신의 하루. 음식의 칼로리, 반려동물의 감정, 연인과의 관계, 모임의 분위기까지 AI가 분석해드립니다.',
  keywords: '모두트리, AI 분석, 사진 분석, 칼로리 분석, 반려동물 감정 분석, 관계 분석, 모임 분석',
  openGraph: {
    title: '모두트리 AI - 사진 한 조각',
    description: 'AI가 분석하는 당신의 하루',
    images: [
      {
         url: '/logos/m13.png',
        width: 800,
        height: 800,
        alt: '모두트리 AI',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '모두트리 AI - 사진 한 조각',
    description: 'AI가 분석하는 당신의 하루',
     images: ['/logos/m13.png'],
  },
};

export default function JoyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
