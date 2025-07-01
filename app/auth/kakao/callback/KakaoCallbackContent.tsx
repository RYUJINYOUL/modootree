"use client";

import { useEffect, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useDispatch } from 'react-redux';
import { setUser } from '@/store/userSlice';

export default function KakaoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const auth = getAuth();
  const [errorMessage, setErrorMessage] = useState('');

  const handleKakaoCallback = useCallback(async () => {
    try {
      const code = searchParams.get('code');
      
      if (!code) {
        throw new Error('인증 코드가 없습니다');
      }

      const response = await fetch('/api/auth/kakao', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const contentType = response.headers.get('content-type');
      let responseData;

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const textResponse = await response.text();
        console.error('서버 응답 형식 오류');
        throw new Error('서버 응답 형식이 올바르지 않습니다.');
      }

      if (!response.ok) {
        throw new Error(responseData.details || `인증 처리 중 오류가 발생했습니다.`);
      }

      if (!responseData.customToken) {
        throw new Error('인증 토큰이 없습니다.');
      }

      // Firebase Custom Token으로 로그인
      const userCredential = await signInWithCustomToken(auth, responseData.customToken);
      const user = userCredential.user;

      // Firestore에서 사용자 정보 확인
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // 신규 사용자인 경우 기본 정보만 저장
        await setDoc(userRef, {
          email: responseData.kakaoUserInfo.email || null,
          photoURL: responseData.kakaoUserInfo.profile_image || null,
          provider: 'kakao',
          createdAt: serverTimestamp(),
        });

          // 기본 배경 설정 저장 (추가)
      await setDoc(doc(db, "users", user.uid, "settings", "background"), {
        type: 'video',
        value: 'https://cdn.pixabay.com/video/2024/03/18/204565-924698132_large.mp4'
      });

      // 기본 컴포넌트 설정 (이미 있는 코드)
      await setDoc(doc(db, "users", user.uid, "links", "page"), {
        components: ["이미지", "링크카드", "달력", "게스트북"],
      });
      
      }

      // Redux 상태 업데이트
      dispatch(setUser({
        uid: user.uid,
        email: responseData.kakaoUserInfo.email || null,
        photoURL: responseData.kakaoUserInfo.profile_image || null,
      }));

      router.push('/');
    } catch (error) {
      console.error('인증 처리 중 오류가 발생했습니다.');
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : '인증 처리 중 오류가 발생했습니다. 다시 시도해 주세요.'
      );
    }
  }, [searchParams, router, auth, dispatch]);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      handleKakaoCallback();
    } else {
      setErrorMessage('인증 코드가 없습니다. 다시 로그인해 주세요.');
    }
  }, [handleKakaoCallback, searchParams]);

  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4 text-white">로그인 오류</h2>
          <p className="text-red-500 mb-4 break-words">{errorMessage}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            로그인 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4 text-white">카카오 로그인 처리중...</h2>
        <p className="text-gray-300">잠시만 기다려주세요.</p>
      </div>
    </div>
  );
} 