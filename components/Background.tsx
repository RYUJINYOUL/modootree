import { useState, useEffect } from 'react';
import Image from 'next/image';

interface BackgroundProps {
  type: 'color' | 'gradient' | 'image' | 'video';
  value: string;
  thumbnailUrl?: string;
}

export default function Background({ type, value, thumbnailUrl }: BackgroundProps) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  useEffect(() => {
    if (type === 'video') {
      setIsVideoLoaded(false);
      const video = document.createElement('video');
      video.src = value;
      video.load();
      
      video.addEventListener('canplay', () => {
        setIsVideoLoaded(true);
      });
    }
  }, [type, value]);

  if (type === 'color') {
    return (
      <div 
        className="fixed inset-0 -z-10" 
        style={{ backgroundColor: value }}
      />
    );
  }

  if (type === 'gradient') {
    return (
      <div 
        className="fixed inset-0 -z-10" 
        style={{ backgroundImage: value }}
      />
    );
  }

  if (type === 'video') {
    return (
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* 썸네일 이미지 (비디오 로딩 전) */}
        {thumbnailUrl && (
          <div className={`absolute inset-0 transition-opacity duration-1000 ${isVideoLoaded ? 'opacity-0' : 'opacity-100'}`}>
            <Image
              src={thumbnailUrl}
              alt="배경"
              fill
              priority
              className="object-cover"
            />
          </div>
        )}

        {/* 비디오 배경 */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}>
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            poster={thumbnailUrl}
          >
            <source src={value} type="video/mp4" />
          </video>
        </div>

        {/* 오버레이 */}
        <div className="absolute inset-0 bg-black/30" />
      </div>
    );
  }

  // 이미지 타입
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <Image
        src={value}
        alt="배경"
        fill
        sizes="100vw"
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
} 