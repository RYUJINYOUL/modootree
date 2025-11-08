'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase';
import { Bot, Send, ArrowLeft, Search, User, Heart, MessageSquare, Mail, MessageCircle } from 'lucide-react';
import { SearchResultCard } from '@/components/chat/SearchResultCard';
import { loadFull } from "tsparticles";
import Particles from "react-tsparticles";
import { cn } from "@/lib/utils";
import { saveChat, loadChat } from '@/lib/comfort-chat-service';
import { Timestamp } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { ChatMessage, SearchResult } from '@/types/chat';

function SearchParamsHandler({ onInitialMessage }: { onInitialMessage: (message: string) => void }) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const initialMessage = searchParams.get('initialMessage');
    if (initialMessage) {
      onInitialMessage(decodeURIComponent(initialMessage));
    }
  }, [searchParams, onInitialMessage]);

  return null;
}

// 1. intent 분기 함수 추가
function getChatIntent(message: string): 'memo' | 'search' | 'comfort' {
  if (/메모|일정|기록|저장/i.test(message)) return 'memo';
  if (/검색|찾아줘|알려줘|정보|뉴스|최신|추천|유튜브/i.test(message)) return 'search';
  return 'comfort';
}

export default function AiComfortPage() {
  const router = useRouter();
  const [comfortMessage, setComfortMessage] = useState('');
  const [isComfortLoading, setIsComfortLoading] = useState(false);
  const [remainingChats, setRemainingChats] = useState<number | null>(null);
  const initialMessageSentRef = useRef(false);
  const [comfortConversation, setComfortConversation] = useState<ChatMessage[]>([{
    role: 'ai',
    content: '안녕하세요! 모두트리 AI입니다. 😊\n\n저는 이야기를 경청 공감하며, 함께 고민하고 해결책을 찾아가는 것을 돕고 있어요.\n\n무엇이든 편하게 이야기해주세요.',
    timestamp: Timestamp.fromDate(new Date())
  }]);

  const handleInitialMessage = useCallback((message: string) => {
    if (!initialMessageSentRef.current && auth.currentUser) {
      initialMessageSentRef.current = true;
      setComfortMessage(message);
      sendInitialMessage(message);
      
      const newUrl = window.location.pathname;
      router.replace(newUrl);
    }
  }, []);
  
  const sendInitialMessage = useCallback(async (messageContent: string) => {
    if (!messageContent.trim()) return;

    setIsComfortLoading(true);
    const user = auth.currentUser;

    try {
      if (!user) {
        router.push('/login');
        throw new Error('인증이 필요합니다.');
      }

      await user.reload();
      const token = await user.getIdToken(true);

      const userMsg = {
        role: 'user' as const,
        content: messageContent,
        timestamp: Timestamp.fromDate(new Date())
      };

      setComfortConversation(prev => [...prev, 
        userMsg,
        {
          role: 'ai' as const,
          content: '...',
          timestamp: Timestamp.fromDate(new Date()),
          isLoading: true
        }
      ]);
      await saveChat(user.uid, userMsg);

      const response = await fetch('/api/ai-comfort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          token,
          conversationHistory: []
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      const aiMsg = {
        role: 'ai' as const,
        content: data.response,
        timestamp: Timestamp.fromDate(new Date())
      };

      setComfortConversation(prev => 
        prev.filter(msg => !('isLoading' in msg))
      );
      setComfortConversation(prev => [...prev, aiMsg]);
      console.log('AI 답변 저장 시도:', aiMsg);
      try {
        await saveChat(user.uid, aiMsg);
        console.log('AI 답변 저장 완료');
      } catch (saveError) {
        console.error('AI 답변 저장 실패:', saveError);
        // 저장 실패해도 UI에는 정상 응답 표시 유지
      }

    } catch (error: any) {
      console.error('AI 상담 오류 (초기 메시지):', error);
      let errorMsg;
      if (error.message.includes('인증') || error.message.includes('로그인')) {
        errorMsg = {
          role: 'ai' as const,
          content: '로그인이 만료되었습니다. 다시 로그인해주세요.',
          timestamp: Timestamp.fromDate(new Date())
        };
        setComfortConversation(prev => [...prev, errorMsg]);
        // 에러 메시지도 저장
        try {
          if (user) {
            await saveChat(user.uid, errorMsg);
          }
        } catch (saveError) {
          console.error('에러 메시지 저장 실패:', saveError);
        }
        router.push('/login');
      } else {
        errorMsg = {
          role: 'ai' as const,
          content: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 🙏',
          timestamp: Timestamp.fromDate(new Date())
        };
        setComfortConversation(prev => [...prev, errorMsg]);
        // 에러 메시지도 저장
        try {
          if (user) {
            await saveChat(user.uid, errorMsg);
          }
        } catch (saveError) {
          console.error('에러 메시지 저장 실패:', saveError);
        }
      }
    } finally {
      setIsComfortLoading(false);
    }
  }, [router]);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const particlesInit = useCallback(async (engine: any) => {
    await loadFull(engine);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [comfortConversation]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        console.log('이전 대화 불러오기 시도:', user.uid);
        const messages = await loadChat(user.uid);
        console.log('불러온 메시지들:', messages);
        if (messages && messages.length > 0) {
          // 초기 AI 인사말과 불러온 메시지를 합치되, 중복 제거
          const initialMessage = comfortConversation[0];
          const hasInitialMessage = messages.some(msg => 
            msg.role === 'ai' && msg.content.includes('안녕하세요! 모두트리 AI입니다')
          );
          
          if (hasInitialMessage) {
            setComfortConversation(messages);
          } else {
            setComfortConversation([initialMessage, ...messages]);
          }
        }
      } catch (error) {
        console.error('이전 대화 불러오기 실패:', error);
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-gray-300/90 relative">
      <Suspense fallback={null}>
        <SearchParamsHandler onInitialMessage={handleInitialMessage} />
      </Suspense>
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
              value: { min: 1, max: 3 }
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
      <div className="fixed top-0 left-0 right-0 z-10 bg-gray-900/90 backdrop-blur-lg border-b border-blue-500/20">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-gray-300/90 hover:text-gray-200"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold">AI 채팅</h1>
          </div>
          <Link 
            href="/profile"
            className="bg-[#56ab91]/80 hover:bg-[#56ab91] text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
          >
           내 페이지
          </Link>
        </div>
      </div>

      <div 
        ref={chatContainerRef}
        className="fixed top-[64px] bottom-[80px] left-0 right-0 overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent"
      >
        <div className="container mx-auto px-4">
          <div className="mb-8"></div>
          <div>
            {comfortConversation.map((msg, idx) => {
              const currentDate = msg.timestamp.toDate();
              const prevDate = idx > 0 ? comfortConversation[idx - 1].timestamp.toDate() : null;
              
              return (
                <React.Fragment key={`message-${idx}`}>
                  {(!prevDate || currentDate.toDateString() !== prevDate.toDateString()) && (
                    <div className="flex items-center justify-center my-6">
                      <div className="bg-gray-800/50 px-4 py-1 rounded-full text-sm text-gray-400">
                        {currentDate.toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long'
                        })}
                      </div>
                    </div>
                  )}
                  
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
                      "inline-block rounded-2xl p-4 text-gray-300/90 max-w-[80%] whitespace-pre-wrap break-words",
                      msg.role === 'ai' ? "bg-gray-800/50" : "bg-blue-600/50"
                    )}>
                      {'isLoading' in msg && msg.isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            {msg.content.split('\n').map((line, i) => (
                              <p key={i} className={line.trim() === '' ? 'h-4' : ''}>
                                {line}
                              </p>
                            ))}
                          </div>
                          
                          {/* 🆕 상황별 퀵 액세스 버튼들 - 텍스트 기반 매칭 */}
                          {msg.role === 'ai' && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                             
                              
                              {/* 메모/일기 관련 */}
                              {(msg.content.includes('내 페이지')) && (
                                <Link 
                                  href="/profile" 
                                  className="inline-flex items-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-300 px-2.5 py-1.5 rounded-md border border-green-600/30 transition text-xs font-medium"
                                >
                                  <User className="w-3 h-3" />
                                  내 페이지
                                </Link>
                              )}
                              
                              {/* 건강 관련 */}
                              {msg.content.includes('건강') && (
                                <Link 
                                  href="/health" 
                                  className="inline-flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 px-2.5 py-1.5 rounded-md border border-red-600/30 transition text-xs font-medium"
                                >
                                  <Heart className="w-3 h-3" />
                                  건강 기록
                                </Link>
                              )}
                              
                              {/* 사연 관련 */}
                              {(msg.content.includes('사연') || msg.content.includes('투표') || msg.content.includes('사진투표') || msg.content.includes('뉴스투표')) && (
                                <Link 
                                  href="/modoo-ai" 
                                  className="inline-flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 px-2.5 py-1.5 rounded-md border border-purple-600/30 transition text-xs font-medium"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  사연 AI
                                </Link>
                              )}

                              {/* 링크편지 관련 */}
                            {msg.content.includes('링크편지') && (
                               <Link 
                                 href="/pros-menu" 
                                 className="inline-flex items-center gap-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 px-2.5 py-1.5 rounded-md border border-yellow-600/30 transition text-xs font-medium"
                               >
                                 <Mail className="w-3 h-3" />
                                  링크편지
                               </Link>
                                 )}

                                  {/* 열린게시판 관련 */}
                            {(msg.content.includes('문의') || msg.content.includes('수정') || msg.content.includes('모르겠어') || msg.content.includes('찾을 수 없어') || msg.content.includes('개선') || msg.content.includes('게시판') || msg.content.includes('고객센터') || msg.content.includes('모두트리')) && (
                               <Link 
                                 href="/inquiry" 
                                 className="inline-flex items-center gap-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 px-2.5 py-1.5 rounded-md border border-yellow-600/30 transition text-xs font-medium"
                               >
                                 <MessageCircle className="w-3 h-3" />
                                  열린게시판
                               </Link>
                                 )}

                            </div>
                          )}

                          
                          
                          {'searchResults' in msg && msg.searchResults?.length > 0 && (
                            <div className="space-y-2 mt-4 border-t border-white/10 pt-4">
                              <div className="text-sm text-gray-400">관련 정보:</div>
                              {msg.searchResults.map((result, idx) => (
                                <SearchResultCard key={idx} result={result} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <div className="mb-8"></div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-lg border-t border-blue-500/20 pb-safe z-10">
        <div className="container mx-auto px-4 py-4">
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!comfortMessage.trim() || isComfortLoading) return;
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken(true);
            const intent = getChatIntent(comfortMessage);
            const userMsg = {
              role: 'user' as const,
              content: comfortMessage,
              timestamp: Timestamp.fromDate(new Date())
            };
            setComfortMessage('');
            setIsComfortLoading(true);
            setComfortConversation(prev => [...prev, userMsg, {role:'ai',content:'...',timestamp:Timestamp.fromDate(new Date()),isLoading:true}] );
            await saveChat(user.uid, userMsg);
            let aiMsg: ChatMessage | null = null;
            try {
              if (intent === 'memo') {
                const res = await fetch('/api/ai-save', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message: userMsg.content, token })
                });
                const data = await res.json();
                aiMsg = {
                  role: 'ai',
                  content: data.response || '메모 저장 답변을 불러오지 못했습니다.',
                  timestamp: Timestamp.fromDate(new Date())
                };
              } else if (intent === 'search') {
                const res = await fetch('https://aijob-server-712740047046.asia-northeast3.run.app/chat', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message: userMsg.content, token, conversationHistory: comfortConversation })
                });
                const data = await res.json();
                aiMsg = {
                  role: 'ai',
                  content: data.response || '검색 답변을 불러오지 못했습니다.',
                  timestamp: Timestamp.fromDate(new Date()),
                  searchResults: data.sources || []   // <- 검색결과 연결
                };
              } else {
                const res = await fetch('/api/ai-comfort', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message: userMsg.content, token, conversationHistory: comfortConversation })
                });
                const data = await res.json();
                aiMsg = {
                  role: 'ai',
                  content: data.response || '답변을 불러오지 못했습니다.',
                  timestamp: Timestamp.fromDate(new Date())
                };
              }
              setComfortConversation(prev => prev.filter(msg => !('isLoading' in msg)));
              setComfortConversation(prev => [...prev, aiMsg!]);
              await saveChat(user.uid, aiMsg!);
            } catch (err: any) {
              setComfortConversation(prev => prev.filter(msg => !('isLoading' in msg)));
              setComfortConversation(prev => [...prev, {role:'ai',content:'죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',timestamp: Timestamp.fromDate(new Date())}]);
            } finally {
              setIsComfortLoading(false);
            }
          }}>
            <div className="flex gap-2">
              <textarea
                value={comfortMessage}
                onChange={(e) => setComfortMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (comfortMessage.trim() && !isComfortLoading) {
                      e.currentTarget.form?.requestSubmit();
                    }
                  }
                }}
                placeholder="메시지를 입력하세요... (Shift + Enter로 줄바꿈)"
                rows={1}
                className="flex-1 bg-gray-800/50 text-gray-300/90 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400/50 resize-none overflow-y-auto min-h-[44px] max-h-[120px]"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
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