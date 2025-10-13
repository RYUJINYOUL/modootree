'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import LoginOutButton from '@/components/ui/LoginOutButton';
import { db, auth } from '@/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { saveChat, loadChat } from '@/lib/comfort-chat-service';
import Image from 'next/image';
import { BottomTabs } from '@/components/ui/bottom-tabs';
import { cn } from "@/lib/utils";
import { Plus, MessageCircle, Bot, Send } from 'lucide-react';
import { Dialog } from '@headlessui/react';

export default function HomePage() {
  const currentUser = useSelector((state: any) => state.user.currentUser);
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [showAiComfort, setShowAiComfort] = useState(false);
  const [comfortMessage, setComfortMessage] = useState('');
  const [isComfortLoading, setIsComfortLoading] = useState(false);
  const [remainingChats, setRemainingChats] = useState<number | null>(null);
  const [comfortConversation, setComfortConversation] = useState([{
    role: 'ai',
    content: '안녕하세요! 모두트리 AI 상담사입니다. 😊\n\n저는 여러분의 이야기를 듣고 공감하며, 함께 고민하고 해결책을 찾아가는 것을 돕고 있어요.\n\n편하게 이야기를 시작해주세요.',
    timestamp: new Date()
  }]);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 추가될 때마다 스크롤 자동 이동
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [comfortConversation]);

  // 이전 대화 내용 불러오기
  useEffect(() => {
    const loadPreviousChat = async () => {
      if (!currentUser?.uid) return;
      try {
        const messages = await loadChat(currentUser.uid);
        if (messages.length > 0) {
          setComfortConversation(messages);
        }
      } catch (error) {
        console.error('이전 대화 불러오기 실패:', error);
      }
    };
    loadPreviousChat();
  }, [currentUser]);

  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser?.uid) return;
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      } catch (e) {
        console.error('사용자 데이터 로드 중 오류:', e);
      }
    };
    loadUserData();
  }, [currentUser]);

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

  const menuItems = [
    {
      title: "AI 예술 작품",
      description: "사진을 예술 작품으로 변화되는\n 즐거움을 선물합니다",
      icon: "/logos/ai5.png",
      path: "/art-generation"
    },
    {
      title: "AI 건강 기록",
      description: "당신의 건강한 하루를\nAI가 분석해 드립니다",
      icon: "/logos/ai1.png",
      path: "/health",
      color: "from-emerald-500 to-teal-500"
    },
    {
      title: "AI 사진 투표",
      description: `AI가 만들어 주는 사진 투표\n당신의 선택은?`,
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
      icon: "/logos/ai6.png",
      path: "/likes/all",
      color: "from-pink-500 to-red-500"
    },
    {
      title: "내 사이트",
      description: "AI 분석과 조언으로\n 나만의 감정 지도를 완성하세요",
      icon: "/logos/m12.png",
      path: !currentUser?.uid ? '/login' : (userData?.username ? `/${userData.username}` : '#'),
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

  return (
    <div className="min-h-screen bg-black text-white/90 relative">
      <Particles
        className="absolute inset-0"
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

      <div className="relative z-10 min-h-screen flex flex-col">
        <LoginOutButton />
        
        {/* AI 상담 대화창 */}
        {showAiComfort && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAiComfort(false)} />
            <div className="relative w-full max-w-4xl bg-gray-900/90 rounded-2xl border border-blue-500/20 shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setShowAiComfort(false)}
                  className="text-white/80 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 대화 내용 영역 */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-6 scroll-smooth scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent"
              >
                <div className="space-y-4 pb-2">
                  {comfortConversation.map((msg, idx) => (
                    <div key={idx} className={cn("flex items-start gap-3", msg.role === 'user' && "flex-row-reverse")}>
                      {msg.role === 'ai' && (
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-5 h-5 text-blue-500" />
                        </div>
                      )}
                      <div className={cn(
                        "flex-1 rounded-2xl p-4 text-white/90",
                        msg.role === 'ai' ? "bg-gray-800/50" : "bg-blue-600/50"
                      )}>
                        {msg.content.split('\n').map((line, i) => (
                          <p key={i} className={i < msg.content.split('\n').length - 1 ? "mb-3" : ""}>
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 남은 대화 횟수 표시 */}
              {remainingChats !== null && (
                <div className="p-2 bg-gray-900/90 border-t border-blue-500/20 flex justify-center">
                  <span className="text-sm text-white/70">
                    오늘 남은 대화 횟수: {remainingChats}회
                  </span>
                </div>
              )}

              {/* 입력 영역 */}
              <div className="p-4 bg-gray-900/90 border-t border-blue-500/20">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!comfortMessage.trim() || isComfortLoading) return;

                  // 로그인 상태 확인
                  if (!auth.currentUser) {
                    setComfortConversation(prev => [...prev, {
                      role: 'ai' as const,
                      content: '로그인이 필요한 서비스입니다. 로그인 후 다시 시도해주세요.',
                      timestamp: new Date()
                    }]);
                    router.push('/login');
                    return;
                  }

                  const userMessage = comfortMessage;
                  setComfortMessage('');
                  setIsComfortLoading(true);

                  try {
                    // 토큰 갱신 시도
                    await auth.currentUser.reload();
                    let token;
                    try {
                      // 토큰 강제 갱신
                      await auth.currentUser.getIdTokenResult(true);
                      token = await auth.currentUser.getIdToken();
                      console.log('토큰 갱신 성공');
                    } catch (tokenError) {
                      console.error('토큰 갱신 실패:', tokenError);
                      throw new Error('인증 토큰을 갱신할 수 없습니다. 다시 로그인해주세요.');
                    }
                    
                    // 사용자 메시지 추가 및 저장
                    const userMsg = {
                      role: 'user' as const,
                      content: userMessage,
                      timestamp: new Date()
                    };
                    setComfortConversation(prev => [...prev, userMsg]);
                    await saveChat(auth.currentUser.uid, userMsg);
                    const response = await fetch('/api/ai-comfort', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        message: userMessage,
                        token,
                        conversationHistory: comfortConversation
                      })
                    });

                    const data = await response.json();
                    if (!data.success) throw new Error(data.error);

                    // 남은 대화 횟수 업데이트
                    setRemainingChats(data.remainingChats);

                    // AI 응답 추가 및 저장
                    const aiMsg = {
                      role: 'ai' as const,
                      content: data.response,
                      timestamp: new Date()
                    };
                    setComfortConversation(prev => [...prev, aiMsg]);
                    await saveChat(auth.currentUser.uid, aiMsg);

                  } catch (error: any) {
                    console.error('AI 상담 오류:', error);
                    
                    // 인증 관련 오류 처리
                    if (error.message.includes('인증') || error.message.includes('로그인')) {
                      setComfortConversation(prev => [...prev, {
                        role: 'ai' as const,
                        content: '로그인이 만료되었습니다. 다시 로그인해주세요.',
                        timestamp: new Date()
                      }]);
                      router.push('/login');
                    } else {
                      setComfortConversation(prev => [...prev, {
                        role: 'ai' as const,
                        content: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 🙏',
                        timestamp: new Date()
                      }]);
                    }
                  } finally {
                    setIsComfortLoading(false);
                  }
                }}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={comfortMessage}
                      onChange={(e) => setComfortMessage(e.target.value)}
                      placeholder="메시지를 입력하세요..."
                      className="flex-1 bg-gray-800/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button 
                      type="submit" 
                      disabled={isComfortLoading || !currentUser?.uid}
                      className={cn(
                        "bg-blue-600 text-white rounded-xl px-4 transition-colors flex items-center justify-center min-w-[44px] h-[44px]",
                        isComfortLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
                      )}
                    >
                      {isComfortLoading ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white/90 rounded-full animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        
        <div className="container mx-auto px-4 flex-1 flex items-center">
          <div className="w-full mt-15 md:-mt-20">
            <div className="text-center mb-6">
              <div className="flex justify-center">
                <button 
                  onClick={() => router.push('/site')} 
                  className="mb-2 relative cursor-pointer group inline-flex"
                >
                  <Image
                    src="/Image/logo.png"
                    alt="모두트리 로고"
                    width={250}
                    height={250}
                    priority
                    className="w-24 h-24 md:w-32 md:h-32 transition-transform duration-300 hover:scale-105"
                  />
                  <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1.5 shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                </button>
              </div>
              <h1 className="text-3xl font-bold text-white/90 mb-2">모두트리</h1>
              <p className="text-1xl md:text-1xl font-medium text-white mb-2">우주 안의 나, 모두트리의 너</p>

              {/* 공지사항 */}
              <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-xl px-4 py-3 mb-4 max-w-md mx-auto">
                <p className="text-white/90 font-medium">🎉 10월 15일 정식 오픈 예정</p>
                <p className="text-white/70 text-sm mt-1">웹사이트에 일부 오류가 있을 수 있습니다.</p>
              </div>

              {/* 로고 섹션 */}
              <div className="w-full overflow-x-auto overflow-y-hidden py-2 mb-4">
                <div className="flex flex-nowrap items-center justify-start md:justify-center gap-4 md:gap-6 px-4 min-w-max md:min-w-0">
                  {[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map((num) => (
                    <button
                      key={num}
                      onClick={() => router.push('/ai-comfort')}
                      className="group relative"
                    >
                      <img
                        src={`/logos/m${num}.png`}
                        alt={`Logo ${num}`}
                        className="w-12 h-12 object-contain transition-all group-hover:scale-110 flex-shrink-0"
                      />
                    </button>
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
                      onClick={() => {
                        if (currentUser?.uid && !userData?.username && item.title === "내 사이트") {
                          setIsOpen(true);
                        } else if (item.path !== '#') {
                          router.push(item.path);
                        }
                      }}
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

      {/* 모달 */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

        <Dialog.Panel className="bg-blue-900/90 p-8 rounded-2xl shadow-lg z-50 max-w-sm w-full relative border border-blue-500/30 backdrop-blur-lg">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 text-blue-200 hover:text-white text-xl transition-colors"
            aria-label="닫기"
          >
            &times;
          </button>

          <h2 className="text-blue-100 text-xl font-bold mb-6 text-center">새 페이지 만들기</h2>
          
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center bg-blue-950/50 rounded-xl shadow-inner p-4 border border-blue-400/20 focus-within:border-blue-400 transition-all w-full">
              <span className="text-blue-200 text-lg mr-1">modootree.com/</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.trim());
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveUsername();
                  }
                }}
                placeholder="ID"
                className="flex-grow text-blue-200 text-lg outline-none bg-transparent placeholder-blue-300/30"
              />
            </div>

            <p className="text-blue-200/80 text-sm">
              ID 입력 후 Enter를 눌러주세요
            </p>
          </div>

          {error && (
            <p className="text-red-300 text-sm mt-4 text-center animate-pulse">
              {error}
            </p>
          )}
        </Dialog.Panel>
      </Dialog>
    </div>
  );

  async function handleSaveUsername() {
    if (!username) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    const usernameRef = doc(db, 'usernames', username);
    const existing = await getDoc(usernameRef);
    if (existing.exists()) {
      setError('이미 사용 중인 닉네임입니다.');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        username,
      });

      await setDoc(doc(db, "users", currentUser.uid, "links", "page"), {
        components: [],
        type: null
      });
      
      await setDoc(usernameRef, {
        uid: currentUser.uid,
      });

      setIsOpen(false);
      router.push(`/editor/${username}`);
    } catch (err) {
      setError('저장 중 오류가 발생했습니다.');
    }
  }
}