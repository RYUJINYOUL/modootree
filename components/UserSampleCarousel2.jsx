'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';

const sampleUsers = [
  {
    id: 1,
    username: 'community_site',
    thumbnail: '/samples/community2.png',
    description: '커뮤니티 사이트'
  },
  {
    id: 2,
    username: 'shop_menu',
    thumbnail: '/samples/shop.png',
    description: '쇼핑몰 메뉴'
  },
  {
    id: 3,
    username: 'portfolio',
    thumbnail: '/samples/portfolio.png',
    description: '포트폴리오'
  },
  {
    id: 4,
    username: 'schedule',
    thumbnail: '/samples/schedule.png',
    description: '일정 관리'
  },
  {
    id: 5,
    username: 'diary',
    thumbnail: '/samples/diary.png',
    description: '다이어리'
  },
  {
    id: 6,
    username: 'music_player',
    thumbnail: '/samples/music.png',
    description: '뮤직 플레이어'
  },
  {
    id: 7,
    username: 'photo_album',
    thumbnail: '/samples/album.png',
    description: '사진 앨범'
  },
  {
    id: 8,
    username: 'link_tree',
    thumbnail: '/samples/links.png',
    description: '링크 모음'
  },
  {
    id: 9,
    username: 'blog_page',
    thumbnail: '/samples/blog2.png',
    description: '블로그'
  },
  {
    id: 10,
    username: 'contact_card',
    thumbnail: '/samples/contact.png',
    description: '연락처 카드'
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
        <div className="relative w-[260px] h-[450px] bg-white rounded-3xl overflow-hidden shadow-lg">
          <div className="absolute inset-0 flex items-center justify-center p-1">
            <div className="w-[250px] h-[440px] bg-gray-50 rounded-2xl overflow-hidden">
              <Image
                src={sample.thumbnail}
                alt={sample.description}
                width={250}
                height={440}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4">
                <h3 className="text-lg font-semibold mb-1">{sample.description}</h3>
                <p className="text-sm text-gray-300">modootree.com/{sample.username}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const samples = isMobile ? [...sampleUsers, ...sampleUsers, ...sampleUsers] : sampleUsers;

  return (
    <div className="w-full max-w-[1100px] mx-auto">
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