'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useSelector } from 'react-redux';
import ComponentPalette from '@/components/edit/ComponentPalette';
import EditorCanvas from '@/components/edit/EditorCanvas';
import EditorCanvas2 from '@/components/edit/EditorCanvas2';

export default function EditPage({ username }: { username: string }) {
  const { currentUser } = useSelector((state: any) => state.user);
  const [ownerUid, setOwnerUid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        
        // 사용자가 로그인하지 않은 경우
        if (!currentUser?.uid) {
          router.push('/login');
          return;
        }

        const usernameRef = doc(db, 'usernames', username);
        const usernameSnap = await getDoc(usernameRef);

        // username 문서가 없는 경우 (새 사이트 생성)
        if (!usernameSnap.exists()) {
          // username 문서 생성
          await setDoc(usernameRef, {
            uid: currentUser.uid
          });

          // 기본 컴포넌트 설정
          await setDoc(doc(db, "users", currentUser.uid, "links", "page"), {
            components: ["프로필카드",  "SNS카드", "사진첩", "링크카드", "달력", "게스트북"],
          });

          // 기본 배경 설정
          await setDoc(doc(db, "users", currentUser.uid, "settings", "background"), {
            type: 'video',
            value: 'https://cdn.pixabay.com/video/2024/03/18/204565-924698132_large.mp4'
          });

          setOwnerUid(currentUser.uid);
        } else {
          // username 문서가 있는 경우
          const uid = usernameSnap.data()?.uid;
          if (uid !== currentUser.uid) {
            router.push('/');
            return;
          }
          setOwnerUid(uid);
        }
      } catch (error) {
        console.error('Error in load:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [username, currentUser, router]);

  if (isLoading) {
    return (
      <div className="w-full h-screen flex justify-center items-center bg-gray-100">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!ownerUid) return null;

  return (
    <div className="w-full min-h-screen flex justify-center items-start bg-gray-700">
      <div className="w-full max-w-6xl md:w-4/5 bg-gray-300 rounded-2xl shadow-2xl mt-10 mb-10 p-4 flex flex-col gap-8">
        <h1 className="font-bold text-center mt-6 mb-8 text-3xl text-black tracking-wide relative after:content-[''] after:absolute after:bottom-[-8px] after:left-1/2 after:transform after:-translate-x-1/2 after:w-16 after:h-1 after:bg-gradient-to-r after:from-blue-500 after:to-purple-500 after:rounded-full">에디터</h1>
        <div className="p-0.5 flex gap-10 md:bg-gray-50 bg-blend-darken rounded-xl">
          <div className="w-1/4 md:block hidden pt-6">
            <h1 className="font-bold text-center mt-4 mb-8 text-2xl text-black tracking-wide relative after:content-[''] after:absolute after:bottom-[-8px] after:left-1/2 after:transform after:-translate-x-1/2 after:w-12 after:h-1 after:bg-gradient-to-r after:from-blue-400 after:to-purple-400 after:rounded-full">컴포넌트</h1>
            <ComponentPalette />
          </div>

          <div className="md:hidden w-full">
            <EditorCanvas/>
            <div className='h-[50px]'></div>
            <div className="flex justify-center">
              <Link 
                href={`/${username}`} 
                className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-center shadow-md transition-all hover:bg-gray-50 hover:border-gray-300 hover:scale-105 active:scale-95 select-none"
              >
                수정완료 · 미리보기
              </Link>
            </div>
          </div>

          <div className="md:w-3/4 md:block hidden">
            <h1 className="md:block hidden font-bold text-center mt-6 mb-8 text-2xl text-black tracking-wide relative after:content-[''] after:absolute after:bottom-[-8px] after:left-1/2 after:transform after:-translate-x-1/2 after:w-20 after:h-1 after:bg-gradient-to-r after:from-blue-500 after:to-purple-500 after:rounded-full">드래그로 위치 변경하세요 ✨</h1>
            <div className="bg-white rounded-xl shadow p-4">
              <EditorCanvas2/>
            </div>
            <div className='h-[50px]'></div>
            <div className="flex justify-center">
              <Link 
                href={`/${username}`} 
                className="px-8 py-4 mb-10 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-center shadow-md transition-all hover:bg-gray-50 hover:border-gray-300 hover:scale-105 active:scale-95 select-none"
              >
                수정완료 · 미리보기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
