'use client';

// app/[username]/page.tsx
import { db } from '../../firebase';
import { collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { notFound, useParams } from 'next/navigation';
import { ComponentLibrary } from '@/components/edit/ComponentLibrary';
import Link from 'next/link';
import UserEditButton from '@/components/ui/UserEditButton';
import BackgroundSelector from '@/components/template/BackgroundSelector';
import { useBackground } from '@/components/providers';
import { useState, useEffect } from 'react';
import React from 'react';

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
  if (url.includes('pixabay.com')) {
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
  const username = params.username as string;
  const { background, setBackground: setContextBackground } = useBackground();

  const [userData, setUserData] = useState<any>(null);
  const [components, setComponents] = useState<string[]>([]);

  const handleBackgroundChange = async (type: string, value: string) => {
    if (!userData?.uid) {
      console.error('사용자 ID를 찾을 수 없습니다.');
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
      const userSnap = await getDoc(doc(db, 'usernames', username));
      
      if (!userSnap.exists()) {
        notFound();
        return;
      }

      const data = userSnap.data();
      const uid = data?.uid;
      setUserData({ ...data, uid });
      
      // 배경 설정 불러오기
      const settingsDocRef = doc(db, 'users', uid, 'settings', 'background');
      const settingsSnap = await getDoc(settingsDocRef);
      if (settingsSnap.exists()) {
        const backgroundData = settingsSnap.data();
        setContextBackground(backgroundData.type, backgroundData.value);
      }
      
      const linksDocRef = doc(db, 'users', uid, 'links', 'page');
      const linksSnap = await getDoc(linksDocRef);
      setComponents(linksSnap.exists() ? linksSnap.data().components || [] : []);
    }

    fetchData();
  }, [username]);

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
      <div className="fixed top-4 right-4 z-50">
        <BackgroundSelector onBackgroundChange={handleBackgroundChange} username={username} />
      </div>
      <div className="md:w-[1000px] w-full px-[10px]">   
        {components.map((type: string, i: number) => {
          const Component = ComponentLibrary[type as keyof typeof ComponentLibrary];
          return Component && <Component key={i} username={username} uid={userData.uid} />;
        })}
      </div>
      <div className='h-[50px]'></div>
      <UserEditButton username={username} ownerUid={userData.uid} />
    </main>
  );
}