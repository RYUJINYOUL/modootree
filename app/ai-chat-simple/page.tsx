'use client';
import { useState, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { auth } from '@/firebase';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Particles from "react-tsparticles"; // Particles 임포트
import { loadSlim } from "tsparticles-slim"; // loadSlim 임포트
import LoginOutButton from '@/components/ui/LoginOutButton'; // LoginOutButton 임포트

export default function AIChatSimplePage() {
  const [inputMessage, setInputMessage] = useState('');
  const router = useRouter();

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    router.push(`/search?initialMessage=${encodeURIComponent(inputMessage)}`);
    setInputMessage('');
  };

  // Particles 초기화
  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  return (
    <main className={cn(
      "flex flex-col h-screen text-white relative bg-gray-900 justify-center items-center"
    )}>
      <Particles
        className="fixed inset-0"
        init={particlesInit}
        options={{
          fpsLimit: 120,
          particles: {
            color: {
              value: ["#ffffff", "#87CEEB", "#FFD700"]
            },
            links: {
              color: "#ffffff",
              distance: 150,
              enable: true,
              opacity: 0.05,
              width: 1,
            },
            collisions: {
              enable: false,
            },
            move: {
              direction: "none",
              enable: true,
              outModes: {
                default: "out"
              },
              random: true,
              speed: { min: 0.1, max: 0.3 },
              straight: false,
              attract: {
                enable: true,
                rotate: {
                  x: 600,
                  y: 1200
                }
              }
            },
            number: {
              density: {
                enable: true,
                area: 800
              },
              value: 120
            },
            opacity: {
              animation: {
                enable: true,
                minimumValue: 0.1,
                speed: 1,
                sync: false
              },
              random: true,
              value: { min: 0.1, max: 0.8 }
            },
            shape: {
              type: "circle"
            },
            size: {
              animation: {
                enable: true,
                minimumValue: 0.1,
                speed: 2,
                sync: false
              },
              random: true,
              value: { min: 1, max: 3 }
            },
            twinkle: {
              lines: {
                enable: true,
                frequency: 0.005,
                opacity: 0.5,
                color: {
                  value: ["#ffffff", "#87CEEB"]
                }
              },
              particles: {
                enable: true,
                frequency: 0.05,
                opacity: 0.5
              }
            }
          },
          detectRetina: true
        }}
      />

      {/* LoginOutButton을 고정된 헤더로 추가 */}
      <div className="fixed top-0 left-0 right-0 z-20 w-full">
        <LoginOutButton />
      </div>

      {/* 상단 텍스트 */}
      <div className="flex flex-col justify-center items-center flex-1 w-full relative z-10 pt-[80px]"> {/* 헤더 높이만큼 pt 추가 */}
        <div className="text-center mb-1">
          <p className="text-2xl text-gray-400">AI 대화로 나의 하루를 기록하세요.</p>
        </div>

        {/* 입력창과 버튼 영역 */}
        <div className="flex items-center gap-2 w-full px-[20px] md:px-[600px] mt-4">
          <Textarea
            placeholder="AI에게 메시지를 보내세요... (엔터로 줄 바꿈, 전송은 아이콘 클릭)"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500 resize-none py-1 min-h-[55px] max-h-[120px] overflow-y-auto"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold !py-7 !px-5 rounded-lg"
          >
            <Send className="!w-6 !h-6" />
          </Button>
        </div>

        {/* 하단 아이콘 버튼들 */} 
        <div className="w-full flex justify-center mt-3 px-[10px] md:px-[100px] relative z-10"> 
          <div className="flex flex-row overflow-x-auto gap-4 py-2 scrollbar-hide">
            {[ 
              { icon: "/logos/feed.png", path: "/feed" },
              { icon: "/logos/news.png", path: "/news-vote" },
              { icon: "/logos/ai5.png", path: "/art-generation" },
              { icon: "/logos/ai1.png", path: "/health" },
              { icon: "/logos/ai2.png", path: "/photo-story" },
              { icon: "/logos/ai3.png", path: "/modoo-ai" },
              { icon: "/logos/m12.png", path: "/site" }, // '내 사이트'는 동적 경로이므로 임시 경로 설정
            ].map((item, index) => (
              <Link key={index} href={item.path || '#'}>
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors w-[50px] h-[50px] flex-shrink-0">
                  <img src={item.icon} alt="icon" className="w-8 h-8 object-contain" />
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
