'use client';

import { useSelector } from 'react-redux';
import { useState, useCallback, useEffect } from 'react';
import { Menu, Home, Notebook, Book, MessageSquare, ClipboardPlus, Atom, X, Maximize2, Minimize2, ArrowLeft, Download, Link as LinkIcon, Banana, Rocket, Edit3, Glasses } from 'lucide-react';
import { useState as useModalState } from 'react';
import ProfileSettingsButton from '@/components/ui/ProfileSettingsButton';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

interface Background {
  type: 'color' | 'gradient' | 'image' | 'video' | 'none';
  value: string;
  animation: boolean;
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useSelector((state: any) => state.user);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [localUser, setLocalUser] = useState<any>(null);
  const [background, setBackground] = useState<Background | null>(null);
  const [isAIChatOpen, setIsAIChatOpen] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPWAButton, setShowPWAButton] = useState(false);
  const [showInstallSnackbar, setShowInstallSnackbar] = useState(false);
  const [username, setUsername] = useState<string>('');
  const pathname = usePathname();
  const router = useRouter();

  // 페이지 변경 시 AI 채팅 닫기
  useEffect(() => {
    setIsAIChatOpen(false);
    setIsFullScreen(false);
  }, [pathname]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLocalUser(user);
      } else {
        setLocalUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // PWA 설치 이벤트 리스너
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPWAButton(true);
    };

    const handleAppInstalled = () => {
      setShowPWAButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 이미 설치된 경우 체크
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPWAButton(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // 프로필 페이지 방문 시 스낵바 표시 로직
  useEffect(() => {
    // 프로필 페이지가 아니면 리턴
    if (pathname !== '/profile') {
      setShowInstallSnackbar(false);
      return;
    }

    // PWA 설치 불가능하면 리턴
    if (!deferredPrompt) return;

    // 이미 설치된 경우 리턴
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // 하루 1회 제한 체크
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('pwa-snackbar-last-shown');
    const dismissed = localStorage.getItem('pwa-snackbar-dismissed');

    if (lastShown === today || dismissed === 'true') return;

    // 10초 후 스낵바 표시
    const timer = setTimeout(() => {
      setShowInstallSnackbar(true);
      localStorage.setItem('pwa-snackbar-last-shown', today);
    }, 10000);

    return () => clearTimeout(timer);
  }, [pathname, deferredPrompt]);

  // PWA 설치 함수
  const handlePWAInstall = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA 설치 승인됨');
      } else {
        console.log('PWA 설치 거부됨');
      }
      
      setDeferredPrompt(null);
      setShowPWAButton(false);
      setShowInstallSnackbar(false);
    } catch (error) {
      console.error('PWA 설치 오류:', error);
    }
  };

  // 스낵바 닫기 함수
  const handleCloseSnackbar = () => {
    setShowInstallSnackbar(false);
    localStorage.setItem('pwa-snackbar-dismissed', 'true');
  };

  // Glasses 버튼 클릭 핸들러
  const handleGlassesClick = () => {
    if (username) {
      router.push(`/`);
    } else {
      router.push('/');
    }
  };

  // 사용자 이름 가져오기
  useEffect(() => {
    const fetchUsername = async () => {
      if (!currentUser?.uid) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUsername(userDoc.data().username || '');
        }
      } catch (error) {
        console.error('Error fetching username:', error);
      }
    };

    fetchUsername();
  }, [currentUser?.uid]);

  // 배경 설정 실시간 감지
  useEffect(() => {
    if (!currentUser?.uid) return;

    const docRef = doc(db, 'users', currentUser.uid, 'settings', 'profileBackground');
    
    // 실시간 리스너 설정
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setBackground(docSnap.data() as Background);
      } else {
        setBackground(null);
      }
    }, (error) => {
      console.error('Error fetching background:', error);
    });

    // 컴포넌트 언마운트 시 리스너 해제
    return () => unsubscribe();
  }, [currentUser?.uid]);

  const particlesInit = useCallback(async (engine: any) => {
    await loadFull(engine);
  }, []);

  const menuItems = [
    { icon: Home, label: '홈', href: '/profile' },
    { icon: Notebook, label: '메모', href: '/profile/memo' },
    { icon: Book, label: '일기', href: '/profile/diary' },
    { icon: LinkIcon, label: '링크', href: '/profile/links' },
    // { icon: ClipboardPlus, label: '건강', href: '/profile/health' }, // 건강 카테고리 미노출
    // { icon: Atom, label: '분석', href: '/profile/mind' }, // 분석 카테고리 미노출
    // { icon: MessageSquare, label: '기록', href: '/profile/chats' },
    { icon: Rocket, label: '문의', href: '/profile/inquiry' },
  ];

  // 배경 스타일 생성
  const getBackgroundStyle = () => {
    if (!background) return {};

    switch (background.type) {
      case 'color':
        return { backgroundColor: background.value };
      case 'gradient':
        return { background: background.value };
      case 'image':
        return { 
          backgroundImage: `url(${background.value})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        };
      default:
        return {};
    }
  };

  // 기본 배경과 사용자 설정 배경 병합
  const combinedStyle = {
    ...{
      background: background?.type === 'none' || !background 
        ? 'linear-gradient(135deg, #358f80 0%, #469d89 50%, #56ab91 100%)'
        : undefined
    },
    ...getBackgroundStyle()
  };

  const renderMenuItems = (isDesktop = false) => (
    <div className="space-y-2">
      {menuItems.map((item, index) => (
        <Link
          key={index}
          href={item.href}
          onClick={() => !isDesktop && setIsSidebarOpen(false)}
          className={`flex items-center ${isDesktop && !isDesktopSidebarOpen ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-lg transition-colors ${
            pathname === item.href
              ? 'bg-[#56ab91] text-white'
              : 'text-gray-300 hover:text-white hover:bg-[#358f80]/50'
          }`}
          title={!isDesktopSidebarOpen && isDesktop ? item.label : undefined}
        >
          <item.icon className="w-5 h-5" />
          {(isDesktop ? isDesktopSidebarOpen : true) && <span>{item.label}</span>}
        </Link>
      )      )}

    </div>
  );

  if (!currentUser && !localUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#358f80] text-white p-4">
        <h1 className="text-2xl font-bold mb-4">로그인이 필요합니다</h1>
        <Link 
          href="/login"
          className="bg-[#56ab91] hover:bg-[#469d89] text-white px-6 py-2 rounded-lg transition-colors"
        >
          로그인하기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen relative" style={combinedStyle}>
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/10" />
      <Particles
        className="fixed inset-0 z-[1] pointer-events-none"
        init={particlesInit}
        options={{
          fpsLimit: 120,
          particles: {
            color: {
              value: ["#ffffff", "#E3F2F1", "#C5E4DE"]
            },
            links: {
              color: "#ffffff",
              distance: 150,
              enable: true,
              opacity: 0.05,
              width: 1,
            },
            collisions: {
              enable: false,
            },
            move: {
              direction: "none",
              enable: true,
              outModes: {
                default: "out"
              },
              random: true,
              speed: { min: 0.05, max: 0.1 },
              straight: false,
              attract: {
                enable: true,
                rotate: {
                  x: 600,
                  y: 1200
                }
              }
            },
            number: {
              density: {
                enable: true,
                area: 800
              },
              value: 80
            },
            opacity: {
              animation: {
                enable: true,
                minimumValue: 0.1,
                speed: 1,
                sync: false
              },
              random: true,
              value: { min: 0.1, max: 0.4 }
            },
            shape: {
              type: "circle"
            },
            size: {
              animation: {
                enable: true,
                minimumValue: 0.1,
                speed: 2,
                sync: false
              },
              random: true,
              value: { min: 1, max: 2 }
            },
            twinkle: {
              lines: {
                enable: true,
                frequency: 0.001,
                opacity: 0.1,
                color: {
                  value: ["#ffffff", "#E3F2F1"]
                }
              },
              particles: {
                enable: true,
                frequency: 0.02,
                opacity: 0.3
              }
            }
          },
          detectRetina: true
        }}
      />
      {/* 사이드바 - 데스크톱 */}
      <div className={`hidden md:flex ${isDesktopSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-[#2A4D45]/80 backdrop-blur-sm border-r border-[#358f80]/30 relative z-10`}>
        {/* 토글 버튼 */}
        <button
          onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
          className="absolute -right-3 top-6 w-6 h-12 bg-[#358f80] hover:bg-[#469d89] border border-[#358f80]/30 rounded-r-lg flex items-center justify-center text-white transition-colors"
        >
          {isDesktopSidebarOpen ? '←' : '→'}
        </button>

        <div className="flex flex-col w-full">
          <div className={`p-6 border-b border-[#358f80]/30 ${!isDesktopSidebarOpen && 'px-4'}`}>
            <div className="flex flex-col">
              {isDesktopSidebarOpen ? (
                <p className="text-md text-white truncate">{localUser?.email || currentUser?.email}</p>
              ) : (
                <p className="text-md text-white text-center">{(localUser?.email || currentUser?.email)?.charAt(0)}</p>
              )}
            </div>
          </div>
          <nav className="flex-1 p-4">
            {renderMenuItems(true)}
            
            {/* PWA 설치 버튼 */}
            {showPWAButton && (
              <div className="mt-4 pt-4 border-t border-[#358f80]/30">
                <button
                  onClick={handlePWAInstall}
                  className={`w-full flex items-center ${isDesktopSidebarOpen ? 'space-x-3 px-4' : 'justify-center px-2'} py-3 rounded-lg transition-colors bg-[#56ab91]/20 hover:bg-[#56ab91]/40 text-[#56ab91] hover:text-white border border-[#56ab91]/30`}
                  title="앱 설치하기"
                >
                  <Download className="w-5 h-5 flex-shrink-0" />
                  {isDesktopSidebarOpen && (
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">앱 설치</span>
                      <span className="text-xs opacity-75">로딩 중에도 설치 가능</span>
                    </div>
                  )}
                </button>
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* 모바일 전체화면 메뉴 */}
      <div 
        className={`fixed inset-0 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:hidden bg-[#2A4D45]/95 backdrop-blur-sm transition-transform duration-200 ease-out z-[60]`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-[#358f80]/30">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <p className="text-lg text-white truncate">{localUser?.email || currentUser?.email}</p>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="text-gray-400 hover:text-white p-2 rounded-lg active:bg-white/10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <nav className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-2">
              {menuItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    pathname === item.href
                      ? 'bg-[#56ab91] text-white'
                      : 'text-gray-300 hover:text-white hover:bg-[#358f80]/50'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
              
              {/* PWA 설치 버튼 */}
              {showPWAButton && (
                <div className="mt-4 pt-4 border-t border-[#358f80]/30">
                  <button
                    onClick={handlePWAInstall}
                    className="w-full flex items-center px-4 py-3 rounded-lg transition-colors bg-[#56ab91]/20 hover:bg-[#56ab91]/40 text-[#56ab91] hover:text-white border border-[#56ab91]/30"
                  >
                    <Download className="w-5 h-5 mr-3" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">앱 설치</span>
                      <span className="text-xs opacity-75">로딩 중에도 설치 가능</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col">
        {/* 상단 바 - 모바일에서만 표시 */}
        <button 
          onClick={() => setIsSidebarOpen(true)} 
          className="md:hidden fixed top-2 left-2 z-40 text-gray-300 hover:text-white p-2 rounded-lg bg-[#2A4D45]/80 backdrop-blur-sm border border-[#358f80]/30 active:bg-[#2A4D45] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Glasses 버튼 */}
        <button 
          onClick={handleGlassesClick}
          className="md:hidden fixed top-2 left-12 z-40 text-gray-300 hover:text-white p-2 rounded-lg bg-[#2A4D45]/80 backdrop-blur-sm border border-[#358f80]/30 active:bg-[#2A4D45] transition-colors"
        >
          <Glasses className="w-5 h-5" />
        </button>

        {/* 데스크톱 Glasses 버튼 */}
        <button 
          onClick={handleGlassesClick}
          className="hidden md:block fixed top-3 right-16 z-40 text-gray-300 hover:text-white p-1 rounded-lg bg-[#2A4D45]/80 backdrop-blur-sm border border-[#358f80]/30 hover:bg-[#2A4D45] transition-colors shadow-lg"
        >
          <Glasses className="w-6 h-6" />
        </button>

        {/* 모바일 작성 버튼 */}
        <Link 
          href="/profile/freememo"
          className="md:hidden fixed top-2 right-2 z-40 text-gray-300 hover:text-white p-2 rounded-lg bg-[#2A4D45]/80 backdrop-blur-sm border border-[#358f80]/30 active:bg-[#2A4D45] transition-colors"
        >
          <Edit3 className="w-5 h-5" />
        </Link>

        {/* 데스크톱 작성 버튼 */}
        <Link 
          href="/profile/freememo"
          className="hidden md:block fixed top-3 right-6 z-40 text-gray-300 hover:text-white p-1 rounded-lg bg-[#2A4D45]/80 backdrop-blur-sm border border-[#358f80]/30 hover:bg-[#2A4D45] transition-colors shadow-lg"
        >
          <Edit3 className="w-6 h-6" />
        </Link>

        {/* 자식 컴포넌트 렌더링 */}
        <div className="flex-1 md:p-6 py-6 overflow-auto relative">
          {/* 배경이 이미지일 때 오버레이 추가 */}
          {background?.type === 'image' && (
            <div className="absolute inset-0 bg-black/10" />
          )}
          
          {/* 컨텐츠 */}
          <div className="relative z-10">
            {children}
            <ProfileSettingsButton />
          </div>
        </div>
      </div>

      {/* 모바일 사이드바 오버레이 */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* AI 플로팅 버튼 */}
      {/* <button
        onClick={() => setIsAIChatOpen(true)}
        className="fixed bottom-4 right-4 z-[40] w-10 h-10 bg-[#56ab91]/60 rounded-full flex items-center justify-center shadow-lg hover:bg-[#56ab91]/80 transition-all group hover:scale-110 hover:shadow-xl active:scale-95 ring-2 ring-[#358f80]/50"
      >
        <span className="text-white font-medium text-base">AI</span>
      </button> */}

      {/* AI 채팅 슬라이드 패널 */}
      {/* 데스크톱 패널 */}
      <div
        className={`fixed top-0 right-0 w-1/4 h-full transform transition-all duration-300 ease-in-out z-50 bg-[#2A4D45]/95 backdrop-blur-sm border-l border-[#358f80]/30
          ${isFullScreen ? 'w-full left-0' : 'w-1/4'}
          ${isAIChatOpen ? 'translate-x-0' : 'translate-x-full'}
          hidden md:block
        `}
      >
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-[#358f80]/30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.history.back()}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#358f80]/30 transition-colors"
                title="뒤로가기"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-white">AI 채팅</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#358f80]/30"
              >
                {isFullScreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => {
                  setIsAIChatOpen(false);
                  setIsFullScreen(false);
                }}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#358f80]/30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 채팅 영역 */}
          <div className="flex-1 p-4 overflow-y-auto">
            <iframe
              src="/ai-comfort"
              className="w-full h-full border-0 bg-transparent"
              title="AI Chat"
            />
          </div>
        </div>
      </div>

      {/* 모바일 패널 */}
      <div
        className={`fixed bottom-0 left-0 right-0 h-[80vh] transform transition-all duration-300 ease-in-out z-50 bg-[#2A4D45]/95 backdrop-blur-sm border-t border-[#358f80]/30 rounded-t-xl
          ${isFullScreen ? 'h-full top-0 rounded-none' : 'h-[80vh]'}
          ${isAIChatOpen ? 'translate-y-0' : 'translate-y-full'}
          block md:hidden
        `}
      >
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-[#358f80]/30">
            <h2 className="text-lg font-semibold text-white">AI 채팅</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#358f80]/30"
              >
                {isFullScreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => {
                  setIsAIChatOpen(false);
                  setIsFullScreen(false);
                }}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#358f80]/30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 채팅 영역 */}
          <div className="flex-1 p-4 overflow-y-auto">
            <iframe
              src="/ai-comfort"
              className="w-full h-full border-0 bg-transparent"
              title="AI Chat"
            />
          </div>
        </div>
      </div>

      {/* PWA 설치 스낵바 */}
      {showInstallSnackbar && (
        <div className="fixed bottom-4 left-4 right-4 bg-[#2A4D45]/95 backdrop-blur-sm border border-[#358f80]/30 text-white p-4 rounded-lg shadow-lg z-[60] animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#56ab91]/20 rounded-lg flex items-center justify-center">
                <span className="text-xl">📱</span>
              </div>
              <div>
                <p className="font-medium text-sm">모두트리 앱 설치</p>
                <p className="text-xs text-gray-300 mt-1">홈 화면에 추가하여 더 편리하게 이용하세요</p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={handlePWAInstall}
                className="bg-[#56ab91] hover:bg-[#469d89] text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                설치
              </button>
              <button
                onClick={handleCloseSnackbar}
                className="text-gray-400 hover:text-white p-1 rounded transition-colors"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}