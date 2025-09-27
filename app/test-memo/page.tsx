'use client';

import { useSelector } from 'react-redux';
import DayOneBook from '@/components/template/DayOneBook';

export default function TestMemoPage() {
  const currentUser = useSelector((state: any) => state.user.currentUser);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-900">
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold text-white mb-8 text-center">데이원메모 테스트</h1>
        <DayOneBook userId="test-user" editable={true} />
      </div>
    </div>
  );
}
