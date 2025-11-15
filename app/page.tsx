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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserSampleCarousel2 from '@/components/UserSampleCarousel2';
import UserSampleCarousel3 from '@/components/UserSampleCarousel3';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function Home() {
  const [inputMessage, setInputMessage] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const router = useRouter();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // FAQ 데이터
  const faqs = [
    {
      question: '모두트리는 무료인가요?',
      answer: '네, 모두트리의 모든 기능은 모두 무료로 제공됩니다.'
    },
    {
      question: '내 사이트는 몇 개까지 만들 수 있나요?',
      answer: '계정당 1개의 페이지를 만들 수 있습니다.'
    },
    {
      question: '모든 투표 생성은 익명으로 가능한가요?',
      answer: '네 모두트리 모든 투표는 익명 필수 조건입니다, 하지만 투표나 게시물의 답글은 일부 익명은 아닙니다'
    },
    {
      question: '다른 사람의 사이트를 수정할 수 있나요?',
      answer: '일부 컴포넌트에서 사이트 소유자가 초대한 경우에만 수정 가능합니다.'
    },
    {
      question: '사이트 주소를 변경할 수 있나요?',
      answer: '아니요, 현재는 한 번 설정한 페이지 주소는 변경할 수 없습니다. 신중하게 설정해주세요.'
    },
    {
      question: '추가 개선하고 싶은 기능은 있나요?',
      answer: '열린게시판에 글 남겨주시면 최대한 반영하겠습니다.'
    },
    {
      question: 'AI 기능은 어떤 컴포넌트에서 가능한가요?',
      answer: '현재는 일부 컴포넌트에서만 가능한데 추후 전체 컴포넌트에 적용될 예정입니다'
    },
    {
      question: '제작하는 방법을 잘 모르겠습니다?',
      answer: '카카오톡 채널 실시간 문의 주세요, 열린 게시판 내 카톡 문의 버튼 클릭'
    }
  ];


  const suggestedQueries = [
    { text: "모두트리 내 페이지를 설명해줘" },
    { text: "링크편지 설명해줘" },
    { text: "오늘 대화 내용으로 일기 메모 건강 분석 가능해?" },
    { text: "모투트리 문의 게시판은 어디에 있는거야?" },
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
      "flex flex-col min-h-screen text-white relative bg-gray-900 justify-center items-center overflow-hidden"
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
<div className="w-full flex justify-center mt-3 mb-30 px-[10px] md:px-[100px] relative z-10">
  <div className="flex flex-row overflow-x-auto gap-4 py-2 scrollbar-hide">
    {[
      // ... 기존 아이템 목록 ...
      { icon: "/logos/m12.png", path: "/pros-menu" },
      { icon: "/logos/news.png", path: "/news-vote" },
      { icon: "/logos/ai1.png", path: "/health" },
      { icon: "/logos/ai4.png", path: "/inquiry" },
      { icon: "/logos/m1.png", path: "/profile" },
    ].filter(item => item).map((item, index) => (
      <Link key={index} href={item.path || '#'}>
        <div 
          className={`
            flex flex-col items-center justify-center p-3 rounded-xl transition-colors w-[50px] h-[50px] flex-shrink-0
            ${
              index === 0 // ⬅️ 여기! 첫 번째 버튼(index가 0)일 때만 핑크색 적용
                ? "bg-pink-600/30 hover:bg-pink-500/50" 
                : "bg-gray-800/50 hover:bg-gray-700/50"
            }
          `}
        >
          <img src={item.icon} alt="icon" className="w-8 h-8 object-contain" />
        </div>
      </Link>
    ))}
  </div>
</div>


      </div>

      {/* 모두트리 소개 섹션 */}
      <section className="w-[97%] py-8 md:py-12 my-8 mx-5 mb-10">
        <div className="w-full bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 rounded-3xl relative overflow-hidden">
          <div className="relative z-20 py-8 px-4">
            <div className="max-w-[1500px] mx-auto">
              <Tabs defaultValue="features" className="w-full custom-home-tabs">
                <TabsList className="w-full justify-center mb-4 mt-10 bg-transparent border-none gap-2 custom-homeTabslist">
                  <TabsTrigger className="px-6 py-3 text-[15px]" value="examples">커뮤니티</TabsTrigger>
                  <TabsTrigger className="px-6 py-3 text-[15px]" value="features">내 사이트</TabsTrigger>
                </TabsList>

                <TabsContent value="features">
                  <div className="relative rounded-2xl py-4 overflow-hidden">
                    <div className="relative z-10 py-4">
                      <div className="flex flex-col items-center justify-center text-center">
                        <h2 className="md:hidden text-xl font-medium text-white/90 mb-12 leading-relaxed">
                          모두트리 Ai 대화 하루를 정리하세요.<br /> AI가 하루를 분석해 일기 메모 건강 분석까지 내사이트에 자동으로 저장해 드립니다 
                        </h2>
                        <h2 className="md:block hidden text-2xl font-medium text-white/90 mb-12 leading-relaxed">
                          모두트리 AI 대화로 하루를 정리 하세요.<br /> AI가 하루 분석, 일기 메모 건강 상태 내 사이트 자동 저장  
                        </h2>
                      </div>
                      <UserSampleCarousel2 />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="examples">
                  <div className="relative rounded-2xl py-4 overflow-hidden">
                    <div className="relative z-10 py-4">
                      <div className="flex flex-col items-center justify-center text-center">
                        <h2 className="md:hidden text-xl font-medium text-white/90 mb-12 leading-relaxed">
                          즐거운 모두트리 커뮤니티에 초대합니다<br /> 뉴스투표 · 사연투표 · 사진투표 ·건강분석 · 사진변환 · 열린게시판
                        </h2>
                        <h2 className="md:block hidden text-2xl font-medium text-white/90 mb-12 leading-relaxed">
                          즐거운 모두트리 커뮤니티에 초대합니다<br /> 뉴스투표 · 사연투표 · 사진투표 ·건강분석 · 사진변환 · 열린게시판
                        </h2>
                      </div>
                      <UserSampleCarousel3 />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </section>

      {/* 문의하기 섹션 */}
      <div className="w-[97%] bg-[#415a77] backdrop-blur-sm rounded-3xl mb-12 relative overflow-hidden mx-5">
        <div className="max-w-[800px] mx-auto px-4 py-16 relative z-10">
          <div className="flex flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-bold text-white mb-6 mt-2">
              자주 묻는 질문
            </h2>
            <div className="w-full max-[800px] space-y-2 mb-12">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                  >
                    <h3 className="text-white font-medium">{faq.question}</h3>
                    {openFaqIndex === index ? (
                      <ChevronUp className="w-5 h-5 text-white flex-shrink-0 ml-4" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white flex-shrink-0 ml-4" />
                    )}
                  </button>
                  {openFaqIndex === index && (
                    <div className="px-6 py-4 border-t border-white/10">
                      <p className="text-white/70 text-sm">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-white/80 mb-6">
              저희 모두트리에게 하실 말씀 있으신가요?
            </p>
            <Link
              href="/inquiry"
              className="inline-flex items-center px-6 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-white font-medium rounded-xl transition-colors border-2 border-blue-500/50 hover:border-blue-500/70"
            >
              의견 작성하기
            </Link>
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