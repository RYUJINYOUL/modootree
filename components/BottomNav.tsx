'use client';

import { Home, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-lg border-t border-blue-500/20 z-50">
      <div className="max-w-[2000px] mx-auto">
        <div className="flex items-center justify-around h-16">
          <Link 
            href="/"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              pathname === '/' ? 'text-blue-500' : 'text-white/70 hover:text-white'
            }`}
          >
            <Home className="w-6 h-6 mb-1" />
            <span className="text-xs">내 페이지</span>
          </Link>
          
          <Link 
            href="/feed"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              pathname === '/feed' ? 'text-blue-500' : 'text-white/70 hover:text-white'
            }`}
          >
            <Users className="w-6 h-6 mb-1" />
            <span className="text-xs">모두트리 피드</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
