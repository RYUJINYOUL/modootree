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

const sampleUsers = [
  {
    id: 1,
    username: '일기, 일정표 페이지를 동료, 가족, 친구, 지인을 초대 함께 작성할 수도 있습니다',
    thumbnail: '/samples/schedule.png',
    description: '초대 기능',
    bgColor: 'bg-[#358f80]'
  },
  {
    id: 2,
    username: '페이지 상단의 작은 번역 버튼이 있어, 희망하는 언어로 간단하게 자동 번역됩니다.',
    thumbnail: '/samples/diary.png',
    description: '번역 기능',
    bgColor: 'bg-[#469d89]'
  },
  {
    id: 3,
    username: '모든 컴포넌트를 드래그 앤 드롭 방식으로 쉽게 만들 수 있습니다. 정말 쉽습니다.',
    thumbnail: '/samples/music.png',
    description: '편집 기능',
    bgColor: 'bg-[#56ab91]'
  },
  {
    id: 4,
    username: '페이지의 새 글이 등록 될때마다 이메일로 알림을 보내 드리는 기능이 탑재되어 있습니다',
    thumbnail: '/samples/album.png',
    description: '알림 기능',
    bgColor: 'bg-[#67b99a]'
  },
  {
    id: 5,
    username: '수 많은 디자인 배경 스킨을 적용해 보세요, 유튜브 영상도 배경으로 가능합니다',
    thumbnail: '/samples/links.png',
    description: '디자인 기능',
    bgColor: 'bg-[#358f80]'
  },
  {
    id: 6,
    username: '익명 일기 공유 커뮤니티 공간과 포트폴리오 공간, 내 페이지 공유 공간을 준비하고 있습니다',
    thumbnail: '/samples/blog2.png',
    description: '커뮤니티',
    bgColor: 'bg-[#469d89]'
  },
  {
    id: 7,
    username: '단 두번의 클릭으로 내 페이지를 아주 쉽게 공유할 수 있고 내 페이지를 방문자도 쉽게 공유 가능합니다',
    thumbnail: '/samples/contact.png',
    description: '공유 기능',
    bgColor: 'bg-[#56ab91]'
  }
];

export default function UserSampleCarousel2() {
  const [isMobile, setIsMobile] = useState(false);

  const options = {
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
    loop: true,
    breakpoints: {
      '(min-width: 768px)': {
        align: 'start',
        containScroll: 'trimSnaps',
        dragFree: true,
        loop: false
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
    <div className="flex-[0_0_280px] min-w-0">
      <div className="mx-4">
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
    <div className="w-full max-w-[1100px] mx-auto">
      <style jsx global>{animationStyle}</style>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex backface-hidden pl-4">
          {samples.map((sample, index) => (
            <Card key={`${sample.id}-${index}`} sample={sample} />
          ))}
        </div>
      </div>
    </div>
  );
} 