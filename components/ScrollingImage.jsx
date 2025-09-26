import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function ScrollingImage({ src, duration = 20000 }) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div 
        className={`absolute w-full ${isLoaded ? 'animate-scroll' : ''}`}
        style={{
          animation: isLoaded ? `scroll ${duration}ms linear infinite` : 'none',
          height: '200%',  // 이미지가 두 번 반복되는 효과를 위해
        }}
      >
        <Image
          src={src}
          alt="Template preview"
          width={250}
          height={1300}
          className="w-full object-cover"
          style={{ minHeight: '100%' }}
          priority={true}
          loading="eager"
          onLoadingComplete={() => setIsLoaded(true)}
          quality={80}
        />
        {/* 부드러운 무한 스크롤을 위해 이미지 반복 */}
        <Image
          src={src}
          alt="Template preview"
          width={250}
          height={1300}
          className="w-full object-cover"
          style={{ minHeight: '100%' }}
          loading="eager"
          quality={80}
        />
      </div>
      <style jsx global>{`
        @keyframes scroll {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-50%);  // 이미지 높이의 절반만큼 스크롤
          }
        }
        .animate-scroll {
          will-change: transform;
        }
        .animate-scroll:hover {
          animation-play-state: paused;  // 호버 시 애니메이션 일시 정지
        }
      `}</style>
    </div>
  );
}
