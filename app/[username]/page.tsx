'use client';

import { db } from '../../firebase';
import { collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { ComponentLibrary } from '@/components/edit/ComponentLibrary';
import UserEditButton from '@/components/ui/UserEditButton';
import BackgroundSelector from '@/components/template/BackgroundSelector';
import { useBackground } from '@/components/providers';
import { useState, useEffect } from 'react';
import React from 'react';
import { useSelector } from 'react-redux';
import { getAuth } from 'firebase/auth';
import ComponentRenderer from '@/components/ComponentRenderer';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import TranslateBanner from '@/app/components/ui/TranslateBanner';
import Image from 'next/image';
import { X, Bell, Menu, ArrowRight } from 'lucide-react';
import MyInfoDrawer from '@/components/ui/MyInfoDrawer';
import { useCallback } from 'react';
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import { incrementVisitCount } from '@/lib/utils/visit-counter';

const ParticlesComponent = () => {
  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      className="absolute inset-0 z-[1]"
      init={particlesInit}
      options={{
        background: {
          opacity: 0
        },
        particles: {
          color: {
            value: ["#64B5F6", "#81C784", "#9575CD", "#4FC3F7", "#4DB6AC", "#7986CB"]
          },
          move: {
            direction: "none",
            enable: true,
            outModes: {
              default: "bounce"
            },
            random: false,
            speed: 2,
            straight: false
          },
          number: {
            density: {
              enable: true,
              area: 800
            },
            value: 30
          },
          opacity: {
            value: 0.4,
            animation: {
              enable: true,
              speed: 1,
              minimumValue: 0.1
            }
          },
          size: {
            value: { min: 5, max: 10 },
            animation: {
              enable: true,
              speed: 2,
              minimumValue: 3
            }
          },
          links: {
            color: "#ffffff",
            distance: 150,
            enable: true,
            opacity: 0.2,
            width: 1
          }
        }
      }}
    />
  );
};

// YouTube URL에서 비디오 ID를 추출하는 함수
// 디버그 로깅 함수
const log = (...args: any[]) => {
  console.warn('[DEBUG-YouTube]', ...args);
};

const getYouTubeVideoId = (url: string) => {
  if (!url) return null;
  
  try {
    log('URL 처리 시작:', url);
    // URL 객체 생성 시도
    const videoUrl = new URL(url);
    log('URL 파싱 결과:', {
      hostname: videoUrl.hostname,
      pathname: videoUrl.pathname,
      searchParams: Object.fromEntries(videoUrl.searchParams)
    });
    
    // youtube.com/shorts/ 형식
    if (videoUrl.pathname.includes('/shorts/')) {
      const shortsId = videoUrl.pathname.split('/shorts/')[1];
      const finalId = shortsId.split('?')[0];
      log('Shorts ID 추출:', finalId);
      return finalId;
    }
    
    // youtube.com/watch?v= 형식
    if (videoUrl.searchParams.has('v')) {
      const videoId = videoUrl.searchParams.get('v');
      log('Watch ID 추출:', videoId);
      return videoId;
    }
    
    // youtu.be/ 형식
    if (videoUrl.hostname === 'youtu.be') {
      const videoId = videoUrl.pathname.slice(1);
      log('Youtu.be ID 추출:', videoId);
      return videoId;
    }
    
    // 직접 비디오 ID를 입력한 경우
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      log('직접 입력된 ID:', url);
      return url;
    }
    
    log('추출된 비디오 ID가 없음:', url);
    return null;
  } catch (error) {
    log('YouTube URL 파싱 오류:', error);
    return null;
  }
};

// 비디오 URL 유효성 검사 및 변환 함수
const getVideoUrl = (url: string, type: string) => {
  if (!url) return { type: 'unknown', url: '' };
  
  // YouTube URL 처리
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = getYouTubeVideoId(url);
    return {
      type: 'youtube',
      url: videoId || ''
    };
  }
  
  // Pixabay URL 처리
  if (url.includes('pixabay.com') || url.endsWith('.mp4')) {
    return {
      type: 'pixabay',
      url: url
    };
  }
  
  return {
    type: 'unknown',
    url: url
  };
};

export default function UserPublicPage() {
  const params = useParams();
  if (!params || !params.username) {
    return null;
  }
  const username = params.username as string;
  const { background, setBackground: setContextBackground } = useBackground();
  const { currentUser } = useSelector((state: any) => state.user);
  const auth = getAuth();
  const [backgroundUrl, setBackgroundUrl] = useState<string>('');

  const [userData, setUserData] = useState<any>(null);
  const [components, setComponents] = useState<string[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<Array<{email: string}>>([]);
  const [isAllowed, setIsAllowed] = useState(false);
  const [showBottomButton, setShowBottomButton] = useState(true);
  const [isAnimationEnabled, setIsAnimationEnabled] = useState(true);
  const [isMyInfoOpen, setIsMyInfoOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 알림 개수 초기화 함수
  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const handleBackgroundChange = async (type: string, value: string) => {
    if (!userData?.uid) {
      return;
    }

    try {
      const settingsDocRef = doc(db, 'users', userData.uid, 'settings', 'background');
      const currentSettings = await getDoc(settingsDocRef);
      
      await setDoc(settingsDocRef, {
        type,
        value,
        animation: currentSettings.exists() ? currentSettings.data().animation : true
      });
      
      setContextBackground(type, value);
    } catch (error) {
      console.error('배경 설정 저장 중 오류 발생:', error);
    }
  };

  useEffect(() => {
    let isSubscribed = true;

    async function loadBackgroundFromStorage(path: string) {
      // 이미 완전한 URL인 경우 그대로 반환
      if (path.startsWith('http')) {
        return path;
      }
      
      try {
        const storageRef = ref(storage, path);
        const url = await getDownloadURL(storageRef);
        return url;
      } catch (error) {
        console.error('Error loading background from storage:', error);
        return '';
      }
    }

    async function fetchData() {
      try {
        // 먼저 username 문서 확인
        const userSnap = await getDoc(doc(db, 'usernames', username));
        
        if (!userSnap.exists()) {
          notFound();
          return;
        }

        const data = userSnap.data();
        const uid = data?.uid;
        
        // 방문자 수 증가
        await incrementVisitCount(uid);

        // users 컬렉션에서 추가 정보 가져오기
        const userDoc = await getDoc(doc(db, 'users', uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        if (!isSubscribed) return;
        setUserData({ 
          ...data, 
          ...userData,  // 이메일 등 추가 정보 포함
          uid 
        });

        // uid가 확인된 후 나머지 데이터 로드
        const [settingsSnap, linksSnap] = await Promise.all([
          getDoc(doc(db, 'users', uid, 'settings', 'background')),
          getDoc(doc(db, 'users', uid, 'links', 'page'))
        ]);

        if (!isSubscribed) return;

        // 배경 설정 처리
        if (settingsSnap.exists()) {
          const backgroundData = settingsSnap.data();
          setIsAnimationEnabled(backgroundData.animation ?? true);
          
          if (backgroundData.type === 'image') {
            if (backgroundData.value.startsWith('/')) {
              setContextBackground(backgroundData.type, backgroundData.value);
            } else {
              const url = await loadBackgroundFromStorage(backgroundData.value);
              if (!isSubscribed) return;
              if (url) {
                setContextBackground(backgroundData.type, url);
              }
            }
          } else if (backgroundData.type && backgroundData.value) {
            setContextBackground(backgroundData.type, backgroundData.value);
          }
        } else {
          // 기본 배경 설정
          if (!isSubscribed) return;
          await setDoc(doc(db, 'users', uid, 'settings', 'background'), {
            type: 'none',
            value: '',
            animation: true
          });
          setContextBackground('none', '');
        }

        // 링크 데이터 설정
        if (!isSubscribed) return;
        setComponents(linksSnap.exists() ? linksSnap.data().components || [] : []);

        // 권한 설정은 실시간 업데이트가 필요한 경우에만 구독
        if ((auth.currentUser || currentUser) && isSubscribed) {
          const unsubscribe = onSnapshot(
            doc(db, 'users', uid, 'settings', 'permissions'),
            (doc) => {
              if (!isSubscribed) return;
              if (doc.exists()) {
                const allowedUsersData = doc.data().allowedUsers || [];
                setAllowedUsers(allowedUsersData);
                
                const user = auth.currentUser || currentUser;
                if (user) {
                  const isUserAllowed = allowedUsersData.some(
                    (allowedUser: { email: string }) => allowedUser.email === user.email
                  );
                  setIsAllowed(isUserAllowed);
                }
              }
            }
          );

          return () => {
            unsubscribe();
            isSubscribed = false;
          };
        }
      } catch (error) {
        console.error('데이터 로딩 중 오류 발생:', error);
        // 에러 발생 시 NO_SETTING_BACKGROUND 사용
        if (!isSubscribed) return;
        setContextBackground('none', '');
        setIsAnimationEnabled(true);
      }
    }

    fetchData();

    // 알림 개수 실시간 업데이트
    let unsubscribeNotifications: Array<() => void> = [];

    if (userData?.uid) {
      // 알림 개수 초기화
      resetUnreadCount();
      // 1. 내 알림 구독
      unsubscribeNotifications.push(
        onSnapshot(
          doc(db, 'users', userData.uid, 'notifications', 'list'),
          (docSnapshot) => {
            if (docSnapshot.exists()) {
              const notificationsData = docSnapshot.data().notifications || {};
              const unreadNotifications = Object.values(notificationsData)
                .filter((notification: any) => notification && !notification.readAt);
              setUnreadCount(prev => prev + unreadNotifications.length);
            }
          }
        )
      );

      // 2. 구독 중인 페이지의 알림 구독
      const unsubscribeSubscriptions = onSnapshot(
        doc(db, 'users', userData.uid, 'settings', 'subscriptions'),
        async (subscriptionsDoc) => {
          // 이전 구독 해제
          unsubscribeNotifications.forEach(unsub => unsub());
          unsubscribeNotifications = [];

          // 내 알림 다시 구독
          unsubscribeNotifications.push(
            onSnapshot(
              doc(db, 'users', userData.uid, 'notifications', 'list'),
              (docSnapshot) => {
                if (docSnapshot.exists()) {
                  const notificationsData = docSnapshot.data().notifications || {};
                  const unreadNotifications = Object.values(notificationsData)
                    .filter((notification: any) => notification && !notification.readAt);
                  setUnreadCount(prev => prev + unreadNotifications.length);
                }
              }
            )
          );

          // 구독 중인 페이지의 알림 구독
          if (subscriptionsDoc.exists()) {
            const subscribedPages = subscriptionsDoc.data().subscribedPages || {};
            
            Object.entries(subscribedPages).forEach(([pageOwnerId, pageData]: [string, any]) => {
              unsubscribeNotifications.push(
                onSnapshot(
                  doc(db, 'users', pageOwnerId, 'notifications', 'list'),
                  (notificationsDoc) => {
                    if (notificationsDoc.exists()) {
                      const notificationsData = notificationsDoc.data().notifications || {};
                      const unreadNotifications = Object.values(notificationsData)
                        .filter((notification: any) => notification && !notification.readAt);
                      setUnreadCount(prev => prev + unreadNotifications.length);
                    }
                  }
                )
              );
            });
          }
        }
      );

      unsubscribeNotifications.push(unsubscribeSubscriptions);
    }

    return () => {
      isSubscribed = false;
      unsubscribeNotifications.forEach(unsub => unsub());
    };
  }, [username, currentUser, auth.currentUser]);

  if (!userData) return null;

  const getBackgroundStyles = () => {
    const styles: { [key: string]: string } = {};
    
    if (background.type === 'color') {
      styles.backgroundColor = background.value;
      return styles;
    }
    
    if (background.type === 'gradient') {
      styles.backgroundImage = background.value;
      return styles;
    }

    styles.backgroundColor = 'transparent';
    return styles;
  };

  const renderBackground = () => {
    if (background.type === 'url' && background.value) {
      // YouTube 비디오 URL 처리
      if (background.value.includes('youtube.com') || background.value.includes('youtu.be')) {
        log('YouTube 배경 처리 시작');
        const videoId = getYouTubeVideoId(background.value);
        log('최종 Video ID:', videoId);
        if (!videoId) {
          log('Video ID가 없어 배경 처리 중단');
          return null;
        }
        
        return (
          <>
            <div className="fixed inset-0 z-[-3] w-full h-full overflow-hidden pointer-events-none">
              <div className="relative w-full h-full">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0&showinfo=0&modestbranding=1&iv_load_policy=3&enablejsapi=1&origin=${window.location.origin}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  sandbox="allow-same-origin allow-scripts allow-presentation"
                  className="absolute w-[150%] h-[150%] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                  style={{ border: 'none' }}
                  onLoad={() => log('iframe 로드 완료, URL:', `https://www.youtube.com/embed/${videoId}`)}
                  onError={(e) => log('iframe 로드 실패:', e)}
                />
              </div>
            </div>
            <div className="fixed inset-0 z-[-2] bg-black/50 pointer-events-none" />
          </>
        );
      }
      // 픽사베이 비디오 URL 처리
      else if (background.value.includes('pixabay.com')) {
        return (
          <>
            <div className="fixed inset-0 z-[-3] w-full h-full overflow-hidden pointer-events-none">
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  src={background.value}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="fixed inset-0 z-[-2] bg-black/30 pointer-events-none" />
          </>
        );
      }
    }
    // 이미지 배경 처리
    else if (background.type === 'image' && background.value && background.value !== '') {
      return (
        <>
          <div className="fixed inset-0 z-[-3] w-full h-full overflow-hidden pointer-events-none">
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={background.value}
                alt="background"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="fixed inset-0 z-[-2] bg-black/30 pointer-events-none" />
        </>
      );
    }

    return null;
  };

  return (
    <>
      <TranslateBanner />
       <div className="absolute top-4 left-0 right-0 z-50">
         <div className="w-full max-w-[1000px] mx-auto md:px-[24px]">
           <div className="flex justify-between px-[10px] md:px-0">
            <button
              onClick={() => setIsMyInfoOpen(true)}
              className="flex items-center justify-center w-9 h-9 bg-white/50 backdrop-blur-sm rounded-full hover:bg-white/90 transition-all shadow-lg relative"
            >
              <Image 
                src={userData?.bellIcon || "/Image/sns/bell-icon.png"}
                alt="알림"
                width={20}
                height={20}
                className="w-5 h-5 object-contain"
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex items-center justify-center w-9 h-9 bg-white/50 backdrop-blur-sm rounded-full hover:bg-white/90 transition-all shadow-lg"
            >
              <Image 
                src={userData?.menuIcon || "/Image/sns/menu-icon.png"}
                alt="메뉴"
                width={20}
                height={20}
                className="w-5 h-5 object-contain"
              />
            </button>

            {/* 전체 화면 메뉴 오버레이 */}
            <div 
              className={`fixed inset-0 bg-black/90 backdrop-blur-md z-[100] transition-all duration-500 ${
                isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* 닫기 버튼 */}
              <button
                onClick={() => setIsMenuOpen(false)}
                className="absolute top-4 right-4 md:right-[calc((100%-1000px)/2+18px)] flex items-center justify-center w-9 h-9 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* 메뉴 컨텐츠 */}
              <div className="w-full max-w-[1000px] mx-auto h-full px-[18px] pt-20">
                <div className={`transform transition-all duration-500 ${
                  isMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}>
                  <nav className="flex flex-col gap-6">
                    <Link 
                      href="/feed"
                      className="group relative flex items-center justify-between px-5 py-2.5 bg-white/[0.02] hover:bg-white/10 rounded-xl transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <img src="/logos/feed.png" alt="피드" className="w-6 h-6" />
                        <div className="flex flex-col">
                          <span className="text-lg md:text-xl font-light text-white/90 group-hover:text-white">피드</span>
                          <span className="h-px w-0 group-hover:w-full bg-white/70 transition-all duration-500 mt-0.5"></span>
                        </div>
                      </div>
                      <span className="text-xl text-white/50 group-hover:text-white transform translate-x-0 group-hover:translate-x-2 transition-all duration-300">›</span>
                    </Link>
                    <Link 
                      href="/likes/all"
                      className="group relative flex items-center justify-between px-5 py-2.5 bg-white/[0.02] hover:bg-white/10 rounded-xl transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <img src="/logos/ai1.png" alt="공감" className="w-6 h-6" />
                        <div className="flex flex-col">
                          <span className="text-lg md:text-xl font-light text-white/90 group-hover:text-white">공감 한조각</span>
                          <span className="h-px w-0 group-hover:w-full bg-white/70 transition-all duration-500 mt-0.5"></span>
                        </div>
                      </div>
                      <span className="text-xl text-white/50 group-hover:text-white transform translate-x-0 group-hover:translate-x-2 transition-all duration-300">›</span>
                    </Link>
                    <Link 
                      href="/photo-story"
                      className="group relative flex items-center justify-between px-5 py-2.5 bg-white/[0.02] hover:bg-white/10 rounded-xl transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <img src="/logos/ai2.png" alt="사진" className="w-6 h-6" />
                        <div className="flex flex-col">
                          <span className="text-lg md:text-xl font-light text-white/90 group-hover:text-white">사진 스토리</span>
                          <span className="h-px w-0 group-hover:w-full bg-white/70 transition-all duration-500 mt-0.5"></span>
                        </div>
                      </div>
                      <span className="text-xl text-white/50 group-hover:text-white transform translate-x-0 group-hover:translate-x-2 transition-all duration-300">›</span>
                    </Link>
                    <Link 
                      href="/modoo-ai"
                      className="group relative flex items-center justify-between px-5 py-2.5 bg-white/[0.02] hover:bg-white/10 rounded-xl transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <img src="/logos/ai3.png" alt="사연" className="w-6 h-6" />
                        <div className="flex flex-col">
                          <span className="text-lg md:text-xl font-light text-white/90 group-hover:text-white">사연 한조각</span>
                          <span className="h-px w-0 group-hover:w-full bg-white/70 transition-all duration-500 mt-0.5"></span>
                        </div>
                      </div>
                      <span className="text-xl text-white/50 group-hover:text-white transform translate-x-0 group-hover:translate-x-2 transition-all duration-300">›</span>
                    </Link>
                    <Link 
                      href="/inquiry"
                      className="group relative flex items-center justify-between px-5 py-2.5 bg-white/[0.02] hover:bg-white/10 rounded-xl transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <img src="/logos/ai4.png" alt="문의" className="w-6 h-6" />
                        <div className="flex flex-col">
                          <span className="text-lg md:text-xl font-light text-white/90 group-hover:text-white">문의 게시판</span>
                          <span className="h-px w-0 group-hover:w-full bg-white/70 transition-all duration-500 mt-0.5"></span>
                        </div>
                      </div>
                      <span className="text-xl text-white/50 group-hover:text-white transform translate-x-0 group-hover:translate-x-2 transition-all duration-300">›</span>
                    </Link>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
        <MyInfoDrawer 
          isOpen={isMyInfoOpen}
          onClose={() => setIsMyInfoOpen(false)}
          ownerUid={userData.uid}
          ownerUsername={username}
        />
      </div>
      <main className="min-h-screen flex flex-col items-center relative bg-black/70" style={getBackgroundStyles()}>
        <div className="absolute inset-0 z-0">
        {background.type !== 'none' && background.value && renderBackground()}
        </div>
        {isAnimationEnabled && (
          <ParticlesComponent />
        )}
        <div className="flex-grow flex flex-col items-center w-full z-10 relative">
          <div className="md:w-[1000px] w-full md:px-[10px] relative">   
            {components.map((component, index) => (
              <ComponentRenderer
                key={index}
                type={component}
                uid={userData.uid}
                username={username}
                isEditable={false}
                isAllowed={isAllowed}
              />
            ))}
          </div>
        </div>
        <div className="w-full z-10">
          <div className="h-[50px]"></div>
          <UserEditButton 
            username={username} 
            ownerUid={userData.uid} 
            userEmail={userData.email}  // 이메일 추가
          />
          
          {/* 하단 버튼 */}
          {showBottomButton && (
            <div className="fixed bottom-[25px] left-1/2 -translate-x-1/2 z-50 flex items-center gap-2">
              <Link
                href="/"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white/30 backdrop-blur-sm rounded-full hover:bg-white/70 transition-all shadow-lg whitespace-nowrap"
              >
                <Image
                  src="/Image/logo.png"
                  alt="ModooTree Logo"
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
                <span className="text-black text-sm">모두트리 무료페이지 만들기</span>
              </Link>
              <button
                onClick={() => setShowBottomButton(false)}
                className="p-1.5 bg-white/30 backdrop-blur-sm rounded-full hover:bg-white/70 transition-all"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}