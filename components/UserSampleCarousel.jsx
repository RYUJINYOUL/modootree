'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';

const sampleUsers = [
  {
    id: 1,
    username: 'artist_portfolio',
    thumbnail: '/samples/artist.png',
    description: '아티스트 포트폴리오'
  },
  {
    id: 2,
    username: 'cafe_menu',
    thumbnail: '/samples/cafe.png',
    description: '카페 메뉴 소개'
  },
  {
    id: 3,
    username: 'wedding_invitation',
    thumbnail: '/samples/wedding.png',
    description: '모바일 청첩장'
  },
  {
    id: 4,
    username: 'business_card',
    thumbnail: '/samples/business.png',
    description: '디지털 명함'
  },
  {
    id: 5,
    username: 'personal_blog',
    thumbnail: '/samples/blog.png',
    description: '개인 블로그'
  },
  {
    id: 6,
    username: 'photo_gallery',
    thumbnail: '/samples/gallery.png',
    description: '사진 갤러리'
  },
  {
    id: 7,
    username: 'event_page',
    thumbnail: '/samples/event.png',
    description: '이벤트 페이지'
  },
  {
    id: 8,
    username: 'resume',
    thumbnail: '/samples/resume.png',
    description: '이력서'
  },
  {
    id: 9,
    username: 'product_landing',
    thumbnail: '/samples/product.png',
    description: '상품 소개'
  },
  {
    id: 10,
    username: 'community',
    thumbnail: '/samples/community.png',
    description: '커뮤니티'
  }
];

export default function UserSampleCarousel() {
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