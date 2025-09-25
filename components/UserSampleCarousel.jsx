import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import LiveSitePreview from './LiveSitePreview';
import useEmblaCarousel from 'embla-carousel-react';

const sampleUsers = [
  {
    id: 1,
    username: 'questbook',
    siteUrl: 'https://www.modootree.com/questbook',
    previewImage: '/samples/link.png',
    description: '링크모음 - 인스타그램 연결'
  },
  {
    id: 2,
    username: 'farmtoolceo',
    siteUrl: 'https://www.modootree.com/farmtoolceo',
    previewImage: '/samples/gb.png',
    description: '방명록 - 카카오톡 연결'
  },
  {
    id: 3,
    username: 'month',
    siteUrl: 'https://www.modootree.com/month',
    previewImage: '/samples/sc.png',
    description: "일정표 - 학원·모임·교회"
  },
  {
    id: 4,
    username: 'modootree',
    siteUrl: 'https://www.modootree.com/modootree',
    previewImage: '/samples/di.png',
    description: '다이어리 - 커플·가족·개인'
  },
  {
    id: 5,
    username: 'portfolio',
    siteUrl: 'https://www.modootree.com/portfolio',
    previewImage: '/samples/po.png',
    description: '포트폴리오 - 간편공유·디자인'
  },
  {
    id: 6,
    username: '1day',
    siteUrl: 'https://www.modootree.com/1day',
    previewImage: '/samples/cu.png',
    description: '작은커뮤니티 - 아파트·동네·모임'
  }
];

export default function UserSampleCarousel() {
  const [isMobile, setIsMobile] = useState(false);

  const options = {
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
    loop: true,
    slidesToScroll: 1,
    startIndex: 1
  };

  const [emblaRef, emblaApi] = useEmblaCarousel(options);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 카드 컴포넌트
  const Card = ({ sample }) => {
    const handleClick = () => {
      window.open(sample.siteUrl, '_blank', 'noopener,noreferrer');
    };

    return (
      <div className="flex-[0_0_280px] min-w-0 px-2">
        <div className="mx-2">
          <div className="relative w-[260px] h-[320px] bg-white rounded-3xl overflow-hidden shadow-lg">
            <div className="absolute inset-0 flex items-center justify-center p-1">
              <div className="w-[250px] h-[310px] bg-gray-50 rounded-2xl overflow-hidden">
                <LiveSitePreview siteUrl={sample.siteUrl} previewImage={sample.previewImage} />
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4 cursor-pointer hover:bg-black/80 transition-colors"
                  onClick={handleClick}
                >
                  <h3 className="text-lg font-semibold mb-1 hover:text-gray-200">{sample.description}</h3>
                  <p className="text-sm text-gray-300 hover:text-gray-400">modootree.com/{sample.username}</p>
                  <p className="text-sm text-gray-400 mt-1">↕️ 클릭하시면 스크롤 가능합니다</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const samples = isMobile ? [...sampleUsers, ...sampleUsers] : [...sampleUsers, ...sampleUsers];

  return (
    <div className="w-full max-w-[1100px] mx-auto">
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