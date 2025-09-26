'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';

const sampleUsers = [
  {
    id: 1,
    username: '공개 및 비공개 일기장 커플·가족·모임에서도 함께 쓸 수는 있고 익명일기로 커뮤니티 공유도 가능합니다',
    thumbnail: '/samples/31.png',
    description: '오늘 일기',
    bgColor: 'bg-[#2a6f97]'
  },
  {
    id: 2,
    username: '오픈 일정표을 문자 SNS으로 간편 공유하세요, 교회·학원·아파트·현장 등의 중요한 일정을 공유하세요',
    thumbnail: '/samples/32.png',
    description: '오픈 일정표',
    bgColor: 'bg-[#2a6f97]'
  },
  {
    id: 3,
    username: '작지만 강력한 커뮤니티를 만들어 보세요, 교회·학원·아파트·소모임 등의 작은 게시판을 선물합니다',
    thumbnail: '/samples/33.png',
    description: '작은 커뮤니티',
    bgColor: 'bg-[#2a6f97]'
  },
  {
    id: 4,
    username: '이름, 연락처, 인스타그램, 캘린더 예약 링크까지 하나의 카드로 정리해서 카톡이나 메신저로 전송해요',
    thumbnail: '/samples/34.png',
    description: '온라인 명함',
    bgColor: 'bg-[#2a6f97]'
  },
  {
    id: 5,
    username: '나 만의 온라인 게스트북으로 소통해 보세요, 새로운 응원과 격려로 가득한 프라이빗 공간을 만드세요',
    thumbnail: '/samples/35.png',
    description: '온라인 게스트북',
    bgColor: 'bg-[#2a6f97]'
  }
];

export default function UserSampleCarousel3() {
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
        <div className={`relative w-[260px] h-[320px] rounded-3xl overflow-hidden shadow-lg ${sample.bgColor} backdrop-blur-sm`}>
          <div className="absolute inset-0 flex flex-col p-1">
            {/* 이미지 컨테이너 - 중앙 정렬 */}
            <div className="w-[250px] h-[250px] rounded-2xl overflow-hidden flex items-center justify-center bg-black/10">
              <Image
                src={sample.thumbnail}
                alt={sample.description}
                width={100}
                height={100}
                className="object-contain"
              />
            </div>
            {/* 설명 부분 */}
            <div className="flex-1 p-4">
              <h3 className="text-lg font-semibold mb-1 text-white">{sample.description}</h3>
              <p className="text-sm text-white/70">{sample.username}</p>
            </div>
          </div>
        </div>
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