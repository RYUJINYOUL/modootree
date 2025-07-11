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
  const [showDropdown, setShowDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [allowedSites, setAllowedSites] = useState<Array<{username: string}>>([]);
  const [myUsername, setMyUsername] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
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
        const permissionsDoc = await getDoc(doc(db, 'users', user.currentUser.uid, 'settings', 'permissions'));
        if (!permissionsDoc.exists()) return;

        const allowedEmails = permissionsDoc.data().allowedUsers || [];
        
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
      if (path === '/' || path === '/likes/all') {
        setShowDropdown(false);
        router.push(path);
        return;
      }

      const username = path.replace('/', '');
      const usernameDoc = await getDoc(doc(db, 'usernames', username));
      
      if (!usernameDoc.exists()) {
        alert('존재하지 않는 페이지입니다.');
        return;
      }

      const uid = usernameDoc.data()?.uid;
      if (uid) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists() || userDoc.data()?.username !== username) {
          alert('페이지를 찾을 수 없습니다.');
          return;
        }
      }
      
      setShowDropdown(false);
      router.push(path);
    } catch (error) {
      console.error('페이지 이동 실패:', error);
      alert('페이지 이동에 실패했습니다.');
    }
  };

  if (!mounted || !user?.currentUser?.uid) return null;

  return (
    <header className={`fixed ${isMobile ? 'top-5 left-5' : 'top-5 left-5'} z-50`}>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="inline-flex items-center px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg shadow-md hover:bg-white/40 transition-colors"
        >
          <Image
            src="/Image/logo.png"
            alt="ModooTree Logo"
            width={24}
            height={24}
            priority
            className="w-6 h-6 rounded-sm"
          />
          <svg
            className={`w-4 h-4 text-white ml-2 transition-transform duration-200 ${
              showDropdown ? 'rotate-180' : ''
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

        {showDropdown && (
          <div className={`absolute ${isMobile ? 'left-0 right-0 mx-4' : 'left-0'} mt-2 w-48 bg-white/30 backdrop-blur-sm rounded-lg shadow-md py-1 text-sm text-white`}>
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
            
            {myUsername && (
              <>
                <div className="px-4 py-2 text-white/50 border-t border-white/10">내 사이트</div>
                <button
                  onClick={() => handleNavigation(`/${myUsername}`)}
                  className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors duration-200"
                >
                  {myUsername}
                </button>
              </>
            )}
            
            {allowedSites.length > 0 && (
              <>
                <div className="px-4 py-2 text-white/50 border-t border-white/10">초대된 사이트</div>
                {allowedSites.map((site, index) => (
                  <button
                    key={index}
                    onClick={() => handleNavigation(`/${site.username}`)}
                    className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors duration-200"
                  >
                    {site.username}
                  </button>
                ))}
              </>
            )}
            
            <div className="border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors duration-200 text-red-400"
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