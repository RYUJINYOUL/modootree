'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import app from '@/firebase';
import { useSelector } from 'react-redux';
import ComponentPalette from '@/components/edit/ComponentPalette';
import EditorCanvas from '@/components/edit/EditorCanvas';
import EditorCanvas2 from '@/components/edit/EditorCanvas2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

const db = getFirestore(app);

export default function EditPage({ username }: { username: string }) {
  const { currentUser } = useSelector((state: any) => state.user);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [ownerUid, setOwnerUid] = useState('');
  const [allowedUsers, setAllowedUsers] = useState<Array<{uid: string, email: string}>>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [error, setError] = useState('');

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

  // 허용된 사용자 목록 가져오기
  useEffect(() => {
    if (!ownerUid) return;
    
    const unsubscribe = onSnapshot(
      doc(db, 'users', ownerUid, 'settings', 'permissions'),
      (doc) => {
        if (doc.exists()) {
          setAllowedUsers(doc.data().allowedUsers || []);
        }
      }
    );

    return () => unsubscribe();
  }, [ownerUid]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !ownerUid) return;

    try {
      // 이메일로 사용자 찾기
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', newUserEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('등록되지 않은 사용자입니다.');
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = { uid: userDoc.id, email: newUserEmail };

      // 현재 허용된 사용자 목록 가져오기
      const permissionsRef = doc(db, 'users', ownerUid, 'settings', 'permissions');
      const permissionsDoc = await getDoc(permissionsRef);
      
      let currentAllowedUsers = [];
      if (permissionsDoc.exists()) {
        currentAllowedUsers = permissionsDoc.data().allowedUsers || [];
      }

      // 이미 존재하는 사용자인지 확인
      if (currentAllowedUsers.some((user: { uid: string }) => user.uid === userData.uid)) {
        setError('이미 등록된 사용자입니다.');
        return;
      }

      // 새로운 사용자 추가
      await setDoc(permissionsRef, {
        allowedUsers: [...currentAllowedUsers, userData]
      });

      setNewUserEmail('');
      setError('');
    } catch (error) {
      console.error('사용자 추가 실패:', error);
      setError('사용자 추가에 실패했습니다.');
    }
  };

  const handleRemoveUser = async (userToRemove: {uid: string, email: string}) => {
    if (!ownerUid) return;

    try {
      const permissionsRef = doc(db, 'users', ownerUid, 'settings', 'permissions');
      await setDoc(permissionsRef, {
        allowedUsers: allowedUsers.filter(user => user.uid !== userToRemove.uid)
      });
    } catch (error) {
      console.error('사용자 제거 실패:', error);
      setError('사용자 제거에 실패했습니다.');
    }
  };

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
        
        {/* 허용된 사용자 관리 섹션 */}
        <div className="bg-gray-50 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">허용된 사용자 관리</h2>
          
          {/* 사용자 추가 폼 */}
          <form onSubmit={handleAddUser} className="space-y-4 mb-6">
            <div className="flex gap-2">
              <Input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="사용자 이메일 입력"
                className="flex-1"
              />
              <Button
                type="submit"
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                추가
              </Button>
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
          </form>

          {/* 허용된 사용자 목록 */}
          <div className="space-y-2">
            {allowedUsers.map((user) => (
              <div
                key={user.uid}
                className="flex items-center justify-between p-3 bg-gray-100 rounded-lg"
              >
                <span className="text-gray-700">{user.email}</span>
                <Button
                  onClick={() => handleRemoveUser(user)}
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 hover:text-red-500 hover:bg-gray-200"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {allowedUsers.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                등록된 사용자가 없습니다.
              </p>
            )}
          </div>
        </div>

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
                수정완료 · 배경설정
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
                수정완료 · 배경설정
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
