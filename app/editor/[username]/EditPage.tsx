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
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { ComponentKey } from '@/components/edit/ComponentLibrary';

const db = getFirestore(app);

// 사이트 타입 정의
type SiteType = "diary" | "schedule" | "links" | "portfolio" | "etc";

// 사이트 타입별 기본 컴포넌트 설정
const DEFAULT_COMPONENTS: Record<SiteType, ComponentKey[]> = {
  diary: ["일기장"],
  schedule: ["달력"],
  links: ["링크카드"],
  portfolio: ["사진첩"],
  etc: ["프로필카드", "링크카드", "달력", "게스트북"]
} as const;

// 사이트 타입 한글명
const TYPE_LABELS: Record<SiteType, string> = {
  diary: "다이어리",
  schedule: "일정표",
  links: "링크모음",
  portfolio: "포트폴리오",
  etc: "기타"
};

interface AllowedUser {
  email: string;
}

export default function EditPage({ username }: { username: string }) {
  const { currentUser } = useSelector((state: any) => state.user);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [ownerUid, setOwnerUid] = useState('');
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [error, setError] = useState('');
  const [siteType, setSiteType] = useState<SiteType | null>(null);
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const [components, setComponents] = useState<ComponentKey[]>([]);

  // 구독자 목록 상태 추가
  const [subscribers, setSubscribers] = useState<{ email: string }[]>([]);

  // 새 구독자 이메일 상태 추가
  const [newSubscriberEmail, setNewSubscriberEmail] = useState('');
  const [subscriberError, setSubscriberError] = useState('');

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

          // 빈 컴포넌트로 시작
          await setDoc(doc(db, "users", currentUser.uid, "links", "page"), {
            components: [], // 빈 배열로 시작
            type: null // 타입도 초기에는 null
          });

          // 기본 배경 설정
          await setDoc(doc(db, "users", currentUser.uid, "settings", "background"), {
            type: 'image',
            value: 'https://firebasestorage.googleapis.com/v0/b/mtree-e0249.firebasestorage.app/o/backgrounds%2F1752324410072_leaves-8931849_1920.jpg?alt=media&token=bda5d723-d54d-43d5-8925-16aebeec8cfa',
            animation: true
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

          // 배경 설정이 없는 경우 기본 배경 설정
          const backgroundDoc = await getDoc(doc(db, "users", uid, "settings", "background"));
          if (!backgroundDoc.exists()) {
            await setDoc(doc(db, "users", uid, "settings", "background"), {
                type: 'image',
                value: 'https://firebasestorage.googleapis.com/v0/b/mtree-e0249.firebasestorage.app/o/backgrounds%2F1752324410072_leaves-8931849_1920.jpg?alt=media&token=bda5d723-d54d-43d5-8925-16aebeec8cfa',
                animation: true
            });
          }
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
          const data = doc.data();
          setAllowedUsers(data.allowedUsers || []);
        }
      }
    );

    return () => unsubscribe();
  }, [ownerUid]);

  // 컴포넌트 데이터 로드
  useEffect(() => {
    const loadComponents = async () => {
      if (!ownerUid) return;
      
      try {
        const pageDoc = await getDoc(doc(db, "users", ownerUid, "links", "page"));
        if (pageDoc.exists()) {
          const data = pageDoc.data();
          setComponents(data.components || []);
          setSiteType(data.type || null);
        }
      } catch (error) {
        console.error('컴포넌트 로드 실패:', error);
      }
    };

    loadComponents();
  }, [ownerUid]);

  // 컴포넌트 저장
  useEffect(() => {
    const saveComponents = async () => {
      if (!ownerUid) return;
      
      try {
        await setDoc(doc(db, "users", ownerUid, "links", "page"), {
          components,
          type: siteType
        });
      } catch (error) {
        console.error('컴포넌트 저장 실패:', error);
      }
    };

    if (components.length > 0 || siteType) {
      saveComponents();
    }
  }, [components, siteType, ownerUid]);

  // 컴포넌트 업데이트 핸들러
  const handleComponentsUpdate = (newComponents: ComponentKey[]) => {
    setComponents(newComponents);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !ownerUid) return;

    try {
      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newUsername)) {
        setError('올바른 이메일 형식이 아닙니다.');
        return;
      }

      // 권한 설정
      const permissionsRef = doc(db, 'users', ownerUid, 'settings', 'permissions');
      const permissionsDoc = await getDoc(permissionsRef);
      
      let currentAllowedUsers: AllowedUser[] = [];
      if (permissionsDoc.exists()) {
        currentAllowedUsers = permissionsDoc.data().allowedUsers || [];
      }

      if (currentAllowedUsers.some((user: AllowedUser) => user.email === newUsername)) {
        setError('이미 등록된 이메일입니다.');
        return;
      }

      await setDoc(permissionsRef, {
        allowedUsers: [...currentAllowedUsers, { email: newUsername }]
      });

      setNewUsername('');
      setError('');
    } catch (error) {
      console.error('사용자 추가 실패:', error);
      setError('사용자 추가에 실패했습니다.');
    }
  };

  const handleRemoveUser = async (emailToRemove: string) => {
    if (!ownerUid) return;

    try {
      const permissionsRef = doc(db, 'users', ownerUid, 'settings', 'permissions');
      await setDoc(permissionsRef, {
        allowedUsers: allowedUsers.filter(user => user.email !== emailToRemove)
      });
    } catch (error) {
      console.error('사용자 제거 실패:', error);
      setError('사용자 제거에 실패했습니다.');
    }
  };

  // 사이트 타입 변경 핸들러
  const handleSiteTypeChange = async (newType: SiteType) => {
    try {
      setComponents(DEFAULT_COMPONENTS[newType]);
      setSiteType(newType);
      setIsTypeMenuOpen(false);
      
      alert(`${TYPE_LABELS[newType]} 타입으로 변경되었습니다!`);
    } catch (error) {
      console.error('사이트 타입 변경 실패:', error);
      alert('사이트 타입 변경에 실패했습니다.');
    }
  };

  // 구독자 목록 가져오기
  useEffect(() => {
    if (!ownerUid) return;
    
    const unsubscribe = onSnapshot(
      doc(db, 'users', ownerUid, 'settings', 'subscribers'),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const subscribersList = Object.values(data.users || {})
            .filter((sub: any) => sub.email)
            .map((sub: any) => ({ email: sub.email }));
          setSubscribers(subscribersList);
        }
      }
    );

    return () => unsubscribe();
  }, [ownerUid]);

  // 구독 취소 처리
  const handleUnsubscribe = async (emailToRemove: string) => {
    if (!ownerUid) return;

    try {
      const subscribersRef = doc(db, 'users', ownerUid, 'settings', 'subscribers');
      const subscribersDoc = await getDoc(subscribersRef);
      
      if (subscribersDoc.exists()) {
        const currentSubscribers = subscribersDoc.data().users || {};
        const updatedSubscribers = Object.entries(currentSubscribers)
          .filter(([_, sub]: [string, any]) => sub.email !== emailToRemove)
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

        await setDoc(subscribersRef, { users: updatedSubscribers });
      }
    } catch (error) {
      console.error('구독 취소 실패:', error);
      setError('구독 취소에 실패했습니다.');
    }
  };

  // 구독자 추가 처리
  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubscriberEmail.trim() || !ownerUid) return;

    try {
      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newSubscriberEmail)) {
        setSubscriberError('올바른 이메일 형식이 아닙니다.');
        return;
      }

      const subscribersRef = doc(db, 'users', ownerUid, 'settings', 'subscribers');
      const subscribersDoc = await getDoc(subscribersRef);
      
      const currentSubscribers = subscribersDoc.exists() ? subscribersDoc.data().users || {} : {};
      
      // 이미 구독 중인지 확인
      if (Object.values(currentSubscribers).some((sub: any) => sub.email === newSubscriberEmail)) {
        setSubscriberError('이미 구독 중인 이메일입니다.');
        return;
      }

      // 새 구독자 추가
      const newSubscriberId = Date.now().toString();
      await setDoc(subscribersRef, {
        users: {
          ...currentSubscribers,
          [newSubscriberId]: { email: newSubscriberEmail }
        }
      });

      setNewSubscriberEmail('');
      setSubscriberError('');
    } catch (error) {
      console.error('구독자 추가 실패:', error);
      setSubscriberError('구독자 추가에 실패했습니다.');
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
      <div className="w-full max-w-6xl md:w-4/5 bg-gray-300 rounded-2xl shadow-2xl mt-3 mb-10 p-4 flex flex-col gap-8">
        <h1 className="font-bold text-center mt-5 mb-5 text-3xl text-black tracking-wide relative after:content-[''] after:absolute after:bottom-[-8px] after:left-1/2 after:transform after:-translate-x-1/2 after:w-16 after:h-1 after:bg-gradient-to-r after:from-blue-500 after:to-purple-500 after:rounded-full">
          에디터
        </h1>

        {/* 사이트 타입 선택 섹션 - 모바일 친화적 */}
        <div className="bg-gray-50 rounded-xl p-3 shadow-lg">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsTypeMenuOpen(!isTypeMenuOpen)}
          >
            <h2 className="text-lg font-semibold text-gray-800">
              사이트 타입 선택
              {siteType && <span className="ml-2 text-blue-500">- {TYPE_LABELS[siteType]}</span>}
            </h2>
            {isTypeMenuOpen ? (
              <ChevronUp className="w-6 h-6 text-gray-500" />
            ) : (
              <ChevronDown className="w-6 h-6 text-gray-500" />
            )}
          </div>

          {isTypeMenuOpen && (
            <div className="mt-4 space-y-2">
              <p className="text-gray-600 mb-4">
                원하시는 사이트 타입을 선택하시면 기본 컴포넌트가 자동으로 설정됩니다.
              </p>
              <div className="flex flex-col gap-2">
                {(Object.keys(TYPE_LABELS) as SiteType[]).map((type) => (
                  <Button
                    key={type}
                    onClick={() => handleSiteTypeChange(type)}
                    className={`w-full py-3 ${
                      siteType === type 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                  >
                    {TYPE_LABELS[type]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 에디터 영역 */}
        <div className="p-0.5 flex gap-10 md:bg-gray-50 bg-blend-darken rounded-xl">
          <div className="w-1/4 md:block hidden pt-6">
            <h1 className="font-bold text-center mt-4 mb-8 text-2xl text-black tracking-wide relative after:content-[''] after:absolute after:bottom-[-8px] after:left-1/2 after:transform after:-translate-x-1/2 after:w-12 after:h-1 after:bg-gradient-to-r after:from-blue-400 after:to-purple-400 after:rounded-full">컴포넌트</h1>
            <ComponentPalette />
          </div>

          <div className="md:hidden w-full">
            <EditorCanvas
              components={components}
              onComponentsUpdate={handleComponentsUpdate}
            />
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
              <EditorCanvas2
                components={components}
                onComponentsUpdate={handleComponentsUpdate}
              />
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

        {/* 허용된 사용자 관리 섹션 */}
        <div className="bg-gray-50 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">허용된 사용자 관리</h2>
          
          {/* 사용자 추가 폼 */}
          <form onSubmit={handleAddUser} className="space-y-4 mb-6">
            <div className="flex gap-2">
              <Input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="이메일 주소 입력"
                className="flex-1 bg-blue-500/20 border-none text-white placeholder-white/50"
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
            {allowedUsers.map((user: AllowedUser) => (
              <div
                key={user.email}
                className="flex items-center justify-between p-3 bg-gray-100 rounded-lg"
              >
                <span className="text-gray-700">{user.email}</span>
                <Button
                  onClick={() => handleRemoveUser(user.email)}
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

        {/* 구독자 목록 섹션 */}
        <div className="bg-gray-50 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">소식 받는 이메일 목록</h2>
          
          {/* 구독자 추가 폼 */}
          <form onSubmit={handleAddSubscriber} className="space-y-4 mb-6">
            <div className="flex gap-2">
              <Input
                type="text"
                value={newSubscriberEmail}
                onChange={(e) => setNewSubscriberEmail(e.target.value)}
                placeholder="이메일 주소 입력"
                className="flex-1 bg-blue-500/20 border-none text-gray-800 placeholder-gray-500"
              />
              <Button
                type="submit"
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                추가
              </Button>
            </div>
            {subscriberError && (
              <p className="text-red-500 text-sm">{subscriberError}</p>
            )}
          </form>

          {/* 구독자 목록 */}
          <div className="space-y-2">
            {subscribers.map((subscriber) => (
              <div
                key={subscriber.email}
                className="flex items-center justify-between p-3 bg-gray-100 rounded-lg"
              >
                <span className="text-gray-700">{subscriber.email}</span>
                <Button
                  onClick={() => handleUnsubscribe(subscriber.email)}
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 hover:text-red-500 hover:bg-gray-200"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {subscribers.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                구독 중인 이메일이 없습니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
