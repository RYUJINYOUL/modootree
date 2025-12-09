import { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface LinkLetter {
  id: string;
  title: string;
  category: 'confession' | 'gratitude' | 'friendship' | 'filial' | 'apology' | 'celebration';
  content: string;
  author: {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
  };
  isPublic: boolean;
  viewCount: number;
  likeCount: number;
  createdAt: Date;
  images?: string[];
}

const letterCategories = [
  { id: 'confession', name: '사랑' },
  { id: 'gratitude', name: '감사' },
  { id: 'friendship', name: '우정' },
  { id: 'filial', name: '가족' },
  { id: 'apology', name: '사과' },
  { id: 'celebration', name: '축하' }
];

export async function generateMetadata({ params }: { params: Promise<{ letterId: string }> }): Promise<Metadata> {
  try {
    const { letterId } = await params;
    
    if (!letterId) {
      console.error('letterId가 없습니다:', letterId);
      throw new Error('letterId가 제공되지 않았습니다');
    }
    
    if (!db) {
      console.error('Firebase db가 초기화되지 않았습니다');
      throw new Error('Firebase db가 초기화되지 않았습니다');
    }
    
    const docRef = doc(db, 'linkLetters', letterId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const letter = {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date()
      } as LinkLetter;
      
      const category = letterCategories.find(cat => cat.id === letter.category);
      const description = letter.content && letter.content.length > 150 
        ? letter.content.substring(0, 150) + '...' 
        : letter.content || '특별한 링크 편지입니다.';
      
      const ogImage = letter.images && letter.images.length > 0 
        ? letter.images[0] 
        : '/icons/icon-192.png';
      
      return {
        title: `${letter.title} - 모두트리 링크편지`,
        description: `${category?.name || ''} 편지: ${description}`,
        keywords: ['링크편지', '편지쓰기', '퀴즈편지', category?.name || '', '모두트리'],
        authors: [{ name: letter.author.displayName }],
        openGraph: {
          title: letter.title,
          description: `${letter.author.displayName}님이 보낸 특별한 편지입니다. 퀴즈를 풀고 편지를 확인해보세요!`,
          type: 'article',
          url: `https://modootree.com/link-letter/${letterId}`,
          images: [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: letter.title,
            },
          ],
          siteName: '모두트리',
          locale: 'ko_KR',
        },
        twitter: {
          card: 'summary_large_image',
          title: letter.title,
          description: `${letter.author.displayName}님의 특별한 편지 💌`,
          images: [ogImage],
          creator: '@modootree',
        },
        robots: {
          index: letter.isPublic,
          follow: letter.isPublic,
          googleBot: {
            index: letter.isPublic,
            follow: letter.isPublic,
          },
        },
        alternates: {
          canonical: `https://modootree.com/link-letter/${letterId}`,
        },
      };
    }
  } catch (error) {
    console.error('메타데이터 생성 실패:', error);
    console.error('오류 상세 정보:', {
      message: error instanceof Error ? error.message : '알 수 없는 오류',
      stack: error instanceof Error ? error.stack : undefined,
      params: params
    });
  }
  
  // 기본 메타데이터 (편지를 찾을 수 없는 경우)
  return {
    title: '링크편지 - 모두트리',
    description: '퀴즈를 풀어야 볼 수 있는 특별한 편지입니다.',
    keywords: ['링크편지', '편지쓰기', '퀴즈편지', '모두트리'],
    openGraph: {
      title: '링크편지 - 모두트리',
      description: '퀴즈를 풀어야 볼 수 있는 특별한 편지입니다.',
      type: 'website',
      url: 'https://modootree.com/link-letter',
      images: [
        {
          url: '/icons/icon-192.png',
          width: 192,
          height: 192,
          alt: '모두트리 로고',
        },
      ],
      siteName: '모두트리',
      locale: 'ko_KR',
    },
    twitter: {
      card: 'summary',
      title: '링크편지 - 모두트리',
      description: '퀴즈를 풀어야 볼 수 있는 특별한 편지입니다.',
      images: ['/icons/icon-192.png'],
      creator: '@modootree',
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#56ab91',
};

export default function LinkLetterDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}





