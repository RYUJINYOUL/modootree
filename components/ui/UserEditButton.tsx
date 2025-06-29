// components/EditButton.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { Share, Copy, Edit, Hand } from 'lucide-react';

export default function UserEditButton({ username, ownerUid }: { username: string; ownerUid: string }) {
  const { currentUser } = useSelector((state: any) => state.user);
  const [showCopyMessage, setShowCopyMessage] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '내 페이지 공유',
          url: window.location.href
        });
      } catch (error) {
        console.error('공유 실패:', error);
      }
    } else {
      handleCopyLink(); // 공유 API를 지원하지 않는 경우 링크 복사로 대체
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowCopyMessage(true);
    setTimeout(() => setShowCopyMessage(false), 2000);
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3">
      {showCopyMessage && (
        <div className="absolute -top-12 right-0 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap">
          주소가 복사되었습니다
        </div>
      )}
      
      <button
        onClick={handleShare}
        className="bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-all hover:scale-110"
      >
        <Share className="w-5 h-5" />
      </button>

      <button
        onClick={handleCopyLink}
        className="bg-indigo-500 text-white p-4 rounded-full shadow-lg hover:bg-indigo-600 transition-all hover:scale-110"
      >
        <Copy className="w-5 h-5" />
      </button>

      {currentUser?.uid === ownerUid && (
        <Link
          href={`/editor/${username}`}
          className="bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-all hover:scale-110 flex items-center justify-center"
        >
          <Edit className="w-5 h-5" />
        </Link>
      )}

      <Link
        href="/likes/all"
        className="bg-rose-400 text-white p-4 rounded-full shadow-lg hover:bg-rose-500 transition-all hover:scale-110 flex items-center justify-center"
      >
        <Hand className="w-5 h-5" />
      </Link>
    </div>
  );
}
