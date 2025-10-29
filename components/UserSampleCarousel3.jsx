'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';

const sampleUsers = [
  {
    id: 1,
    username: 'AI가 분석 간추린 뉴스를 읽고 투표 해보세요 또한 주요 뉴스로 투표를 만들 수도 있으며 공유도 가능합니다',
    thumbnail: '/samples/31.png',
    description: '뉴스 투표',
    bgColor: 'bg-[#2a6f97]'
  },
  {
    id: 2,
    username: '모두트리 AI 대화 내용으로 사연 투표를 AI가 만들어 드립니다, 익명 등록 공유 가능합니다',
    thumbnail: '/samples/32.png',
    description: '사연 투표',
    bgColor: 'bg-[#2a6f97]'
  },
  {
    id: 3,
    username: '아침 점심 저녁 야식 운동을 작성 해주세요, 오늘 건강을 AI가 분석해 드립니다',
    thumbnail: '/samples/33.png',
    description: '건강 분석',
    bgColor: 'bg-[#2a6f97]'
  },
  {
    id: 4,
    username: '휴대폰에 간직한 소중한 사진을 예술 작품으로 변환 하세요, 지브리 스타일 등 22개 스타일이 준비되어 있습니다',
    thumbnail: '/samples/34.png',
    description: '사진 변환',
    bgColor: 'bg-[#2a6f97]'
  },
  {
    id: 5,
    username: '열린 자유 게시판입니다, 언제든 수정 개선사항에 대해 이야기 해주세요 1:1 채팅 문의도 가능합니다',
    thumbnail: '/samples/35.png',
    description: '열린게시판',
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