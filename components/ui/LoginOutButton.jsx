'use client';

import { useSelector, useDispatch } from 'react-redux';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import app from '../../firebase';
import { clearUser } from '../../store/userSlice';

export default function LoginOutButton() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const { push } = useRouter();
  const dispatch = useDispatch();
  const auth = getAuth(app);

  const currentUser = useSelector((state) => state.user.currentUser);

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        dispatch(clearUser());
        push('/', { scroll: false });
      })
      .catch((err) => {
        console.error('로그아웃 에러:', err);
      });
  };

  if (!hasMounted) return null;

  return (
    <nav className="bg-zinc-900 shadow-lg border-b border-zinc-800">
      <div className="md:w-[1100px] container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-white hover:text-zinc-200 transition-colors">
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
