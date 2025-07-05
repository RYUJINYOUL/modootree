'use client';

import { useState, useEffect, useCallback } from 'react';
import { IoClose } from 'react-icons/io5';
import { MdGTranslate } from 'react-icons/md';

interface GoogleTranslateElement {
  new (config: {
    pageLanguage: string;
    includedLanguages: string;
    layout: any;
    autoDisplay: boolean;
  }, element: string): void;
  InlineLayout: {
    SIMPLE: any;
  };
}

interface GoogleTranslate {
  TranslateElement: GoogleTranslateElement;
}

declare global {
  interface Window {
    google?: {
      translate?: GoogleTranslate;
    };
    googleTranslateElementInit?: () => void;
  }
}

export default function TranslateBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [isTranslateInitialized, setIsTranslateInitialized] = useState(false);
  const [isScriptLoading, setIsScriptLoading] = useState(false);

  const initTranslate = useCallback(() => {
    if (window.google?.translate?.TranslateElement) {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'ko',
          includedLanguages: 'en,ja,zh-CN,vi,th,tl,id,ar,es,ru,fr,de',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        'google_translate_element'
      );
      setIsTranslateInitialized(true);
    }
  }, []);

  const loadTranslateScript = useCallback(() => {
    if (isScriptLoading) return;
    setIsScriptLoading(true);

    const script = document.createElement('script');
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);

    window.googleTranslateElementInit = initTranslate;

    script.onload = () => {
      setIsScriptLoading(false);
    };

    return () => {
      document.body.removeChild(script);
      delete window.googleTranslateElementInit;
    };
  }, [isScriptLoading, initTranslate]);

  useEffect(() => {
    const storedVisibility = localStorage.getItem('translateBannerVisible');
    if (storedVisibility !== null) {
      setIsVisible(JSON.parse(storedVisibility));
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isTranslateInitialized) {
          loadTranslateScript();
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById('google_translate_element');
    if (element) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [isTranslateInitialized, loadTranslateScript]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('translateBannerVisible', 'false');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex justify-center">
      <div className="bg-white shadow-lg rounded-b-lg px-4 py-2 flex items-center gap-2">
        <MdGTranslate className="text-blue-500" size={20} />
        <div id="google_translate_element"></div>
        <button
          onClick={handleClose}
          className="ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <IoClose size={20} />
        </button>
      </div>
    </div>
  );
} 