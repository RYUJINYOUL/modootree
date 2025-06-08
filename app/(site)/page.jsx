'use client'

import { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import UseCaseCarousel from '@/components/UseCaseCarousel';
import { useSelector } from 'react-redux';

export default function Page() {
  const { currentUser } = useSelector((state) => state.user);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (!currentUser?.uid) return;

      const docRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(docRef);

      if (!userSnap.exists()) {
        setUserData(null);
      } else {
        setUserData(userSnap.data());
      }

      setLoading(false);
    };

    loadUser();
  }, [currentUser]);

  // if (loading) return <div className="text-white">로딩 중...</div>;
  // if (!userData) return notFound();

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">모두트리</h1>
        <p className="text-lg text-white/80 mb-10">나만의 특별한 한페이지를 만들어보세요</p>

        <div className="grid gap-3 w-full max-w-sm mx-auto mb-16">

          {userData !== null ? (
          <Link
            href={`/editor/${userData?.username}`}
            className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl text-center text-[15px] hover:bg-blue-700 transition-colors backdrop-blur-sm border border-blue-500/30"
          >
            새로운 사이트 만들기
          </Link>
        ) : (
          <Link
            href="/login"
            className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl text-center text-[15px] hover:bg-blue-700 transition-colors backdrop-blur-sm border border-blue-500/30"
          >
            새로운 사이트 만들기
          </Link>
        )}


        {userData !== null ? (
          <Link
            href={`/${userData?.username}`}
            className="bg-sky-500 text-white px-6 py-3.5 rounded-2xl text-center text-[15px] hover:bg-sky-600 transition-colors backdrop-blur-sm border border-sky-400/30"
          >
            내 사이트 보기
          </Link>
        ) : (
          <Link
            href="/login"
            className="bg-sky-500 text-white px-6 py-3.5 rounded-2xl text-center text-[15px] hover:bg-sky-600 transition-colors backdrop-blur-sm border border-sky-400/30"
          >
            내 사이트 보기
          </Link>
        )}

        </div>

        <h2 className="text-2xl font-medium text-white/90 mb-12 leading-relaxed">
          모두트리는 대한민국 5,500만명에게<br />
          작지만 의미 있는 한페이지를 선물합니다.
        </h2>
      </div>

      <UseCaseCarousel />
    </div>
  );
}
