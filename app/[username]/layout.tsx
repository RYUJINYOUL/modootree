import { Metadata, ResolvingMetadata } from 'next';
// import admin from '@/firebase-admin';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { notFound } from 'next/navigation';

// Next 앱 라우터에서 메타데이터가 항상 최신 Firestore 값을 반영하도록 강제 동적 렌더링 및 캐시 비활성화
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Props 타입과 parent 인자를 모두 사용합니다.
export async function generateMetadata(
  { params }: { params: Promise<{ username: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  try {
    // 1. username으로 uid 가져오기
    const { username } = await params;
    const usernameDoc = await getDoc(doc(db, 'usernames', username));
    
    if (!usernameDoc.exists()) {
      return {
        title: '페이지를 찾을 수 없습니다 - 모두트리',
        description: '요청하신 페이지를 찾을 수 없습니다.',
      };
    }

    const uid = usernameDoc.data().uid;

    // 2. 사용자 정보와 페이지 컴포넌트 정보를 병렬로 가져오기
    const [userDoc, metadataDoc, galleryDoc] = await Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDoc(doc(db, 'users', uid, 'settings', 'metadata')),
      getDoc(doc(db, 'users', uid, 'info', 'details'))
    ]);

    const userData = userDoc.exists() ? userDoc.data() : {};
    const metadataData = metadataDoc.exists() ? metadataDoc.data() : {};
    const galleryData = galleryDoc.exists() ? galleryDoc.data() : {};

    // 3. 메타데이터 구성 (우선순위: 메타데이터 > Gallery3 > 기본값)
    const title = metadataData.title || galleryData.name || `${userData.name || username}님의 모두트리 페이지`;
    const description = metadataData.description || galleryData.desc || '나만의 특별한 페이지를 만들어 가꾸어 보세요.';
    const imageUrl = metadataData.ogImage || galleryData.logoUrl || '/Image/default-profile.png';
    const keywords = metadataData.keywords || [];

    return {
      title,
      description,
      keywords,
      openGraph: {
        title,
        description,
        images: [imageUrl],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
      icons: {
        icon: [
          { url: '/favicon.ico', type: 'image/x-icon', sizes: '1000x1000' },
          { url: '/Image/logo.png', type: 'image/png' }
        ],
        shortcut: ['/Image/logo.png'],
        apple: ['/Image/logo.png'],
      }
    };
  } catch (error) {
    console.error('메타데이터 생성 중 오류:', error);
    return {
      title: '모두트리',
      description: '나만의 특별한 페이지를 선물합니다',
      icons: {
        icon: [
          { url: '/favicon.ico', type: 'image/x-icon', sizes: '1000x1000' },
          { url: '/Image/logo.png', type: 'image/png' }
        ],
        shortcut: ['/Image/logo.png'],
        apple: ['/Image/logo.png'],
      }
    };
  }
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}