// components/EditButton.tsx
'use client';

import { Share, Copy, Edit, Hand, Home, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';

interface UserEditButtonProps {
  username: string;
  ownerUid: string;
}

export default function UserEditButton({ username, ownerUid }: UserEditButtonProps) {
  const [showCopyMessage, setShowCopyMessage] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser } = useSelector((state: any) => state.user);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    // beforeinstallprompt 이벤트 리스너 추가
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        setShowInstallButton(true);
      }
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstallButton(false);
    setIsOpen(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${username}의 페이지`,
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
    setIsOpen(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowCopyMessage(true);
    setTimeout(() => setShowCopyMessage(false), 2000);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {showCopyMessage && (
        <div className="absolute -top-12 right-0 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap">
          주소가 복사되었습니다
        </div>
      )}
      
      <div className="relative">
        {/* 서브 버튼들 */}
        <div className={`absolute bottom-full right-0 mb-3 flex flex-col gap-3 transition-all duration-200 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <button
            onClick={handleShare}
            className="bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-all hover:scale-110"
          >
            <Share className="w-4 h-4" />
          </button>

          <button
            onClick={handleCopyLink}
            className="bg-indigo-500 text-white p-4 rounded-full shadow-lg hover:bg-indigo-600 transition-all hover:scale-110"
          >
            <Copy className="w-4 h-4" />
          </button>

          {currentUser?.uid === ownerUid && (
            <Link
              href={`/editor/${username}`}
              className="bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-all hover:scale-110 flex items-center justify-center"
              onClick={() => setIsOpen(false)}
            >
              <Edit className="w-4 h-4" />
            </Link>
          )}

          <Link
            href="/likes/all"
            className="bg-rose-400 text-white p-4 rounded-full shadow-lg hover:bg-rose-500 transition-all hover:scale-110 flex items-center justify-center"
            onClick={() => setIsOpen(false)}
          >
            <Hand className="w-4 h-4" />
          </Link>

          {/* 홈화면 추가 버튼 (모바일 전용) */}
          {showInstallButton && (
            <button
              onClick={handleInstall}
              className="md:hidden bg-purple-500 text-white p-4 rounded-full shadow-lg hover:bg-purple-600 transition-all hover:scale-110"
            >
              <Home className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 메인 토글 버튼 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-all ${isOpen ? 'rotate-45' : ''}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
