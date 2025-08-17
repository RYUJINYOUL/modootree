import { Metadata, ResolvingMetadata } from 'next';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { notFound } from 'next/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(
  { params }: { params: Promise<{ username: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  console.log('generateMetadata 시작:', { params });
  try {
    // 1. username으로 uid 가져오기
    const { username } = await params;
    console.log('username 추출:', username);
    
    const usernameDoc = await getDoc(doc(db, 'usernames', username));
    console.log('usernames 문서 조회 결과:', { exists: usernameDoc.exists(), data: usernameDoc.data() });
  
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
  // username은 이미 위에서 추출됨

    // 2. 사용자 문서와 메타데이터 문서를 병렬로 가져오기
    console.log('uid 추출:', uid);
    
    const [userDoc, metadataDoc] = await Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDoc(doc(db, 'users', uid, 'settings', 'metadata'))
    ]);
    
    console.log('문서 조회 결과:', {
      userExists: userDoc.exists(),
      userData: userDoc.data(),
      metadataExists: metadataDoc.exists(),
      metadataData: metadataDoc.data()
    });

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
    console.error('메타데이터 생성 중 오류 발생:', error);
    console.error('에러 상세:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });
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