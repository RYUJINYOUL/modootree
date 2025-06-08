
'use client';

import { useSelector } from 'react-redux';
import Link from 'next/link';
import { useRouter } from 'next/navigation'
import { useDispatch } from "react-redux";
import React from 'react'
import useUIState from "@/hooks/useUIState";
import { cn } from "@/lib/utils"
import { getAuth, signOut } from 'firebase/auth';
import app from '../../firebase';


export default function LoginOutButton() {
  const { push } = useRouter();
  const dispatch = useDispatch();
  const auth = getAuth(app);
  const { currentUser, clearUser } = useSelector(state => state.user)
  
  const handleLogout = () => {
      signOut(auth).then(() => {
        dispatch(clearUser());
      }).catch((err) => {})
      push("/login", {scroll: false})
    }


  return (
       <nav className="bg-zinc-900 shadow-lg border-b border-zinc-800">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-white hover:text-zinc-200 transition-colors">모두트리</Link>
            <div className="flex gap-4 items-center">
             
              {currentUser.uid === undefined ? (
                <Link 
                  href="/login" 
                  className="text-sm text-zinc-300 hover:text-white transition-colors"
                >
                  로그인
                </Link>
              ) : (
                <Link 
                  onClick={ handleLogout }
                  href="/login" 
                  className="text-sm text-zinc-300 hover:text-white transition-colors"
                >
                  로그아웃
                </Link>
              )}
              <Link 
                href="/register" 
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors font-medium"
              >
                회원가입
              </Link>
            </div>
          </div>
        </nav>
  );
}
