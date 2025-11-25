'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// GSAP 플러그인 등록
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const sampleUsers = [
  {
    id: 1,
    thumbnail: '/face/h1.png',
    description: '25년 10월 10일 · 기쁨',
    bgColor: 'bg-[#8ecae6]',
    path: '/1day'
  },
  {
    id: 2,
    thumbnail: '/face/h3.png',
    description: '25년 10월 11일 · 평온',
    bgColor: 'bg-[#219ebc]',
    path: '/farmtoolceo'
  },
  {
    id: 3,
    thumbnail: '/face/h4.png',
    description: '25년 10월 12일 · 기대',
    bgColor: 'bg-[#023047]',
    path: '/1day'
  },
  {
    id: 4,
    thumbnail: '/face/h5.png',
    description: '25년 10월 13일 · 만족',
    bgColor: 'bg-[#ffb703]',
    path: '/farmtoolceo'
  },
  {
    id: 5,
    thumbnail: '/face/h6.png',
    description: '25년 10월 14일 · 불안',
    bgColor: 'bg-[#fb8500]',
    path: '/1day'
  }
];

export default function UserSampleCarousel6() {
  const [isMobile, setIsMobile] = useState(false);
  const carouselRef = useRef(null);
  const cardsRef = useRef([]);

  const options = {
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
    loop: true,
    startIndex: 1,
    breakpoints: {
      '(min-width: 768px)': {
        align: 'start',
        containScroll: 'trimSnaps',
        dragFree: true,
        loop: true,
        startIndex: 1
      }
    }
  };

  const [emblaRef] = useEmblaCarousel(options);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // GSAP ScrollTrigger 애니메이션
  useEffect(() => {
    if (carouselRef.current && cardsRef.current.length > 0) {
      // 캐러셀 컨테이너 페이드인
      gsap.fromTo(carouselRef.current, 
        { 
          opacity: 0,
          y: 50
        },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: carouselRef.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );

      // 각 카드 스태거 애니메이션
      gsap.fromTo(cardsRef.current,
        {
          scale: 0.8,
          opacity: 0,
          rotationY: 45
        },
        {
          scale: 1,
          opacity: 1,
          rotationY: 0,
          duration: 0.8,
          stagger: 0.2,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: carouselRef.current,
            start: "top 70%",
            end: "bottom 30%",
            toggleActions: "play none none reverse"
          }
        }
      );

      // 호버 효과
      cardsRef.current.forEach((card) => {
        if (card) {
          const handleMouseEnter = () => {
            gsap.to(card, {
              scale: 1.05,
              rotationY: 5,
              z: 50,
              duration: 0.3,
              ease: "power2.out"
            });
          };

          const handleMouseLeave = () => {
            gsap.to(card, {
              scale: 1,
              rotationY: 0,
              z: 0,
              duration: 0.3,
              ease: "power2.out"
            });
          };

          card.addEventListener('mouseenter', handleMouseEnter);
          card.addEventListener('mouseleave', handleMouseLeave);

          return () => {
            card.removeEventListener('mouseenter', handleMouseEnter);
            card.removeEventListener('mouseleave', handleMouseLeave);
          };
        }
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [isMobile]);

  // 카드 컴포넌트
  const Card = ({ sample, index }) => (
    <div className="flex-[0_0_280px] min-w-0 px-2">
      <div className="mx-2">
        <Link href={sample.path} className="block">
          <div 
            ref={(el) => (cardsRef.current[index] = el)}
            className={`relative w-[260px] h-[320px] rounded-3xl overflow-hidden shadow-lg ${sample.bgColor} backdrop-blur-sm cursor-pointer transition-all duration-200`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="absolute inset-0 flex flex-col">
              {/* 이미지 컨테이너 - 전체 공간 사용 */}
              <div className="w-full h-full rounded-3xl overflow-hidden relative">
                <Image
                  src={sample.thumbnail}
                  alt={sample.description}
                  fill
                  className="object-cover"
                />
                {/* 감정 아이콘 */}
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-xs font-medium text-black">
                    {sample.id === 1 && '샘플'}
                    {sample.id === 2 && '샘플'}
                    {sample.id === 3 && '샘플'}
                    {sample.id === 4 && '샘플'}
                    {sample.id === 5 && '샘플'}
                  </span>
                </div>
                {/* 좋아요/답글 아이콘 (디자인용) */}
                <div className="absolute bottom-2 left-2 flex items-center gap-2 text-white">
                  <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                    <span className="text-xs">❤️</span>
                    <span className="text-xs font-medium">24</span>
                  </div>
                  <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                    <span className="text-xs">💬</span>
                    <span className="text-xs font-medium">8</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );

  const samples = isMobile ? [...sampleUsers, ...sampleUsers, ...sampleUsers] : sampleUsers;

  return (
    <div className="w-full max-w-[1500px] mx-auto" ref={carouselRef}>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex backface-hidden">
          {samples.map((sample, index) => (
            <Card key={`${sample.id}-${index}`} sample={sample} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
