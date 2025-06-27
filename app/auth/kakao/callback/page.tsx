"use client";

import { Suspense } from 'react';
import KakaoCallbackContent from './KakaoCallbackContent';

export default function KakaoCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-white">카카오 로그인 처리중...</h2>
            <p className="text-gray-300">잠시만 기다려주세요.</p>
          </div>
        </div>
      }
    >
      <KakaoCallbackContent />
    </Suspense>
  );
} 