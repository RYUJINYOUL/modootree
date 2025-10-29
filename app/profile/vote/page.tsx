'use client';

import { useSelector } from 'react-redux';
import { Banana } from 'lucide-react';

export default function VotePage() {
  const { currentUser } = useSelector((state: any) => state.user);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">로그인이 필요합니다.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 md:p-6 py-6 overflow-auto">
      <div className="px-2 md:px-0">
        <div className="bg-[#2A4D45]/60 backdrop-blur-sm border border-[#358f80]/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Banana className="w-8 h-8 text-yellow-400" />
            <h1 className="text-2xl font-bold text-white">투표</h1>
          </div>
          
          <div className="text-center py-20">
            <Banana className="w-24 h-24 text-yellow-400/50 mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-white mb-4">투표 기능 준비 중</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              투표 생성 및 참여 기능을 준비하고 있습니다. 
              곧 다양한 투표를 만들고 참여할 수 있게 됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
