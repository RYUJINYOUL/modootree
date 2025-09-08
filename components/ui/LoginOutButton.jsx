'use client';

import { useSelector, useDispatch } from 'react-redux';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebase';
import { clearUser, setUser } from '../../store/userSlice';

export default function LoginOutButton() {
  const [hasMounted, setHasMounted] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();
  const auth = getAuth();
  const currentUser = useSelector((state) => state.user.currentUser);

  useEffect(() => {
    setHasMounted(true);
    // Firebase 인증 상태 변경 리스너 추가
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 사용자가 로그인한 경우
        dispatch(setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }));
      } else {
        // 사용자가 로그아웃한 경우
        dispatch(clearUser());
      }
    });

    // 컴포넌트 언마운트 시 리스너 제거
    return () => unsubscribe();
  }, [dispatch, auth]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      dispatch(clearUser());
      router.push('/');
    } catch (error) {
      console.error('로그아웃 에러:', error);
    }
  };

  if (!hasMounted) return null;

  return (
    <nav className="bg-zinc-900 shadow-lg border-b border-zinc-800">
      <div className="md:w-[1100px] container mx-auto px-4 py-4 flex justify-between items-center">
        <Link 
          href="/" 
          className="text-xl font-bold text-white hover:text-zinc-200 transition-colors"
        >
          모두트리
        </Link>
        <div className="flex gap-4 items-center">
          {currentUser?.uid && (
            <span className="text-sm text-blue-300 font-semibold">
              {currentUser.displayName || currentUser.email}
            </span>
          )}
          {currentUser?.uid ? (
            <button
              onClick={handleLogout}
              className="text-sm text-zinc-300 hover:text-white transition-colors"
            >
              로그아웃
            </button>
          ) : (
            <Link
              href="/login"
              className="text-sm text-zinc-300 hover:text-white transition-colors"
            >
              로그인
            </Link>
          )}
          {!currentUser?.uid && (
            <Link
              href="/register"
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors font-medium"
            >
              회원가입
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
