import { Metadata, ResolvingMetadata } from 'next';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { notFound } from 'next/navigation';

// Node.js Runtime 사용
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      openGraph: {
        title: '페이지를 찾을 수 없습니다 - 모두트리',
        description: '요청하신 페이지를 찾을 수 없습니다.'
      }
    };
  }

      const uid = usernameDoc.data().uid;
    
    const [userDoc, metadataDoc] = await Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDoc(doc(db, 'users', uid, 'settings', 'metadata'))
    ]);

    const userData = userDoc.exists() ? userDoc.data() : null;
    const metadataData = metadataDoc.exists() ? metadataDoc.data() : null;

    // 이미지 우선순위: metadata.ogImage > user.photoURL > 기본 이미지
    const imageUrl = metadataData?.ogImage || userData?.photoURL || '/Image/default-profile.png';

    const metadata = {
      title: metadataData?.title || `${username}의 모두트리`,
      description: metadataData?.description || `${username}의 모두트리입니다.`,
      openGraph: {
        title: metadataData?.title || `${username}의 모두트리`,
        description: metadataData?.description || `${username}의 모두트리입니다.`,
        images: [imageUrl]
      },
      twitter: {
        card: 'summary_large_image',
        title: metadataData?.title || `${username}의 모두트리`,
        description: metadataData?.description || `${username}의 모두트리입니다.`,
        images: [imageUrl]
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

    return metadata;

  } catch (error: any) {
    return {
      title: '모두트리',
      description: '페이지 로딩 중 문제가 발생했습니다.',
      openGraph: {
        title: '모두트리',
        description: '페이지 로딩 중 문제가 발생했습니다.',
        images: ['/Image/default-profile.png']
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
  }
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}