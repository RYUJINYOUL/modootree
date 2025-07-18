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

const DEFAULT_BACKGROUND = {
  type: 'image',
  value: 'https://firebasestorage.googleapis.com/v0/b/mtree-e0249.firebasestorage.app/o/backgrounds%2F1752324410072_leaves-8931849_1920.jpg?alt=media&token=bda5d723-d54d-43d5-8925-16aebeec8cfa'
};

const NO_SETTING_BACKGROUND = {
  type: 'image',
  value: 'https://firebasestorage.googleapis.com/v0/b/mtree-e0249.firebasestorage.app/o/backgrounds%2F1752324791928_watercolor-5062356_1920.jpg?alt=media&token=d911e094-0017-410b-a317-daf250cebcca'
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
        if (!isSubscribed) return;
        setUserData({ ...data, uid });

        // uid가 확인된 후 나머지 데이터 로드
        const [settingsSnap, linksSnap] = await Promise.all([
          getDoc(doc(db, 'users', uid, 'settings', 'background')),
          getDoc(doc(db, 'users', uid, 'links', 'page'))
        ]);

        if (!isSubscribed) return;

        // 배경 설정 처리
        if (settingsSnap.exists()) {
          const backgroundData = settingsSnap.data();
          if (backgroundData.type === 'image' && backgroundData.value.startsWith('/')) {
            // 로컬 이미지인 경우 바로 설정
            setContextBackground(backgroundData.type, backgroundData.value);
          } else if (backgroundData.type === 'image') {
            // Storage 이미지인 경우에만 URL 가져오기
            const url = await loadBackgroundFromStorage(backgroundData.value);
            if (!isSubscribed) return;
            setContextBackground(backgroundData.type, url);
          } else {
            setContextBackground(backgroundData.type, backgroundData.value);
          }
        } else {
          // 기본 배경 설정
          if (!isSubscribed) return;
          setContextBackground('image', DEFAULT_BACKGROUND.value);
          await setDoc(doc(db, 'users', uid, 'settings', 'background'), DEFAULT_BACKGROUND);
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
        setContextBackground('image', NO_SETTING_BACKGROUND.value);
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
    if (background.type === 'url') {
      // YouTube 비디오 URL 처리
      if (background.value.includes('youtube.com') || background.value.includes('youtu.be')) {
        const videoId = getYouTubeVideoId(background.value);
        return (
          <>
            <div className="fixed inset-0 z-[-2] w-full h-full overflow-hidden pointer-events-none">
              <div className="relative w-full h-full flex items-center justify-center">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  className="absolute w-[300%] h-[300%] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                />
              </div>
            </div>
            <div className="fixed inset-0 z-[-1] bg-black/30 pointer-events-none" />
          </>
        );
      }
      // 픽사베이 비디오 URL 처리
      else if (background.value.includes('pixabay.com')) {
        return (
          <>
            <div className="fixed inset-0 z-[-2] w-full h-full overflow-hidden pointer-events-none">
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
            <div className="fixed inset-0 z-[-1] bg-black/30 pointer-events-none" />
          </>
        );
      }
    }
    // 이미지 배경 처리
    else if (background.type === 'image') {
      return (
        <>
          <div className="fixed inset-0 z-[-2] w-full h-full overflow-hidden pointer-events-none">
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={background.value}
                alt="background"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="fixed inset-0 z-[-1] bg-black/30 pointer-events-none" />
        </>
      );
    }

    return null;
  };

  return (
    <>
      <Header />
      <TranslateBanner />
      <main className="min-h-screen flex flex-col items-center justify-center relative" style={getBackgroundStyles()}>
        {renderBackground()}
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
            <div className="fixed top-5 right-5 z-50">
              <Link 
                href="/backgrounds"
                className="inline-flex items-center px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg shadow-md hover:bg-white/40 transition-colors"
              >
                <span className="text-white text-sm">🎨</span>
                <span className="text-white ml-2">설정</span>
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