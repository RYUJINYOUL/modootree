'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useSelector } from 'react-redux';
import ComponentPalette from '@/components/edit/ComponentPalette';
import EditorCanvas from '@/components/edit/EditorCanvas';
import EditorCanvas2 from '@/components/edit/EditorCanvas2';

export default function EditPage({ username }: { username: string }) {
  const { currentUser } = useSelector((state: any) => state.user);
  const [ownerUid, setOwnerUid] = useState<string | null>(null);
  const router = useRouter();

  // 🔹 username → uid 확인
  useEffect(() => {
    console.log(username)
    const load = async () => {
      const ref = doc(db, 'usernames', username);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const uid = snap.data()?.uid;
        if (!uid || uid !== currentUser?.uid) {
          router.push('/login');
        } else {
          setOwnerUid(uid);
        }
      } else {
        router.push('/login');
      }
    };

    if (username && currentUser?.uid) {
      load();
    }
  }, [username, currentUser, router]);

  if (!ownerUid) return null; // 로딩 중이거나 리디렉션 중

  return (
    <div>
      <h1 className="font-bold mb-4 text-black text-center pt-3">에디터</h1>
      <div className="p-0.5 flex gap-10 md:bg-black bg-blend-darken">
        <div className="w-1/4 md:block hidden pt-6">
          <h1 className="font-bold mb-4 text-white">컴포넌트</h1>
          <ComponentPalette />
        </div>

        <div className="md:hidden w-full">
          <EditorCanvas/>
          <div className='h-[50px]'></div>
        </div>

        <div className="md:w-3/4 md:block hidden">
          <h1 className="md:block hidden font-bold mb-4 text-white">드래그로 위치 변경하세요</h1>
          <EditorCanvas2/>
          <div className='h-[50px]'></div>
        </div>
      </div>
    </div>
  );
}
