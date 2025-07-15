"use client";

import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { getAuth, signOut } from 'firebase/auth';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from '@/firebase';
import { doc, getDoc, onSnapshot, updateDoc, increment, setDoc, deleteDoc } from 'firebase/firestore';
import { Heart, MessageCircle, ChevronDown } from 'lucide-react';

export default function MainHeader() {
  const user = useSelector((state: any) => state.user);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
      const viewsRef = doc(db, 'views', 'total');
    const unsubscribe = onSnapshot(viewsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setViewCount(data.count || 0);
        // 좋아요 수는 likedBy 배열의 길이로 계산
        const likedByArray = data.likedBy || [];
        setLikeCount(likedByArray.length);
        // 현재 사용자의 좋아요 상태 확인
        setIsLiked(likedByArray.includes(user?.currentUser?.uid));
      }
    });

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

  const handleLike = async () => {
    if (!user?.currentUser?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }

    const viewsRef = doc(db, 'views', 'total');
    
    try {
      const docSnap = await getDoc(viewsRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const likedBy = data.likedBy || [];
        const userUid = user.currentUser.uid;
        
        if (!likedBy.includes(userUid)) {
          // 좋아요 추가
        await updateDoc(viewsRef, {
            likedBy: [...likedBy, userUid]
        });
      } else {
          // 좋아요 제거
        await updateDoc(viewsRef, {
            likedBy: likedBy.filter((uid: string) => uid !== userUid)
        });
        }
      }
    } catch (error) {
      console.error('좋아요 업데이트 실패:', error);
    }
  };

  // 페이지 로드시 조회수 증가
  useEffect(() => {
    const incrementViewCount = async () => {
      const viewsRef = doc(db, 'views', 'total');
      try {
        const docSnap = await getDoc(viewsRef);
        if (!docSnap.exists()) {
          await setDoc(viewsRef, {
            count: 1,
            likedBy: []
          });
        } else {
          await updateDoc(viewsRef, {
            count: increment(1)
          });
        }
      } catch (error) {
        console.error('조회수 업데이트 실패:', error);
      }
    };
    
    // 세션 스토리지를 사용하여 중복 카운트 방지
    const hasVisited = sessionStorage.getItem('hasVisited');
    if (!hasVisited) {
      incrementViewCount();
      sessionStorage.setItem('hasVisited', 'true');
    }
  }, []);

  if (!mounted) return null;

  return (
    <header className="fixed top-1/2 -translate-y-1/2 left-4 md:left-6 z-50">
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-3 bg-white/10 hover:bg-white/20 transition-all duration-200 rounded-full px-4 py-2 backdrop-blur-md"
        >
          <Image
            src="/Image/logo.png"
            alt="ModooTree Logo"
            width={120}
            height={120}
            className="w-8 h-8"
          />
          <span className="text-white/90 text-sm font-medium">
            {user?.currentUser?.uid ? '로그인 중' : '로그아웃 중'}
          </span>
          <ChevronDown className={`w-4 h-4 text-white/70 transition-transform duration-200 ${
            showDropdown ? 'rotate-180' : ''
          }`} />
        </button>

        {showDropdown && (
          <div className="absolute mt-2 bg-white/10 backdrop-blur-md rounded-xl shadow-lg py-1 text-sm text-white/90 w-48">
            <div className="w-full text-left px-4 py-2 border-b border-white/10">
              조회수: {viewCount.toLocaleString()}
            </div>
            <button
              onClick={handleLike}
              className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors duration-200 flex items-center justify-between"
            >
              <span>좋아요: {likeCount.toLocaleString()}</span>
              <Heart 
                className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-white/70'}`}
              />
            </button>
            <button
              onClick={() => {
                window.open('http://pf.kakao.com/_pGNPn/chat', '_blank', 'noopener,noreferrer');
                setShowDropdown(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors duration-200 flex items-center justify-between"
            >
              <span>문의하기</span>
              <MessageCircle className="w-4 h-4 text-white/70" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
} 