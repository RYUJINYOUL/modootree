'use client';

import { useSelector } from 'react-redux';
import DayOneBook from '@/components/template/DayOneBook';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function TestPage() {
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.user.currentUser);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900">
      <div className="container mx-auto py-10">
        {currentUser ? (
          <DayOneBook userId={currentUser.uid} />
        ) : (
          <div className="text-center text-white space-y-4">
            <div>로그인이 필요합니다.</div>
            <Button 
              onClick={() => router.push('/login')}
              className="bg-blue-500/50 hover:bg-blue-600/50"
            >
              로그인하러 가기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
