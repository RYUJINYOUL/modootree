'use client';

// app/[username]/page.tsx
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
import Header from '@/components/Header';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import TranslateBanner from '@/app/components/ui/TranslateBanner';

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

  const [userData, setUserData] = useState<any>(null);
  const [components, setComponents] = useState<string[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<Array<{uid: string, email: string}>>([]);
  const [isAllowed, setIsAllowed] = useState(false);

  const handleBackgroundChange = async (type: string, value: string) => {
    if (!userData?.uid) {
      return;
    }

    try {
      const settingsDocRef = doc(db, 'users', userData.uid, 'settings', 'background');
      await setDoc(settingsDocRef, { type, value }, { merge: true });
      setContextBackground(type, value);
    } catch (error) {
      console.error('배경 설정 저장 중 오류 발생:', error);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        // 사용자 데이터 로드
        const userSnap = await getDoc(doc(db, 'usernames', username));
        
        if (!userSnap.exists()) {
          notFound();
          return;
        }

        const data = userSnap.data();
        const uid = data?.uid;
        setUserData({ ...data, uid });

        // 배경 설정과 링크 데이터를 병렬로 로드
        const settingsDocRef = doc(db, 'users', uid, 'settings', 'background');
        const [settingsSnap, linksSnap] = await Promise.all([
          getDoc(settingsDocRef),
          getDoc(doc(db, 'users', uid, 'links', 'page'))
        ]);

        // 배경 설정 처리
        if (settingsSnap.exists()) {
          const backgroundData = settingsSnap.data();
          setContextBackground(backgroundData.type, backgroundData.value);
        } else {
          // 기본 배경 이미지 설정
          try {
            const defaultImageRef = ref(storage, '/defaults/backgrounds/default-background.jpg');
            const url = await getDownloadURL(defaultImageRef);
            const defaultBackground = {
              type: 'image',
              value: url
            };
            await setDoc(settingsDocRef, defaultBackground);
            setContextBackground(defaultBackground.type, defaultBackground.value);
          } catch (error) {
            console.error('기본 배경 이미지 설정 실패:', error);
            // 이미지 설정 실패시 기본 색상으로 fallback
            const defaultBackground = {
              type: 'color',
              value: '#f5f5f5'
            };
            await setDoc(settingsDocRef, defaultBackground);
            setContextBackground(defaultBackground.type, defaultBackground.value);
          }
        }

        // 링크 데이터 설정
        setComponents(linksSnap.exists() ? linksSnap.data().components || [] : []);

        // 허용된 사용자 목록 실시간 업데이트
        const unsubscribe = onSnapshot(
          doc(db, 'users', uid, 'settings', 'permissions'),
          (doc) => {
            if (doc.exists()) {
              const allowedUsersData = doc.data().allowedUsers || [];
              setAllowedUsers(allowedUsersData);
              
              // 현재 사용자가 허용된 사용자인지 확인
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

        return () => unsubscribe();
      } catch (error) {
        console.error('데이터 로딩 중 오류 발생:', error);
      }
    }

    fetchData();
  }, [username, currentUser]);

  if (!userData) return null;

  const getBackgroundStyles = () => {
    const styles: { [key: string]: string } = {};

    switch (background.type) {
      case 'color':
        styles.backgroundColor = background.value;
        break;
      case 'gradient':
        styles.backgroundImage = background.value;
        break;
      case 'image':
        styles.backgroundColor = 'transparent';
        styles.backgroundImage = `url(${background.value})`;
        styles.backgroundSize = 'cover';
        styles.backgroundPosition = 'center';
        styles.backgroundRepeat = 'no-repeat';
        break;
      default:
        styles.backgroundColor = 'transparent';
    }

    return styles;
  };

  return (
    <>
      <Header />
      <TranslateBanner />
      <main className="min-h-screen flex flex-col items-center justify-center relative" style={getBackgroundStyles()}>
        {background.type === 'video' && (
          <>
            {(() => {
              const videoInfo = getVideoUrl(background.value, background.type);
              
              if (videoInfo?.type === 'youtube') {
                const videoId = videoInfo.url;
                return (
                  <div className="fixed inset-0 z-[-2] w-full h-full overflow-hidden pointer-events-none">
                    <iframe
                      key={videoId}
                      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&enablejsapi=1`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      className="w-[300%] h-[300%] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 min-w-[100%] min-h-[100%]"
                      style={{ border: 'none' }}
                    />
                  </div>
                );
              }
              
              if (videoInfo?.type === 'pixabay') {
                return (
                  <div className="fixed inset-0 z-[-2] w-full h-full overflow-hidden pointer-events-none">
                    <video
                      key={videoInfo.url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      controls={false}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ objectFit: 'cover' }}
                    >
                      <source 
                        src={videoInfo.url} 
                        type="video/mp4"
                      />
                    </video>
                  </div>
                );
              }
              
              return null;
            })()}
            <div 
              className="fixed inset-0 z-[-1] bg-black/30"
              style={{ pointerEvents: 'none' }}
            />
          </>
        )}
        <div className="flex-grow flex flex-col items-center justify-center w-full">
          <div className="md:w-[1000px] w-full px-[10px]">   
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
        <div className="w-full">
          {/* 배경 설정 버튼 */}
          {currentUser?.uid === userData.uid && (
            <div className="fixed top-[70px] right-5 z-50">
              <Link 
                href="/backgrounds"
                className="inline-flex items-center px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg shadow-md hover:bg-white/40 transition-colors text-white"
              >
                <span className="mr-2">🎨</span>
                배경 설정
              </Link>
            </div>
          )}
          <div className="h-[50px]"></div>
          <UserEditButton username={username} ownerUid={userData.uid} />
        </div>
      </main>
    </>
  );
}