'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase';
import { Bot, Send, ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";
import { cn } from "@/lib/utils";
import { saveChat, loadChat } from '@/lib/comfort-chat-service';

export default function AiComfortPage() {
  const router = useRouter();
  const [isMuted, setIsMuted] = useState(true);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [comfortMessage, setComfortMessage] = useState('');
  const [isComfortLoading, setIsComfortLoading] = useState(false);
  const [remainingChats, setRemainingChats] = useState<number | null>(null);
  const [comfortConversation, setComfortConversation] = useState([{
    role: 'ai',
    content: '안녕하세요! 모두트리 AI입니다. 😊\n\n저는 여러분의 이야기를 경청하고 공감하며, 함께 고민하고 해결책을 찾아가는 것을 돕고 있어요.\n\n무엇이든 편하게 이야기해주세요.',
    timestamp: new Date()
  }]);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  // 새 메시지가 추가될 때마다 스크롤 자동 이동
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [comfortConversation]);

  // 음악 자동 재생을 위한 처리
  useEffect(() => {
    const audio = document.getElementById('bgMusic') as HTMLAudioElement;
    if (audio) {
      console.log('Audio element found');
      
      // 음악 로드 시작 시
      audio.addEventListener('loadstart', () => {
        console.log('Audio loading started');
      });

      // 음악 로드 완료 시
      audio.addEventListener('loadeddata', () => {
        console.log('Audio loaded successfully');
        setIsAudioLoaded(true);
        audio.volume = 0.05; // 볼륨을 5%로 설정
      });

      // 음악 재생 오류 시
      audio.addEventListener('error', (e) => {
        console.error('Audio loading error:', e);
        console.error('Audio error code:', audio.error?.code);
        console.error('Audio error message:', audio.error?.message);
        setIsAudioLoaded(false);
      });

      // 자동 재생 시도
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsMuted(false);
        }).catch((error) => {
          // 자동 재생이 차단된 경우
          console.log('Autoplay prevented:', error);
          setIsMuted(true);
        });
      }
    }

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      if (audio) {
        audio.removeEventListener('loadeddata', () => {});
        audio.removeEventListener('error', () => {});
      }
    };
  }, []);

  // 인증 상태 및 이전 대화 내용 불러오기
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const messages = await loadChat(user.uid);
        if (messages.length > 0) {
          setComfortConversation(messages);
        }
      } catch (error) {
        console.error('이전 대화 불러오기 실패:', error);
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [router]);

  return (
      <div className="min-h-screen bg-black text-gray-300/90 relative">
       <Particles
         className="fixed inset-0"
         init={particlesInit}
         options={{
           fpsLimit: 60,
           particles: {
             color: {
               value: ["#ffffff", "#87CEEB"]
             },
             links: {
               color: "#ffffff",
               distance: 150,
               enable: true,
               opacity: 0.02,
               width: 1
             },
             collisions: {
               enable: false
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
               value: 100
             },
             opacity: {
               animation: {
                 enable: true,
                 minimumValue: 0.1,
                 speed: 1,
                 sync: false
               },
               random: true,
               value: { min: 0.1, max: 0.3 }
             },
             shape: {
               type: "circle"
             },
             size: {
               value: { min: 1, max: 2 }
             },
             twinkle: {
               lines: {
                 enable: true,
                 frequency: 0.005,
                 opacity: 0.2,
                 color: {
                   value: ["#ffffff", "#87CEEB"]
                 }
               },
               particles: {
                 enable: true,
                 frequency: 0.05,
                 opacity: 0.2
               }
             }
           },
           detectRetina: true
         }}
       />
      {/* 헤더 */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-gray-900/90 backdrop-blur-lg border-b border-blue-500/20">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
               className="text-gray-300/90 hover:text-gray-200"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold">모두트리 AI</h1>
          </div>
          {isAudioLoaded && (
            <button
              onClick={() => {
                const audio = document.getElementById('bgMusic') as HTMLAudioElement;
                if (audio) {
                  if (isMuted) {
                    const playPromise = audio.play();
                    if (playPromise !== undefined) {
                      playPromise.then(() => {
                        audio.volume = 0.05;
                        setIsMuted(false);
                      }).catch((error) => {
                        console.log('Play prevented:', error);
                      });
                    }
                  } else {
                    audio.pause();
                    setIsMuted(true);
                  }
                }
              }}
              className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-all group"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
              <span className="absolute right-full mr-3 px-2 py-1 bg-gray-900/80 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                배경 음악 {isMuted ? '재생' : '일시정지'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 대화 내용 영역 */}
       <div 
         ref={chatContainerRef}
         className="fixed top-[64px] bottom-[80px] left-0 right-0 overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent"
       >
        <div className="container mx-auto px-4">
          <div className="mb-8"></div>
          <div>
            {comfortConversation.map((msg, idx) => (
            <div key={idx} className={cn("flex items-start gap-3 mb-6", 
              msg.role === 'user' ? "flex-row-reverse" : ""
            )}>
              {msg.role === 'ai' ? (
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-blue-500" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img
                    src="/Image/logo.png"
                    alt="User"
                    className="w-6 h-6 object-contain"
                  />
                </div>
              )}
                      <div className={cn(
                        "inline-block rounded-2xl p-4 text-gray-300/90 max-w-[80%]",
                        msg.role === 'ai' ? "bg-gray-800/50" : "bg-blue-600/50"
                      )}>
                        {'isLoading' in msg && msg.isLoading ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        ) : (
                          msg.content.split('\n').map((line, i) => (
                            <p key={i} className={i < msg.content.split('\n').length - 1 ? "mb-3" : ""}>
                              {line}
                            </p>
                          ))
                        )}
                      </div>
            </div>
          ))}
          </div>
          <div className="mb-8"></div>
        </div>
      </div>


      {/* 배경 음악 */}
      <audio id="bgMusic" loop preload="auto">
        <source src="/music/background.mp3" type="audio/mpeg" />
        음악 파일을 재생할 수 없습니다.
      </audio>

      {/* 하단 입력 영역 */}
       <div className="fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-lg border-t border-blue-500/20 pb-safe z-10">
        <div className="container mx-auto px-4 py-4">
          <form onSubmit={async (e) => {
            e.preventDefault();
                  if (!comfortMessage.trim() || isComfortLoading) return;

                  const user = auth.currentUser;
                  if (!user) return; // 이미 onAuthStateChanged에서 처리됨

            const userMessage = comfortMessage;
            setComfortMessage('');
            setIsComfortLoading(true);

            try {
              if (!auth.currentUser) {
                throw new Error('인증이 필요합니다.');
              }
              // 토큰 갱신 시도
              await auth.currentUser.reload();
              const token = await auth.currentUser.getIdToken(true);
              
              // 사용자 메시지 추가 및 저장
              const userMsg = {
                role: 'user' as const,
                content: userMessage,
                timestamp: new Date()
              };
              setComfortConversation(prev => [...prev, 
                userMsg,
                {
                  role: 'ai' as const,
                  content: '...',
                  timestamp: new Date(),
                  isLoading: true
                }
              ]);
              await saveChat(auth.currentUser.uid, userMsg);

              // AI 응답 요청
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

                    // 로딩 메시지 제거 및 실제 응답 추가
                    const aiMsg = {
                      role: 'ai' as const,
                      content: data.response,
                      timestamp: new Date()
                    };
                    setComfortConversation(prev => 
                      prev.filter(msg => !('isLoading' in msg))
                    );
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
                 className="flex-1 bg-gray-800/50 text-gray-300/90 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400/50"
              />
              <button 
                type="submit" 
                disabled={isComfortLoading || !auth.currentUser}
                className={cn(
                   "bg-blue-600 text-gray-200/90 rounded-xl px-4 transition-colors flex items-center justify-center min-w-[44px] h-[44px]",
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
  );
}
