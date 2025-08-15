'use client';

import { db } from '../../firebase';
import { collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { notFound, useParams } from 'next/navigation';
import { ComponentLibrary } from '@/components/edit/ComponentLibrary';
import Link from 'next/link';
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
import { X } from 'lucide-react';
import { useCallback } from 'react';
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

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
const getYouTubeVideoId = (url: string) => {
  if (!url) return null;
  
  // 일반 YouTube URL
  const normalMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (normalMatch) return normalMatch[1];
  
  // YouTube Shorts URL
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^&\s]+)/);
  if (shortsMatch) return shortsMatch[1];
  
  return url; // 이미 비디오 ID인 경우
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
          if (backgroundData.type === 'image' && backgroundData.value.startsWith('/')) {
            setContextBackground(backgroundData.type, backgroundData.value);
          } else if (backgroundData.type === 'image') {
            const url = await loadBackgroundFromStorage(backgroundData.value);
            if (!isSubscribed) return;
            setContextBackground(backgroundData.type, url);
          } else {
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

    return () => {
      isSubscribed = false;
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
        const videoId = getYouTubeVideoId(background.value);
        if (!videoId) return null;
        
        return (
          <>
            <div className="fixed inset-0 z-[-3] w-full h-full overflow-hidden pointer-events-none">
              <div className="relative w-full h-full flex items-center justify-center">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  className="absolute w-[300%] h-[300%] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                />
              </div>
            </div>
            <div className="fixed inset-0 z-[-2] bg-black/30 pointer-events-none" />
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
      <main className="min-h-screen flex flex-col items-center relative bg-black/70" style={getBackgroundStyles()}>
        <div className="absolute inset-0 z-0">
        {background.type !== 'none' && background.value && renderBackground()}
        </div>
        {isAnimationEnabled && (
          <ParticlesComponent />
        )}
        <div className="flex-grow flex flex-col items-center w-full z-10 relative">
          <div className="md:w-[1000px] w-full px-[10px] relative">   
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
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2">
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