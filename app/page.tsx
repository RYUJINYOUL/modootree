'use client';
import { useState, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Send, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { auth } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Particles from "react-tsparticles"; // Particles 임포트
import { loadFull } from "tsparticles"; // loadFull 임포트
import LoginOutButton from '@/components/ui/LoginOutButton'; // LoginOutButton 임포트

export default function Home() {
  const [inputMessage, setInputMessage] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const router = useRouter();


  const suggestedQueries = [
    { text: "모두트리 내 페이지를 설명해줘" },
    { text: "오늘 대화 내용으로 일기 메모 건강 분석 가능해?" },
    { text: "모투트리 문의 게시판은 어디에 있는거야?" }
  ];



  // 드래그/스와이프 핸들러
  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    setCurrentX(clientX);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    setCurrentX(clientX);
  };


  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const user = auth.currentUser;
    if (!user) {
      setShowLoginDialog(true);
      return;
    }

    const targetUrl = `/ai-comfort?initialMessage=${encodeURIComponent(inputMessage)}`;
    console.log('handleSendMessage - 이동할 URL:', targetUrl);
    router.push(targetUrl);
    setInputMessage('');
  };

  // Particles 초기화
  const particlesInit = useCallback(async (engine: any) => {
    await loadFull(engine);
  }, []);

  return (
    <main className={cn(
      "flex flex-col h-screen text-white relative bg-gray-900 justify-center items-center overflow-hidden"
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
              opacity: 0.02,
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
              speed: { min: 0.05, max: 0.1 },
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
              value: 80
            },
            opacity: {
              animation: {
                enable: true,
                minimumValue: 0.1,
                speed: 1,
                sync: false
              },
              random: true,
              value: { min: 0.1, max: 0.4 }
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
              value: { min: 1, max: 2 }
            },
            twinkle: {
              lines: {
                enable: true,
                frequency: 0.001,
                opacity: 0.1,
                color: {
                  value: ["#ffffff", "#87CEEB"]
                }
              },
              particles: {
                enable: true,
                frequency: 0.02,
                opacity: 0.3
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

      {/* 로고 이미지 */}
      <div className="flex flex-col items-center flex-1 w-full relative z-10 pt-[20vh]"> {/* 상단에서 30% 위치로 조정 */}
        <Link href="/profile" className="transform hover:scale-105 transition-transform">
          <img src="/logos/logohole.png" alt="Logo" className="w-32 h-32 object-contain" />
        </Link>


        <div className="text-center mb-1">
          <p className="text-2xl text-gray-400 md:block hidden">모두트리 AI로 기록하는 나만의 페이지</p>
          <div className="md:hidden block">
            <p className="text-[20px] text-gray-300">모두트리 AI로 기록, 나만의 페이지</p>
          </div>
        </div>

        {/* 입력창과 버튼 영역 */}
        <div className="flex items-center gap-2 w-full px-4 md:max-w-3xl mx-auto mt-4">
          <div className="flex-1 relative">
            <Textarea
              placeholder="안녕하세요 모두트리 AI입니다, 요즘 어떠신가요?"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
              className="flex-1 w-full bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500 resize-none py-1 min-h-[55px] max-h-[120px] overflow-y-auto"
            />
            {isInputFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden z-20">
                {suggestedQueries.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInputMessage(query.text);
                      setIsInputFocused(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-3 hover:bg-gray-700/50 transition-colors text-left"
                  >
                    <Search className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">{query.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
              // { icon: "/logos/feed.png", path: "/feed" }, // AI와 함께 이야기 - 비공개
              { icon: "/logos/ai5.png", path: "/link-letter" },
              { icon: "/logos/news.png", path: "/news-vote" },
              // { icon: "/logos/ai5.png", path: "/art-generation" }, // 사진 예술 작품 - 비공개
              { icon: "/logos/m1.png", path: "/profile" },
              { icon: "/logos/ai1.png", path: "/health" },
              { icon: "/logos/ai4.png", path: "/inquiry" },
              // { icon: "/logos/ai2.png", path: "/photo-story" }, // 공유 익명 일기 - 비공개
              // { icon: "/logos/ai3.png", path: "/modoo-vote" }, // 한페이지 선물 - 비공개
              // { icon: "/logos/m12.png", path: "/site" }, // 내 사이트 페이지 - 비공개
            ].filter(item => item).map((item, index) => (
              <Link key={index} href={item.path || '#'}>
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors w-[50px] h-[50px] flex-shrink-0">
                  <img src={item.icon} alt="icon" className="w-8 h-8 object-contain" />
                </div>
              </Link>
            ))}
          </div>
        </div>


      </div>

      {/* 프로필 플로팅 버튼 */}
      <Link
        href="/profile"
        className="fixed bottom-4 right-4 z-[40] w-10 h-10 bg-[#56ab91]/60 rounded-full flex items-center justify-center shadow-lg hover:bg-[#56ab91]/80 transition-all group hover:scale-110 hover:shadow-xl active:scale-95 ring-2 ring-[#358f80]/50"
      >
        <img src="/logos/m1.png" alt="Profile" className="w-6 h-6 object-contain" />
        <span className="absolute right-full mr-3 px-2 py-1 bg-gray-900/80 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          내 페이지
        </span>
      </Link>

      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="bg-gray-900 text-white border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">모두트리에 오신 것을 환영합니다!</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <Link href="/news-vote" className="w-full">
              <Button variant="outline" className="w-full bg-gray-800 hover:bg-gray-700 text-white border-gray-700">
                회원가입 없이 둘러보기
              </Button>
            </Link>
            <Link href="/register" className="w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                5초 회원가입
              </Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button variant="secondary" className="w-full bg-green-600 hover:bg-green-700 text-white">
                3초 로그인
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}