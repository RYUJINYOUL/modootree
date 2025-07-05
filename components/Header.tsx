"use client";

import { useSelector } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import { getAuth, signOut } from 'firebase/auth';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from '@/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';

export default function Header() {
  const user = useSelector((state: any) => state.user);
  const router = useRouter();
  const pathname = usePathname();
  const [showLeftDropdown, setShowLeftDropdown] = useState(false);
  const [showRightDropdown, setShowRightDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [allowedSites, setAllowedSites] = useState<Array<{username: string}>>([]);
  const [myUsername, setMyUsername] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px 미만을 모바일로 간주
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user?.currentUser?.uid) return;

    // 내 username 가져오기
    const fetchMyUsername = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.currentUser.uid));
        if (userDoc.exists()) {
          setMyUsername(userDoc.data().username || '');
        }
      } catch (error) {
        console.error('사용자 정보 가져오기 실패:', error);
      }
    };

    fetchMyUsername();

    // 허용된 사이트 목록 가져오기
    const fetchAllowedSites = async () => {
      try {
        // 먼저 permissions 문서에서 허용된 이메일 목록을 가져옴
        const permissionsDoc = await getDoc(doc(db, 'users', user.currentUser.uid, 'settings', 'permissions'));
        if (!permissionsDoc.exists()) return;

        const allowedEmails = permissionsDoc.data().allowedUsers || [];
        
        // 각 이메일에 해당하는 사용자의 username을 가져옴
        const sites = [];
        for (const emailData of allowedEmails) {
          const usersQuery = query(
            collection(db, 'users'),
            where('email', '==', emailData.email)
          );
          const userSnapshot = await getDocs(usersQuery);
          
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            if (userData.username) {
              sites.push({ username: userData.username });
            }
          }
        }
        
        setAllowedSites(sites);
      } catch (error) {
        console.error('허용된 사이트 목록 가져오기 실패:', error);
      }
    };

    fetchAllowedSites();

    // 실시간 업데이트 설정
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.currentUser.uid, 'settings', 'permissions'),
      () => {
        fetchAllowedSites();
      }
    );

    return () => unsubscribe();
  }, [user?.currentUser?.uid]);

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const handleInquiry = () => {
    window.open('http://pf.kakao.com/_pGNPn/chat', '_blank', 'noopener,noreferrer');
  };

  const handleNavigation = async (path: string) => {
    try {
      // 특정 경로는 바로 이동
      if (path === '/' || path === '/likes/all') {
        setShowLeftDropdown(false);
        setShowRightDropdown(false);
        router.push(path);
        return;
      }

      // username이 실제로 존재하는지 확인
      const username = path.replace('/', '');
      const usernameDoc = await getDoc(doc(db, 'usernames', username));
      
      if (!usernameDoc.exists()) {
        alert('존재하지 않는 페이지입니다.');
        return;
      }

      // users 컬렉션에서 해당 uid의 username도 확인
      const uid = usernameDoc.data()?.uid;
      if (uid) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists() || userDoc.data()?.username !== username) {
          alert('페이지를 찾을 수 없습니다.');
          return;
        }
      }
      
      setShowLeftDropdown(false);
      setShowRightDropdown(false);
      router.push(path);
    } catch (error) {
      console.error('페이지 이동 실패:', error);
      alert('페이지 이동에 실패했습니다.');
    }
  };

  // 로그인 상태가 아닐 경우 표시하지 않음
  if (!mounted || !user?.currentUser?.uid) return null;

  return (
    <header className={`${
      isMobile 
        ? 'top-1/2 -translate-y-1/2' // 모바일에서는 중앙 위치
        : 'top-0 translate-y-0'      // PC에서는 상단 고정
    } fixed left-0 right-0 flex justify-between items-center px-6 py-4 z-50 transition-all duration-300`}>
      {/* 왼쪽 드롭다운 */}
      <div className="relative">
        <button
          onClick={() => setShowLeftDropdown(!showLeftDropdown)}
          className="flex items-center space-x-3 bg-white/10 hover:bg-white/20 transition-all duration-200 rounded-full px-4 py-2 backdrop-blur-md"
        >
          <Image
            src="/Image/logo.png"
            alt="ModooTree Logo"
            width={32}
            height={32}
            priority
            className="w-8 h-8 rounded-sm"
          />
          <span className="text-white/90 text-sm font-medium">
            홈
          </span>
          <svg
            className={`w-4 h-4 text-white/70 transition-transform duration-200 ${
              showLeftDropdown ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {showLeftDropdown && (
          <div className="absolute left-0 mt-2 w-48 bg-white/10 backdrop-blur-md rounded-xl shadow-lg py-1 text-sm text-white/90">
            <button
              onClick={() => handleNavigation('/')}
              className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors duration-200"
            >
              메인 페이지
            </button>
            <button
              onClick={() => handleNavigation('/likes/all')}
              className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors duration-200"
            >
              공감한조각
            </button>
            <button
              onClick={handleInquiry}
              className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors duration-200"
            >
              문의하기
            </button>
          </div>
        )}
      </div>

      {/* 오른쪽 드롭다운 */}
      <div className="relative">
        <button
          onClick={() => setShowRightDropdown(!showRightDropdown)}
          className="flex items-center space-x-3 bg-white/10 hover:bg-white/20 transition-all duration-200 rounded-full px-4 py-2 backdrop-blur-md"
        >
          <span className="text-white/90 text-sm font-medium">
            메뉴
          </span>
          <svg
            className={`w-4 h-4 text-white/70 transition-transform duration-200 ${
              showRightDropdown ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {showRightDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white/10 backdrop-blur-md rounded-xl shadow-lg py-1 text-sm text-white/90">
            {myUsername && (
              <>
                <div className="px-4 py-2 text-white/50 border-b border-white/10">내 사이트</div>
                <button
                  onClick={() => handleNavigation(`/${myUsername}`)}
                  className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors duration-200"
                >
                  {myUsername}
                </button>
              </>
            )}
            <div className="px-4 py-2 text-white/50 border-b border-white/10">초대된 사이트</div>
            {allowedSites.length > 0 ? (
              allowedSites.map((site, index) => (
                <button
                  key={index}
                  onClick={() => handleNavigation(`/${site.username}`)}
                  className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors duration-200"
                >
                  {site.username}
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-white/30">허용된 사이트가 없습니다</div>
            )}
            <div className="border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors duration-200"
              >
                로그아웃
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
} 