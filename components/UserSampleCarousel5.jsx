'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';

const sampleUsers = [
  {
    id: 1,
    username: '"오늘, 떨리는 목소리로 나랑 결혼해줄래? 세상이 멈춘 듯 꿈결 같았다. 내 대답은 당연히 Yes!',
    thumbnail: '/face/t1.png',
    description: '25년 10월 10일 · 기쁨',
    bgColor: 'bg-[#ffbe0b]',
    path: '/site'
  },
  {
    id: 2,
    username: '오래된 노래를 들으며 따뜻한 차 한 잔. 복잡했던 마음이 고요해지는 오후, 작은 것에 만족하는 지금',
    thumbnail: '/face/t2.png',
    description: '25년 10월 11일 · 평온',
    bgColor: 'bg-[#fb5607]',
    path: '/site'
  },
  {
    id: 3,
    username: '신상 선물! 가슴이 벅차올라. 어떤 선물일까? 설레어 잠들기 어렵다. 이제 시작, 달려보자',
    thumbnail: '/face/t3.png',
    description: '25년 10월 12일 · 기대',
    bgColor: 'bg-[#ff006e]',
    path: '/site'
  },
  {
    id: 4,
    username: '오늘 하루 완벽했어. 미팅도, 계획도, 마음 배려 또한.. 잔잔한 미소로 나 자신을 칭찬한 오늘',
    thumbnail: '/face/t4.png',
    description: '25년 10월 13일 · 만족',
    bgColor: 'bg-[#8338ec]',
    path: '/site'
  },
  {
    id: 5,
    username: '내일 내 인생 처음이자 마지막 상견례, 떨린다, 정치 얘기는 나오지 않기를 불편 불편 불편 양보 양보 양보',
    thumbnail: '/face/t6.png',
    description: '25년 10월 14일 · 불안',
    bgColor: 'bg-[#3a86ff]',
    path: '/site'
  }
];

export default function UserSampleCarousel5() {
  const [isMobile, setIsMobile] = useState(false);

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

  // 카드 컴포넌트
  const Card = ({ sample }) => (
    <div className="flex-[0_0_280px] min-w-0 px-2">
      <div className="mx-2">
        <Link href={sample.path} className="block">
          <div className={`relative w-[260px] h-[320px] rounded-3xl overflow-hidden shadow-lg ${sample.bgColor} backdrop-blur-sm cursor-pointer hover:scale-105 transition-transform duration-200`}>
            <div className="absolute inset-0 flex flex-col">
              {/* 이미지 컨테이너 - 전체 공간 사용 */}
              <div className="w-full h-[260px] rounded-t-3xl overflow-hidden relative">
                <Image
                  src={sample.thumbnail}
                  alt={sample.description}
                  fill
                  className="object-cover"
                />
                {/* 감정 아이콘 */}
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-xs font-medium text-black">
                    {sample.id === 1 && '기쁨'}
                    {sample.id === 2 && '평온'}
                    {sample.id === 3 && '기대'}
                    {sample.id === 4 && '만족'}
                    {sample.id === 5 && '불안'}
                  </span>
                </div>
              </div>
              {/* 설명 부분 */}
              <div className="flex-1 p-4 pt-2">
                <h3 className="text-lg font-semibold mb-1 text-white">{sample.description}</h3>
                <p className="text-sm text-white/70">{sample.username}</p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );

  const samples = isMobile ? [...sampleUsers, ...sampleUsers, ...sampleUsers] : sampleUsers;

  return (
    <div className="w-full max-w-[1500px] mx-auto">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex backface-hidden">
          {samples.map((sample, index) => (
            <Card key={`${sample.id}-${index}`} sample={sample} />
          ))}
        </div>
      </div>
    </div>
  );
}