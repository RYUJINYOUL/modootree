'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useTranslate } from '../../../context/TranslateContext';

type GoogleTranslateElement = {
  new (options: any, element: string): any;
  InlineLayout: {
    SIMPLE: number;
  };
};

type GoogleTranslate = {
  TranslateElement: GoogleTranslateElement;
};

declare global {
  interface Window {
    google?: {
      translate?: GoogleTranslate;
    };
    googleTranslateElementInit?: () => void;
  }
}

export default function TranslateBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const { isTranslateVisible, setTranslateVisible, isTranslateInitialized, setTranslateInitialized } = useTranslate();
  const [retryCount, setRetryCount] = useState(0);

  const initTranslateElement = useCallback(() => {
    if (retryCount > 10) {
      console.error('Failed to initialize Google Translate after multiple attempts');
      return;
    }

    try {
      if (!window.google?.translate?.TranslateElement?.InlineLayout) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          initTranslateElement();
        }, 500);
        return;
      }

      const element = document.getElementById('google_translate_element');
      if (!element) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          initTranslateElement();
        }, 500);
        return;
      }

      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'ko',
          includedLanguages: 'ko,en,ja,zh-CN,vi,th,id,tl,de,fr,es,it,ru',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        'google_translate_element'
      );
      setTranslateInitialized(true);
      setRetryCount(0);
    } catch (error) {
      console.error('Google Translate initialization error:', error);
      if (retryCount < 10) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          initTranslateElement();
        }, 1000);
      }
    }
  }, [retryCount, setTranslateInitialized]);

  useEffect(() => {
    let script: HTMLScriptElement | null = null;

    const loadTranslateScript = () => {
      // 이전 스크립트 제거
      const existingScript = document.querySelector('script[src*="translate_a/element.js"]');
      if (existingScript) {
        existingScript.remove();
      }

      // 새 스크립트 추가
      script = document.createElement('script');
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      script.defer = true;

      window.googleTranslateElementInit = initTranslateElement;
      document.body.appendChild(script);
    };

    if (isTranslateVisible) {
      loadTranslateScript();
    }

    return () => {
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (window.googleTranslateElementInit) {
        window.googleTranslateElementInit = undefined;
      }
      const element = document.getElementById('google_translate_element');
      if (element) {
        element.innerHTML = '';
      }
      setTranslateInitialized(false);
      setRetryCount(0);
    };
  }, [isTranslateVisible, initTranslateElement, setTranslateInitialized]);

  if (!isTranslateVisible) return null;

  return (
    <>
      {/* 메인 배너 */}
      <div
        className={`fixed top-0 left-0 w-full bg-white/5 backdrop-blur-lg transform transition-all duration-300 z-[9999] ${
          isOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="container mx-auto px-4 py-3 flex justify-center items-center">
          <div id="google_translate_element" className="flex-1 text-center" />
          <button
            onClick={() => setIsOpen(false)}
            className="ml-4 text-white hover:text-white/80 flex items-center gap-2 text-sm transition-colors bg-zinc-800/50 px-3 py-1.5 rounded-full backdrop-blur-sm"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 열기 버튼 - 배너가 닫혀있을 때만 표시 */}
      {!isOpen && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-[9999]">
          <button
            onClick={() => setIsOpen(true)}
            className="text-white hover:text-white/80 flex items-center gap-2 text-sm transition-colors bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm"
          >
            번역 <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTranslateVisible(false)}
            className="text-white/70 hover:text-white flex items-center justify-center w-6 h-6 transition-colors bg-white/10 rounded-full backdrop-blur-sm"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <style jsx global>{`
        .goog-te-banner-frame {
          display: none !important;
        }
        body {
          top: 0 !important;
        }
        .VIpgJd-ZVi9od-l4eHX-hSRGPd,
        .VIpgJd-ZVi9od-ORHb-OEVmcd {
          display: none !important;
        }
        .goog-te-gadget {
          margin: 0 !important;
          text-align: center !important;
        }
        .goog-te-gadget span {
          display: none !important;
        }
        .goog-te-combo {
          background: rgba(255, 255, 255, 0.05) !important;
          border: none !important;
          border-radius: 8px !important;
          color: white !important;
          padding: 8px 16px !important;
          outline: none !important;
          backdrop-filter: blur(8px) !important;
          width: 200px !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          margin: 0 auto !important;
        }
        .goog-te-combo:hover {
          background: rgba(255, 255, 255, 0.1) !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
        }
        .goog-te-combo option {
          background: rgba(23, 23, 23, 0.9) !important;
          color: white !important;
          padding: 8px !important;
        }
      `}</style>
    </>
  );
} 