'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
// import useEmblaCarousel from 'embla-carousel-react';

const sampleUsers = [
  {
    id: 11,
    username: '"오늘, 나랑 결혼해줄래? 세상이 멈춘 듯 꿈결 같았다.\n내 대답은 당연히 Yes!',
    thumbnail: '/face/sl.png',
    description: '25년 10월 10일',
    bgColor: 'bg-[#ff6b6b]',
    path: '/site'
  },
  {
    id: 10,
    username: '오래된 노래를 들으며 따뜻한 차 한 잔.\n복잡했던 마음이 고요해지는 오후',
    thumbnail: '/face/po.png',
    description: '25년 10월 11일',
    bgColor: 'bg-[#4ecdc4]',
    path: '/site'
  },
  {
    id: 12,
    username: '텅 빈 방 홀로 앉아 흘러간 시간을 되뇌다,\n아련한 추억만이 차가운 공기를 감싸네',
    thumbnail: '/face/sp.png',
    description: '25년 10월 12일',
    bgColor: 'bg-[#45b7d1]',
    path: '/site'
  },
  {
    id: 6,
    username: '어둠 속 작은 불씨처럼 피어나는 용기,\n새로운 내일을 향한 발걸음 멈추지 않으리',
    thumbnail: '/face/hm.png',
    description: '25년 10월 13일',
    bgColor: 'bg-[#96ceb4]',
    path: '/site'
  },
  {
    id: 3,
    username: '신상 선물! 가슴이 벅차올라. 어떤 선물일까?\n설레어 잠들기 어렵다. 이제 시작, 달려보자',
    thumbnail: '/face/gb.png',
    description: '25년 10월 14일',
    bgColor: 'bg-[#feca57]',
    path: '/site'
  },
  {
    id: 1,
    username: '알 수 없는 미래 앞에 마음이 흔들린다.\n다가올 일들에 대한 막연한 두려움이 엄습해.',
    thumbnail: '/face/ba.png',
    description: '25년 10월 15일',
    bgColor: 'bg-[#ff9ff3]',
    path: '/site'
  },
  {
    id: 2,
    username: '참을 수 없는 불공평함에 주먹을 쥐었다.\n내 안의 분노가 활활 타올라 끓어오른다.',
    thumbnail: '/face/bn.png',
    description: '25년 10월 16일',
    bgColor: 'bg-[#f38ba8]',
    path: '/site'
  },
  {
    id: 4,
    username: '풀리지 않는 문제에 밤잠을 설친다.\n머릿속 가득한 생각들이 나를 짓누른다.',
    thumbnail: '/face/gj.png',
    description: '25년 10월 17일',
    bgColor: 'bg-[#a8e6cf]',
    path: '/site'
  },
  {
    id: 5,
    username: '멀리 떠나간 옛 친구의 얼굴이 떠오른다.\n함께했던 시간들이 아련하게 그리워진다.',
    thumbnail: '/face/gr.png',
    description: '25년 10월 18일',
    bgColor: 'bg-[#dda0dd]',
    path: '/site'
  },
  {
    id: 7,
    username: '작은 일에도 신경이 곤두서는 요즘,\n괜찮다가도 짜증이 확 밀려와 예민해진다.',
    thumbnail: '/face/jj.png',
    description: '25년 10월 19일',
    bgColor: 'bg-[#ffb3ba]',
    path: '/site'
  },
  {
    id: 8,
    username: '어떤 감정에도 치우치지 않는 담담한 마음.\n그저 있는 그대로를 받아들이는 순간.',
    thumbnail: '/face/jl.png',
    description: '25년 10월 20일',
    bgColor: 'bg-[#bae1ff]',
    path: '/site'
  },
  {
    id: 9,
    username: '오늘 하루 완벽했어. 미팅도, 계획도, 마음 배려 또한..\n나 자신을 칭찬한 오늘',
    thumbnail: '/face/mj.png',
    description: '25년 10월 21일',
    bgColor: 'bg-[#feca00]',
    path: '/site'
  },
  {
    id: 13,
    username: '새로운 시작을 앞두고 가슴이 두근거린다.\n무엇이 펼쳐질지 궁금한 설렘 가득한 순간.',
    thumbnail: '/face/won.png',
    description: '25년 10월 22일',
    bgColor: 'bg-[#c7ceea]',
    path: '/site'
  }
];

export default function UserSampleCarousel7() {
  const [isMobile, setIsMobile] = useState(false);

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
    <div className="w-full">
      <div className="mx-auto">
        <Link href={sample.path} className="block">
          <div className={`relative w-full h-[320px] rounded-3xl overflow-hidden shadow-lg ${sample.bgColor} backdrop-blur-sm cursor-pointer hover:scale-105 transition-transform duration-200`}>
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
                    {sample.id === 11 && '셀렘'}
                    {sample.id === 10 && '평안'}
                    {sample.id === 12 && '슬픔'}
                    {sample.id === 6 && '희망'}
                    {sample.id === 3 && '기쁨'}
                    {sample.id === 1 && '불안'}
                    {sample.id === 2 && '분노'}
                    {sample.id === 4 && '걱정'}
                    {sample.id === 5 && '그리움'}
                    {sample.id === 7 && '짜증'}
                    {sample.id === 8 && '중립'}
                    {sample.id === 9 && '만족'}
                    {sample.id === 13 && '원본'}
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

  return (
    <div className="w-full max-w-[1500px] mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {sampleUsers.map((sample, index) => (
          <Card key={`${sample.id}-${index}`} sample={sample} />
        ))}
      </div>
    </div>
  );
}