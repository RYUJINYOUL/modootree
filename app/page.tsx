'use client';

import { useEffect, useState, useCallback } from 'react';
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import LoginOutButton from '@/components/ui/LoginOutButton';
import Image from 'next/image';
import { BottomTabs } from '@/components/ui/bottom-tabs';
import { cn } from "@/lib/utils";
import { Plus } from 'lucide-react';

const menuItems = [
  {
    title: "AI 사진 투표",
    description: `AI가 만들어 주는 사진 투표
당신의 선택은?`,
    icon: "/logos/ai2.png",
    path: "/photo-story",
    color: "from-blue-500 to-purple-500"
  },
  {
    title: "AI 사연 투표",
    description: "AI가 만들어 주는 사연 투표\n당신의 선택은?",
    icon: "/logos/ai3.png",
    path: "/modoo-ai",
    color: "from-purple-500 to-pink-500"
  },
  {
    title: "공감 한 조각",
    description: "기쁨 슬픔 등의 내 감정 기록\n 은근 공감 받는 공유 익명 일기",
    icon: "/logos/ai1.png",
    path: "/login",
    color: "from-pink-500 to-red-500"
  },
    {
      title: "내 사이트 무료",
      description: "나만의 특별한 한 페이지\nAI조언 부터 감정 분석 위로",
      icon: "/logos/m12.png",
      path: "/farmtoolceo",
      color: "from-green-500 to-blue-500"
    },
    {
      title: "열린 게시판",
      description: "의견 말씀 감사합니다\n열린 게시판 및 카카오톡 채팅",
      icon: "/logos/ai4.png",
      path: "/inquiry",
      color: "from-blue-400 to-cyan-500"
    }
];

export default function HomePage() {
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white/90 relative">
      <Particles
        className="absolute inset-0"
        init={particlesInit}
          options={{
            fpsLimit: 120,
            particles: {
              color: {
                value: "#ffffff",
              },
              links: {
                color: "#ffffff",
                distance: 150,
                enable: true,
                opacity: 0.2,
                width: 1,
              },
              move: {
                enable: true,
                outModes: {
                  default: "bounce",
                },
                random: false,
                speed: 1,
                straight: false,
              },
              number: {
                density: {
                  enable: true,
                  area: 800,
                },
                value: 100,
              },
              opacity: {
                value: 0.2,
              },
              shape: {
                type: "circle",
              },
              size: {
                value: { min: 1, max: 3 },
              },
            },
            detectRetina: true
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col">
        <LoginOutButton />
        
        <div className="container mx-auto px-4 flex-1 flex items-center">
           <div className="w-full mt-15 md:-mt-20">
            <div className="text-center mb-6">
              <div className="flex justify-center">
                <button 
                  onClick={() => router.push('/site')} 
                  className="animate-swing mb-2 relative cursor-pointer group inline-flex"
                >
                  <Image
                    src="/Image/logo.png"
                    alt="모두트리 로고"
                    width={250}
                    height={250}
                    priority
                    className="w-24 h-24 md:w-32 md:h-32"
                  />
                  <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1.5 shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                </button>
              </div>
              <h1 className="text-3xl font-bold text-white/90 mb-2">모두트리</h1>
              <p className="text-1xl md:text-1xl font-medium text-white mb-4">우주 안의 나, 모두트리의 너</p>

              {/* 로고 섹션 */}
              <div className="w-full overflow-x-auto overflow-y-hidden py-2 mb-4">
                <div className="flex flex-nowrap items-center justify-start md:justify-center gap-4 md:gap-6 px-4 min-w-max md:min-w-0">
                  {[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map((num) => (
                    <img
                      key={num}
                      src={`/logos/m${num}.png`}
                      alt={`Logo ${num}`}
                      className="w-12 h-12 object-contain transition-all hover:scale-110 flex-shrink-0"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 메뉴 그리드 */}
             <div className="max-w-[1030px] mx-auto p-4 mb-10 md:mb-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {menuItems.map((item, index) => (
                    <div key={index} className="flex justify-start">
                      <button
                        onClick={() => router.push(item.path)}
                        className={`w-[330px] md:w-[316px] aspect-[3/1] group relative overflow-hidden rounded-[20px] bg-gradient-to-r from-blue-500/10 to-blue-600/20 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] shadow-lg border ${
                          index === 0 ? 'border-yellow-300/50' :
                          index === 1 ? 'border-orange-300/50' :
                          index === 2 ? 'border-rose-200/50' :
                          index === 3 ? 'border-emerald-200/50' :
                          'border-white/40'
                        }`}
                    >
                      <div className="h-full px-4 flex items-center">
                        {/* Row */}
                        <div className="flex items-center w-full">
                          {/* 아이콘 영역 */}
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/10 p-2 shadow-sm backdrop-blur-sm">
                            <Image
                              src={item.icon}
                              alt={item.title}
                              width={24}
                              height={24}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          
                          {/* Column: 제목/설명 영역 */}
                          <div className="flex flex-col ml-5 flex-grow min-w-0 text-left">
                            <h2 className="text-lg font-bold text-white/90 truncate text-left mb-1">{item.title}</h2>
                            <p className="text-sm text-white/60 text-left whitespace-pre-line">{item.description}</p>
                          </div>

                          {/* 컬러 바 */}
                          <div className={`w-1 h-12 rounded-full ml-4 flex-shrink-0 ${item.color}`} />
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <BottomTabs />
      </div>
    </div>
  );
}