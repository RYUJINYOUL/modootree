"use client";

import { useSelector } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import { getAuth, signOut } from 'firebase/auth';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from '@/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { ChevronUp, ChevronDown, X } from 'lucide-react';

export default function Header() {
  const user = useSelector((state: any) => state.user);
  const router = useRouter();
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [allowedSites, setAllowedSites] = useState<Array<{username: string}>>([]);
  const [myUsername, setMyUsername] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);  // 푸터 표시 상태
  
  // 메인페이지, 로그인, 회원가입, 문의하기 페이지에서는 헤더를 숨김
  const isMainPage = pathname === '/';
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isInquiryPage = pathname === '/inquiry';

  if (isMainPage || isAuthPage || isInquiryPage) {
    return null;
  }

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
          if (!emailData.email) continue; // 이메일이 없는 경우 건너뛰기
          
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
      // 특별 경로들은 바로 이동
      if (path === '/' || 
          path === '/likes/all' || 
          path === '/login' || 
          path === '/register' ||
          path === '/inquiry') {
        setShowDropdown(false);
        router.push(path);
        return;
      }

      // username 체크는 사용자 페이지 경로에만 적용
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

  if (!mounted) return null;

  if (!isVisible) return null;

  return (
    <header className="fixed top-1/2 left-5 -translate-y-1/2 z-50">
      <div className="relative">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="inline-flex items-center px-3 py-1.5 bg-white/30 backdrop-blur-sm rounded-lg shadow-md hover:bg-white/40 transition-colors"
          >
            <Image
              src="/Image/logo.png"
              alt="모두트리 로고"
              width={120}
              height={120}
              className="w-4 h-4"
            />
            <svg
              className={`w-3 h-3 text-white ml-1.5 transition-transform duration-200 ${
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
          <button
            onClick={() => setIsVisible(false)}
            className="p-1.5 bg-white/30 backdrop-blur-sm rounded-lg shadow-md hover:bg-white/40 transition-colors"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>

        {showDropdown && (
          <div className={`absolute ${isMobile ? 'left-0 right-0 mx-4' : 'left-0'} mt-2 w-48 bg-white/30 backdrop-blur-sm rounded-lg shadow-md py-1 text-sm text-white`}>
            {/* 기본 메뉴 - 로그인 상태와 관계없이 항상 표시 */}
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

            {/* 로그인한 경우에만 표시되는 메뉴 */}
            {user?.currentUser?.uid ? (
              <>
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
              </>
            ) : (
              // 로그아웃 상태일 때 보여줄 로그인 버튼
              <div className="border-t border-white/10">
                <button
                  onClick={() => handleNavigation('/login')}
                  className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors duration-200 text-blue-400"
                >
                  로그인
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
} 