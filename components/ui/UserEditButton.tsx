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
    // PWA 설치 가능 여부 확인
    const checkInstallable = async () => {
      try {
        // PWA가 이미 설치되어 있는지 확인
        if (window.matchMedia('(display-mode: standalone)').matches) {
          setShowInstallButton(false);
          return;
        }

        // 기본적으로 버튼 표시
        setShowInstallButton(true);
      } catch (error) {
        console.error('PWA 설치 가능 여부 확인 중 오류:', error);
      }
    };

    // beforeinstallprompt 이벤트 리스너
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    checkInstallable();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (deferredPrompt) {
      setShowInstallButton(true);
    } else {
      setShowInstallButton(false);
    }
  }, [deferredPrompt]);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    });

    window.addEventListener('appinstalled', () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // PWA 설치 지원하지 않는 환경에서는 안내 메시지 표시
      alert('브라우저의 "홈 화면에 추가" 기능을 사용해주세요.');
      return;
    }
    
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallButton(false);
      }
      setDeferredPrompt(null);
    } catch (error) {
      console.error('설치 중 오류:', error);
    }
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

          {/* 홈화면 추가 버튼 - 항상 표시 */}
          <button
            onClick={handleInstall}
            className="bg-purple-500 text-white p-4 rounded-full shadow-lg hover:bg-purple-600 transition-all hover:scale-110"
          >
            <Home className="w-4 h-4" />
          </button>
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
