import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

export default function LiveSitePreview({ siteUrl, previewImage }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isHovered) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setIsLoaded(true);
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        
        let viewport = iframeDoc.querySelector('meta[name="viewport"]');
        if (!viewport) {
          viewport = iframeDoc.createElement('meta');
          viewport.name = 'viewport';
          iframeDoc.head.appendChild(viewport);
        }
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';

        const styleTag = iframeDoc.createElement('style');
        styleTag.textContent = `
          ::-webkit-scrollbar {
            display: none !important;
          }
          * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          html {
            zoom: ${isMobile ? '0.85' : '0.5'} !important;
            -moz-transform: scale(${isMobile ? '0.85' : '0.5'});
            -moz-transform-origin: 0 0;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            width: ${isMobile ? '375px' : '450px'} !important;
            height: 100% !important;
          }
          body {
            width: ${isMobile ? '375px' : '450px'} !important;
            max-width: ${isMobile ? '375px' : '450px'} !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            position: relative !important;
            margin: 0 !important;
            padding: 0 !important;
            min-height: 100vh !important;
            transform-origin: top left !important;
          }
          #__next {
            width: 100% !important;
            min-height: 100vh !important;
          }
          .container {
            width: 100% !important;
            max-width: 100% !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
        `;
        iframeDoc.head.appendChild(styleTag);

        // 모바일에서 iframe 내부 요소들의 크기를 조정
        if (isMobile) {
          const mainContent = iframeDoc.querySelector('main');
          if (mainContent) {
            mainContent.style.width = '375px';
            mainContent.style.maxWidth = '375px';
          }
        }

      } catch (e) {
        console.log('Cannot access iframe content');
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [isMobile, isHovered]);

  return (
    <div 
      className="relative w-full h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 미리보기 이미지 (기본 상태) */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
        <Image
          src={previewImage}
          alt="Site preview"
          width={720}
          height={1080}
          className="rounded-2xl object-cover w-full h-full"
          priority
          quality={90}
        />
      </div>

      {/* iframe (호버 상태) */}
      <div 
        className={`absolute inset-0 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        style={{
          pointerEvents: isHovered ? 'auto' : 'none',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style jsx global>{`
          ::-webkit-scrollbar {
            display: none !important;
          }
          * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
        `}</style>
        {isHovered && (
          <iframe
            ref={iframeRef}
            src={siteUrl}
            className={`w-full h-full transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{
              border: 'none',
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              width: '100%',
              height: '100%',
            }}
            scrolling="yes"
          />
        )}
        {isHovered && !isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}
      </div>
    </div>
  );
}