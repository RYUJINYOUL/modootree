"use client";

import { useEffect, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuth, signInWithCustomToken, setPersistence, browserLocalPersistence } from 'firebase/auth';
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
  const [isLoading, setIsLoading] = useState(true);

  const handleKakaoCallback = useCallback(async () => {
    try {
      if (!searchParams) {
        throw new Error('검색 파라미터를 찾을 수 없습니다');
      }

      const code = searchParams.get('code');
      
      if (!code) {
        throw new Error('인증 코드가 없습니다');
      }

      console.log('카카오 인증 처리 시작...');

      const response = await fetch('/api/auth/kakao', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      let responseData;
      try {
        const responseText = await response.text();
        console.log('서버 응답 데이터:', responseText);
        responseData = JSON.parse(responseText);
      } catch (error) {
        console.error('서버 응답 파싱 오류:', error);
        throw new Error('서버 응답을 처리할 수 없습니다. 응답 형식이 올바르지 않습니다.');
      }

      if (!response.ok) {
        throw new Error(responseData.details || responseData.error || '인증 처리 중 오류가 발생했습니다.');
      }

      if (!responseData.customToken) {
        throw new Error('인증 토큰이 없습니다.');
      }

      if (!responseData.kakaoUserInfo?.email) {
        throw new Error('카카오 계정의 이메일 정보가 필요합니다. 카카오 로그인 시 이메일 제공에 동의해주세요.');
      }

      console.log('Firebase 인증 시작...');

      // 로컬 지속성으로 변경 (브라우저를 닫아도 로그인 유지)
      await setPersistence(auth, browserLocalPersistence);

      // Firebase Custom Token으로 로그인
      const userCredential = await signInWithCustomToken(auth, responseData.customToken);
      const user = userCredential.user;

      console.log('Firebase 사용자 정보 확인...');

      // Firestore에서 사용자 정보 확인
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.log('신규 사용자 정보 저장...');
        // 신규 사용자인 경우 기본 정보 저장
        await setDoc(userRef, {
          email: responseData.kakaoUserInfo.email,
          photoURL: responseData.kakaoUserInfo.profile_image || null,
          provider: 'kakao',
          createdAt: serverTimestamp(),
        });

        // 기본 배경 설정 저장
        await setDoc(doc(db, "users", user.uid, "settings", "background"), {
            type: 'image',
            value: 'https://firebasestorage.googleapis.com/v0/b/mtree-e0249.firebasestorage.app/o/backgrounds%2F1752324410072_leaves-8931849_1920.jpg?alt=media&token=bda5d723-d54d-43d5-8925-16aebeec8cfa',
            animation: true
        });

        // 빈 컴포넌트로 시작
        await setDoc(doc(db, "users", user.uid, "links", "page"), {
          components: [],
          type: null
        });
      }

      // Redux 상태 업데이트
      dispatch(setUser({
        uid: user.uid,
        email: responseData.kakaoUserInfo.email,
        photoURL: responseData.kakaoUserInfo.profile_image || null,
      }));

      console.log('로그인 성공!');
      setIsLoading(false);
      // state 파라미터에서 원래 페이지 URL 가져오기
      const returnUrl = searchParams.get('state') || '/';
      window.location.href = decodeURIComponent(returnUrl);
    } catch (error) {
      console.error('인증 처리 중 오류:', error);
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : '인증 처리 중 오류가 발생했습니다. 다시 시도해 주세요.'
      );
      setIsLoading(false);
    }
  }, [searchParams, router, auth, dispatch]);

  useEffect(() => {
    if (!searchParams) {
      setErrorMessage('검색 파라미터를 찾을 수 없습니다. 다시 로그인해 주세요.');
      setIsLoading(false);
      return;
    }

    const code = searchParams.get('code');
    if (code) {
      handleKakaoCallback();
    } else {
      setErrorMessage('인증 코드가 없습니다. 다시 로그인해 주세요.');
      setIsLoading(false);
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
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isLoading ? '카카오 로그인 처리중...' : '로그인 성공!'}
        </h2>
        <p className="text-gray-300">
          {isLoading ? '잠시만 기다려주세요.' : '메인 페이지로 이동합니다.'}
        </p>
      </div>
    </div>
  );
} 