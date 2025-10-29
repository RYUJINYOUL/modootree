'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';

// 애니메이션 키프레임 스타일 추가
const animationStyle = `
  @keyframes diagonal-float {
    0% {
      transform: translate(0, 0) rotate(0deg);
    }
    25% {
      transform: translate(10px, -10px) rotate(2deg);
    }
    50% {
      transform: translate(20px, -20px) rotate(-1deg);
    }
    75% {
      transform: translate(10px, -10px) rotate(1deg);
    }
    100% {
      transform: translate(0, 0) rotate(0deg);
    }
  }

  .diagonal-floating {
    animation: diagonal-float 6s ease-in-out infinite;
  }
`;

interface Sample {
  id: number;
  username: string;
  thumbnail: string;
  description: string;
  bgColor: string;
}

const sampleUsers: Sample[] = [
  {
    id: 1,
    username: '모두트리 AI 채팅창 메모 내용 입력 후 저장을 요청 하세요',
    thumbnail: '/samples/s1.png',
    description: 'AI 메모 저장',
    bgColor: 'bg-[#358f80]'
  },
  {
    id: 2,
    username: '모두트리 AI와 대화한 내용으로 AI가 오늘 일기를 작성해 드립니다',
    thumbnail: '/samples/s2.png',
    description: 'AI 일기 작성',
    bgColor: 'bg-[#469d89]'
  },
  {
    id: 3,
    username: '오늘 하루를 대화 해보세요 AI가 오늘 건강을 분석해 드립니다',
    thumbnail: '/samples/s3.png',
    description: 'AI 건강 분석',
    bgColor: 'bg-[#56ab91]'
  },
  {
    id: 4,
    username: '모두트리 AI와 오늘 일과를 대화 하세요 내 사이트에서 자동 저장 됩니다',
    thumbnail: '/samples/s4.png',
    description: 'AI 자동 저장',
    bgColor: 'bg-[#67b99a]'
  },
  {
    id: 5,
    username: '내 사이트 디자인 배경 스킨을 적용하세요, 내 사진도 배경 설정 가능합니다',
    thumbnail: '/samples/s5.png',
    description: '디자인 기능',
    bgColor: 'bg-[#358f80]'
  },
  {
    id: 6,
    username: '내 사이트를 SNS 명함 공유 나만의 게시판을 만들 수 있습니다',
    thumbnail: '/samples/s6.png',
    description: '응원게시판',
    bgColor: 'bg-[#469d89]'
  },
  {
    id: 7,
    username: '단 두번 클릭으로 내 사이트를 만들 수 있습니다',
    thumbnail: '/samples/s7.png',
    description: '드래그드롭',
    bgColor: 'bg-[#56ab91]'
  },
];

export default function UserSampleCarousel2() {
  const [isMobile, setIsMobile] = useState(false);

  const options = {
    align: "start" as const,
    containScroll: "trimSnaps" as const,
    dragFree: true,
    loop: true,
    startIndex: 1,
    breakpoints: {
      '(min-width: 768px)': {
        align: "start" as const,
        containScroll: "trimSnaps" as const,
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
  const Card = ({ sample }: { sample: Sample }) => (
    <div className="flex-[0_0_280px] min-w-0 px-2">
      <div className="mx-2">
        <div className={`relative w-[260px] h-[320px] rounded-3xl overflow-hidden shadow-lg ${sample.bgColor} backdrop-blur-sm`}>
          <div className="absolute inset-0 flex flex-col p-1">
            {/* 이미지 컨테이너 - 중앙 정렬 */}
            <div className="w-[250px] h-[250px] rounded-2xl overflow-hidden flex items-center justify-center bg-black/10">
              <div className="diagonal-floating">
                <Image
                  src={sample.thumbnail}
                  alt={sample.description}
                  width={136}
                  height={136}
                  className="object-contain"
                />
              </div>
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
      <style jsx global>{animationStyle}</style>
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