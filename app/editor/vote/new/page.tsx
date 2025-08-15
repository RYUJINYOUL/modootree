'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import VoteComponent from '@/components/template/VoteComponent';
import Header from '@/components/Header';

export default function NewVotePage() {
  const router = useRouter();
  const { currentUser } = useSelector((state: any) => state.user);

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
    }
  }, [currentUser, router]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-black">
      <Header />
      <main className="container max-w-[1100px] mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-8">새 투표 만들기</h1>
          <VoteComponent />
        </div>
      </main>
    </div>
  );
} 