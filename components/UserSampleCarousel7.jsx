'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
// import useEmblaCarousel from 'embla-carousel-react';

const sampleUsers = [
  {
    id: 11,
    username: '"오늘, 떨리는 목소리로 나랑 결혼해줄래? 세상이 멈춘 듯 꿈결 같았다.\n내 대답은 당연히 Yes!',
    thumbnail: '/face/sl.png',
    description: '25년 10월 10일 · 셀렘',
    bgColor: 'bg-[#ff6b6b]',
    path: '/site'
  },
  {
    id: 10,
    username: '내일 내 인생 처음이자 마지막 상견례, 떨린다.\n정치 얘기는 나오지 않기를 불편 불편 불편 양보 양보 양보',
    thumbnail: '/face/po.png',
    description: '25년 10월 11일 · 평안',
    bgColor: 'bg-[#4ecdc4]',
    path: '/site'
  },
  {
    id: 12,
    username: '오래된 노래를 들으며 따뜻한 차 한 잔.\n복잡했던 마음이 고요해지는 오후, 작은 것에 만족하는 지금',
    thumbnail: '/face/sp.png',
    description: '25년 10월 12일 · 슬픔',
    bgColor: 'bg-[#45b7d1]',
    path: '/site'
  },
  {
    id: 6,
    username: '"오늘, 떨리는 목소리로 나랑 결혼해줄래? 세상이 멈춘 듯 꿈결 같았다.\n내 대답은 당연히 Yes!',
    thumbnail: '/face/hm.png',
    description: '25년 10월 13일 · 희망',
    bgColor: 'bg-[#96ceb4]',
    path: '/site'
  },
  {
    id: 3,
    username: '신상 선물! 가슴이 벅차올라. 어떤 선물일까?\n설레어 잠들기 어렵다. 이제 시작, 달려보자',
    thumbnail: '/face/gb.png',
    description: '25년 10월 14일 · 기쁨',
    bgColor: 'bg-[#feca57]',
    path: '/site'
  },
  {
    id: 1,
    username: '"오늘, 떨리는 목소리로 나랑 결혼해줄래? 세상이 멈춘 듯 꿈결 같았다.\n내 대답은 당연히 Yes!',
    thumbnail: '/face/ba.png',
    description: '25년 10월 15일 · 불안',
    bgColor: 'bg-[#ff9ff3]',
    path: '/site'
  },
  {
    id: 2,
    username: '오래된 노래를 들으며 따뜻한 차 한 잔.\n복잡했던 마음이 고요해지는 오후, 작은 것에 만족하는 지금',
    thumbnail: '/face/bn.png',
    description: '25년 10월 16일 · 분노',
    bgColor: 'bg-[#f38ba8]',
    path: '/site'
  },
  {
    id: 4,
    username: '오늘 하루 완벽했어. 미팅도, 계획도, 마음 배려 또한..\n잔잔한 미소로 나 자신을 칭찬한 오늘',
    thumbnail: '/face/gj.png',
    description: '25년 10월 17일 · 걱정',
    bgColor: 'bg-[#a8e6cf]',
    path: '/site'
  },
  {
    id: 5,
    username: '내일 내 인생 처음이자 마지막 상견례, 떨린다.\n정치 얘기는 나오지 않기를 불편 불편 불편 양보 양보 양보',
    thumbnail: '/face/gr.png',
    description: '25년 10월 18일 · 그리움',
    bgColor: 'bg-[#dda0dd]',
    path: '/site'
  },
  {
    id: 7,
    username: '오래된 노래를 들으며 따뜻한 차 한 잔.\n복잡했던 마음이 고요해지는 오후, 작은 것에 만족하는 지금',
    thumbnail: '/face/jj.png',
    description: '25년 10월 19일 · 짜증',
    bgColor: 'bg-[#ffb3ba]',
    path: '/site'
  },
  {
    id: 8,
    username: '신상 선물! 가슴이 벅차올라. 어떤 선물일까?\n설레어 잠들기 어렵다. 이제 시작, 달려보자',
    thumbnail: '/face/jl.png',
    description: '25년 10월 20일 · 중립',
    bgColor: 'bg-[#bae1ff]',
    path: '/site'
  },
  {
    id: 9,
    username: '오늘 하루 완벽했어. 미팅도, 계획도, 마음 배려 또한..\n잔잔한 미소로 나 자신을 칭찬한 오늘',
    thumbnail: '/face/mj.png',
    description: '25년 10월 21일 · 만족',
    bgColor: 'bg-[#ffffba]',
    path: '/site'
  },
  {
    id: 13,
    username: '신상 선물! 가슴이 벅차올라. 어떤 선물일까?\n설레어 잠들기 어렵다. 이제 시작, 달려보자',
    thumbnail: '/face/won.png',
    description: '25년 10월 22일 · 원본',
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