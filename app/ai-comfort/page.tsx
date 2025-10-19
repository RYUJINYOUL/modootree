'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // useSearchParams 임포트
import { auth } from '@/firebase';
import { Bot, Send, ArrowLeft, Save } from 'lucide-react'; // Save 아이콘 추가
import { loadSlim } from "tsparticles-slim";
import Particles from "react-tsparticles";
import { cn } from "@/lib/utils";
import { saveChat, loadChat } from '@/lib/comfort-chat-service';

export default function AiComfortPage() {
  const router = useRouter();
  const [comfortMessage, setComfortMessage] = useState('');
  const [isComfortLoading, setIsComfortLoading] = useState(false);
  const [remainingChats, setRemainingChats] = useState<number | null>(null);
  const [showSaveButton, setShowSaveButton] = useState(false); // 저장 버튼 표시 상태 추가
  const [comfortConversation, setComfortConversation] = useState([{
    role: 'ai',
    content: '안녕하세요! 모두트리 AI입니다. 😊\n\n저는 여러분의 이야기를 경청하고 공감하며, 함께 고민하고 해결책을 찾아가는 것을 돕고 있어요.\n\n무엇이든 편하게 이야기해주세요.',
    timestamp: new Date()
  }]);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const comfortConversationRef = useRef(comfortConversation); // comfortConversation을 위한 ref 추가
  useEffect(() => {
    comfortConversationRef.current = comfortConversation;
  }, [comfortConversation]);

  const searchParams = useSearchParams(); // useSearchParams 훅 사용
  const initialMessageFromQuery = searchParams.get('initialMessage'); // 쿼리 파라미터에서 초기 메시지 가져오기

  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  // 새 메시지가 추가될 때마다 스크롤 자동 이동
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [comfortConversation]);

  // 메시지 전송 및 AI 응답 처리 로직을 별도 함수로 분리
  const sendMessageToAI = useCallback(async (userMessage: string) => {
    setIsComfortLoading(true);
    try {
      if (!auth.currentUser) {
        throw new Error('인증이 필요합니다.');
      }
      await auth.currentUser.reload();
      const token = await auth.currentUser.getIdToken(true);

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

      const response = await fetch('/api/ai-comfort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          token,
          conversationHistory: comfortConversationRef.current // ref 사용
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      setRemainingChats(data.remainingChats);

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
  }, [router]); // 의존성 배열에서 comfortConversation 제거, router는 안정적인 의존성

  const handleFinalSave = useCallback(async () => {
    if (!auth.currentUser) {
      alert('저장을 위해 로그인해주세요.');
      router.push('/login');
      return;
    }
    if (comfortConversationRef.current.length <= 1) { // 초기 AI 메시지만 있는 경우 저장하지 않음
      alert('저장할 내용이 없습니다.');
      return;
    }

    setIsComfortLoading(true); // 저장 중에도 로딩 상태 표시 (필요에 따라 분리 가능)
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('/api/ai-save-final', { // 최종 저장 API 호출
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: comfortConversationRef.current, // 현재까지의 대화 기록 전송
          userId: auth.currentUser.uid,
          type: 'diary', // 혹은 AI가 파악한 컨텍스트에 따라 'memo', 'story' 등으로 변경
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('대화 내용이 성공적으로 저장되었습니다!');
        // 저장 성공 후, 대화 기록 초기화 또는 저장 버튼 숨기기
        setComfortConversation([{ role: 'ai', content: '무엇을 도와드릴까요?' , timestamp: new Date()}]); // 대화 초기화
        setShowSaveButton(false); // 저장 버튼 숨김
      } else {
        alert(`저장 실패: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('최종 저장 요청 실패:', error);
      alert('최종 저장 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsComfortLoading(false);
    }
  }, [router]); // handleFinalSave도 router에 의존

  const initialMessageProcessedRef = useRef(false); // 초기 메시지 처리 여부 추적

  // 인증 상태 및 이전 대화 내용 불러오기, 그리고 초기 메시지 처리
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        // 로그인 필요 시 initialMessage를 localStorage에 저장 후 리다이렉트 (선택 사항)
        // if (initialMessageFromQuery) {
        //   localStorage.setItem('aiComfortInitialMessage', initialMessageFromQuery);
        // }
        router.push('/login');
        return;
      }

      try {
        const messages = await loadChat(user.uid);
        if (messages.length > 0) {
          setComfortConversation(messages);
        }

        // 초기 메시지 처리 (로그인 후 또는 페이지 로드 시)
        if (initialMessageFromQuery && !initialMessageProcessedRef.current) {
          initialMessageProcessedRef.current = true; // 처리 완료 플래그 설정
          router.replace('/ai-comfort');
          sendMessageToAI(initialMessageFromQuery); // 초기 메시지 전송
        }

      } catch (error) {
        console.error('이전 대화 불러오기 또는 초기 메시지 처리 실패:', error);
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [router, initialMessageFromQuery, sendMessageToAI]); // 의존성 배열에 추가

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
            <h1 className="text-xl font-semibold">AI 상담</h1>
          </div>
          {showSaveButton && (
            <button
              onClick={handleFinalSave}
              disabled={isComfortLoading} // 저장 중에는 비활성화
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-lg flex items-center gap-1 text-sm"
            >
              <Save className="w-4 h-4" />
              저장
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
            {comfortConversation.map((msg, idx) => {
              const currentDate = new Date(msg.timestamp);
              const prevDate = idx > 0 ? new Date(comfortConversation[idx - 1].timestamp) : null;
              
              return (
                <React.Fragment key={`message-${idx}`}>
                  {/* 날짜가 변경되었거나 첫 메시지인 경우 날짜 구분선 추가 */}
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
                  
                  {/* 메시지 */}
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
                          <div className="space-y-2">
                            {msg.content.split('\n').map((line, i) => (
                              <p key={i} className={line.trim() === '' ? 'h-4' : ''}>
                                {line}
                              </p>
                            ))}
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

      {/* 하단 입력 영역 */}
       <div className="fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-lg border-t border-blue-500/20 pb-safe z-10">
        <div className="container mx-auto px-4 py-4">
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!comfortMessage.trim() || isComfortLoading) return;
            if (!auth.currentUser) return; // 이미 onAuthStateChanged에서 처리됨

            // 분리된 sendMessageToAI 함수 호출
            await sendMessageToAI(comfortMessage);
            setComfortMessage('');
          }}>
            <div className="flex gap-2">
              <textarea
                value={comfortMessage}
                onChange={(e) => {
                  setComfortMessage(e.target.value);
                  // 사용자가 '저장' 관련 키워드를 입력했는지 확인
                  const saveKeywords = ['저장', '일기 저장', '메모 저장', '사연 저장', 'save'];
                  const lowerCaseMessage = e.target.value.toLowerCase();
                  const shouldShow = saveKeywords.some(keyword => lowerCaseMessage.includes(keyword));
                  setShowSaveButton(shouldShow);
                }}
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