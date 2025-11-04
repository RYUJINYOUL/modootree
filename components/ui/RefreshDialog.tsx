'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface RefreshDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
}

export default function RefreshDialog({ isOpen, onConfirm }: RefreshDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    
    // 2초 로딩 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 실제 확인 로직 실행
    onConfirm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#2A4D45] border border-[#358f80]/30 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-[#56ab91]/20 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className={`w-6 h-6 text-[#56ab91] ${isLoading ? 'animate-spin' : ''}`} />
          </div>
          
          <h3 className="text-lg font-semibold text-white mb-2">
            본인 계정 확인
          </h3>
          
          <p className="text-gray-300 text-sm mb-6">
            {isLoading ? '계정을 확인하고 있습니다...' : '로그인 정보를 재확인 합니다.'}
          </p>
          
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full bg-[#56ab91] hover:bg-[#469d89] text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? '확인 중...' : '확인'}
          </button>
        </div>
      </div>
    </div>
  );
}
