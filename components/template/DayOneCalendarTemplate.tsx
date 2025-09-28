'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { collection, query, orderBy, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowLeft, ArrowRight } from 'lucide-react';
import Image from 'next/image';

const EMOTION_IMAGES: { [key: string]: string } = {
  '기쁨': '/emotions/joy.png',
  '설렘': '/emotions/excitement.png',
  '만족': '/emotions/satisfaction.png',
  '평온': '/emotions/peace.png',
  '기대': '/emotions/anticipation.png',
  '희망': '/emotions/hope.png',
  '슬픔': '/emotions/sadness.png',
  '그리움': '/emotions/longing.png',
  '분노': '/emotions/anger.png',
  '짜증': '/emotions/irritation.png',
  '불안': '/emotions/anxiety.png',
  '걱정': '/emotions/worry.png',
  '중립': '/emotions/neutral.png'
};


interface DayOneCalendarTemplateProps {
  userId: string;
  editable?: boolean;
}

interface MemoItem {
  id: string;
  date: Date;
  content: string;
  emotion?: {
    emotion: string;
    color: string;
    image: string;
    intensity: number;
  };
  status: 'todo' | 'today' | 'completed';
}

export default function DayOneCalendarTemplate({ userId, editable = true }: DayOneCalendarTemplateProps) {
  const pathname = usePathname();
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [styleSettings, setStyleSettings] = useState({
    style: 'default',
    color: '#60A5FA',
    textColor: '#FFFFFF',
    borderColor: '#60A5FA',
    opacity: 0.1,
    borderRadius: 'lg',
    shadow: 'none',
    hoverEffect: true,
    animation: false
  });

  // 메모 데이터 로드 (감정 데이터만)
  useEffect(() => {
    if (!userId) return;
    
    const q = query(
      collection(db, `users/${userId}/memos`),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMemos = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          date: data.date?.toDate() || new Date(),
          content: data.content || '',
          emotion: data.emotion,
          status: data.status || 'todo'
        };
      });
      setMemos(loadedMemos);
    });

    return () => unsubscribe();
  }, [userId]);

  // 스타일 설정 불러오기
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', userId, 'settings', 'dayOneBook'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStyleSettings(prev => ({
            ...prev,
            ...data
          }));
        }
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // 스타일 객체 생성 함수
  const getStyleObject = () => {
    const shadowColor = styleSettings.color === 'transparent' 
      ? 'rgba(0, 0, 0, 0.2)'
      : `${styleSettings.color}${Math.round(styleSettings.opacity * 255).toString(16).padStart(2, '0')}`;

    let boxShadow = 'none';
    switch (styleSettings.shadow) {
      case 'sm':
        boxShadow = `0 1px 2px ${shadowColor}`;
        break;
      case 'md':
        boxShadow = `0 4px 6px ${shadowColor}`;
        break;
      case 'lg':
        boxShadow = `0 10px 15px ${shadowColor}`;
        break;
      case 'inner':
        boxShadow = `inset 0 2px 4px ${shadowColor}`;
        break;
      case 'glow':
        boxShadow = `0 0 20px ${shadowColor}`;
        break;
    }

    return {
      backgroundColor: styleSettings.color === 'transparent' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : `${styleSettings.color}${Math.round((1 - styleSettings.opacity) * 255).toString(16).padStart(2, '0')}`,
      boxShadow,
      borderColor: styleSettings.borderColor,
      borderWidth: '2px',
      borderStyle: 'solid',
    };
  };

  // 날짜 이동 함수
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 p-2 pt-4 md:flex md:flex-col md:items-center md:w-full">
      {/* 날짜 네비게이션 */}
      <div 
        className={cn(
          "p-6 backdrop-blur-sm transition-all duration-300 ease-in-out w-full max-w-[1100px]",
          styleSettings.borderRadius === 'none' && 'rounded-none',
          styleSettings.borderRadius === 'sm' && 'rounded-sm',
          styleSettings.borderRadius === 'md' && 'rounded-md',
          styleSettings.borderRadius === 'lg' && 'rounded-lg',
          styleSettings.borderRadius === 'xl' && 'rounded-xl',
          styleSettings.borderRadius === 'full' && 'rounded-3xl',
          styleSettings.hoverEffect && "hover:bg-white/20 hover:scale-[1.01]",
          styleSettings.animation && "floating-animation"
        )}
        style={getStyleObject()}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            className={cn(
              "p-2 transition-all duration-300 ease-in-out",
              styleSettings.borderRadius === 'none' && 'rounded-none',
              styleSettings.borderRadius === 'sm' && 'rounded-sm',
              styleSettings.borderRadius === 'md' && 'rounded-md',
              styleSettings.borderRadius === 'lg' && 'rounded-lg',
              styleSettings.borderRadius === 'xl' && 'rounded-xl',
              styleSettings.hoverEffect && "hover:bg-white/20"
            )}
            style={{
              color: styleSettings.textColor
            }}
          >
            <ChevronLeft className="w-6 h-6 stroke-[1.5]" />
          </button>
          <div className="flex items-center gap-4">
            <div className="text-lg font-medium" style={{ color: styleSettings.textColor }}>
              {format(currentDate, 'yyyy년 M월', { locale: ko })}
            </div>
            <button
              onClick={() => setViewMode(prev => prev === 'week' ? 'month' : 'week')}
              className={cn(
                "px-3 py-1 text-sm transition-all duration-300 ease-in-out",
                styleSettings.borderRadius === 'none' && 'rounded-none',
                styleSettings.borderRadius === 'sm' && 'rounded-sm',
                styleSettings.borderRadius === 'md' && 'rounded-md',
                styleSettings.borderRadius === 'lg' && 'rounded-lg',
                styleSettings.borderRadius === 'xl' && 'rounded-xl',
                styleSettings.hoverEffect && "hover:bg-white/20"
              )}
              style={{
                color: styleSettings.textColor,
                border: `1px solid ${styleSettings.textColor}40`
              }}
            >
              {viewMode === 'week' ? '월' : '주'}
            </button>
          </div>
          <button
            onClick={handleNext}
            className={cn(
              "p-2 transition-all duration-300 ease-in-out",
              styleSettings.borderRadius === 'none' && 'rounded-none',
              styleSettings.borderRadius === 'sm' && 'rounded-sm',
              styleSettings.borderRadius === 'md' && 'rounded-md',
              styleSettings.borderRadius === 'lg' && 'rounded-lg',
              styleSettings.borderRadius === 'xl' && 'rounded-xl',
              styleSettings.hoverEffect && "hover:bg-white/20"
            )}
            style={{
              color: styleSettings.textColor
            }}
          >
            <ChevronRight className="w-6 h-6 stroke-[1.5]" />
          </button>
        </div>
      </div>

      {/* 주간 감정 흐름 */}
      <div 
        className={cn(
          "p-6 backdrop-blur-sm transition-all duration-300 ease-in-out w-full max-w-[1100px]",
          styleSettings.borderRadius === 'none' && 'rounded-none',
          styleSettings.borderRadius === 'sm' && 'rounded-sm',
          styleSettings.borderRadius === 'md' && 'rounded-md',
          styleSettings.borderRadius === 'lg' && 'rounded-lg',
          styleSettings.borderRadius === 'xl' && 'rounded-xl',
          styleSettings.borderRadius === 'full' && 'rounded-3xl',
          styleSettings.hoverEffect && "hover:bg-white/20 hover:scale-[1.01]",
          styleSettings.animation && "floating-animation"
        )}
        style={getStyleObject()}
      >
        <div className="grid grid-cols-7 mb-1">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
            <div 
              key={day} 
              className="text-center py-3 text-base font-medium"
              style={{ 
                color: i === 0 ? '#FF4444' : i === 6 ? '#4444FF' : styleSettings.textColor
              }}
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">

          {(viewMode === 'week' ? 
            // 주간 보기
            Array.from({ length: 7 }).map((_, index) => {
              // 현재 주의 일요일 찾기
              const date = new Date(currentDate);
              const day = date.getDay(); // 0: 일요일, 1: 월요일, ...
              date.setDate(date.getDate() - day + index);
              const dayMemos = memos.filter(memo => {
                const memoDate = new Date(memo.date);
                return (
                  memoDate.getFullYear() === date.getFullYear() &&
                  memoDate.getMonth() === date.getMonth() &&
                  memoDate.getDate() === date.getDate()
                );
              });
              
              // 해당 날짜의 대표 감정 찾기
              const mainEmotion = dayMemos
                .filter(memo => memo.emotion)
                .sort((a, b) => (b.emotion?.intensity || 0) - (a.emotion?.intensity || 0))[0]?.emotion;
              
              if (mainEmotion) {
                console.log('감정 데이터:', {
                  date: format(date, 'yyyy-MM-dd'),
                  memoCount: dayMemos.length,
                  emotion: mainEmotion.emotion,
                  image: mainEmotion.image,
                  color: mainEmotion.color
                });
              }

              const today = new Date();
              const isToday = 
                date.getFullYear() === today.getFullYear() &&
                date.getMonth() === today.getMonth() &&
                date.getDate() === today.getDate();

              return (
                <div 
                  key={index}
                  className={cn(
                    "flex flex-col items-center py-1 transition-all",
                    isToday && "bg-white/5 backdrop-blur-sm",
                    styleSettings.borderRadius === 'none' && 'rounded-none',
                    styleSettings.borderRadius === 'sm' && 'rounded-sm',
                    styleSettings.borderRadius === 'md' && 'rounded-md',
                    styleSettings.borderRadius === 'lg' && 'rounded-lg',
                    styleSettings.borderRadius === 'xl' && 'rounded-xl',
                    styleSettings.borderRadius === 'full' && 'rounded-xl'
                  )}
                >
                  <button 
                    className={cn(
                      "flex flex-col items-center p-6 w-full transition-all",
                      styleSettings.hoverEffect && "hover:bg-white/10"
                    )}
                    style={{ 
                      color: styleSettings.textColor,
                      borderColor: styleSettings.borderColor
                    }}
                  >
                    <div 
                      className={cn(
                        "text-xl mb-2",
                        isToday && "font-medium"
                      )}
                    >
                      {format(date, 'd', { locale: ko })}
                    </div>
                    {mainEmotion ? (
                      <div 
                        className="flex items-center justify-center w-10 h-10 transition-transform hover:scale-110 mb-1" 
                        title={`${format(date, 'PPP', { locale: ko })} - ${mainEmotion.emotion}`}
                      >
                        <Image
                          src={EMOTION_IMAGES[mainEmotion.emotion] || '/emotions/neutral.png'}
                          alt={mainEmotion.emotion}
                          width={40}
                          height={40}
                          className="opacity-90"
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-10 h-10 mb-3 rounded-full border flex items-center justify-center"
                        style={{ 
                          borderColor: `${styleSettings.color}40`,
                          opacity: isToday ? 0.5 : 0.2
                        }}
                      />
                    )}
                    {dayMemos.length > 0 && (
                      <div 
                        className="text-base font-medium px-3 py-1.5 rounded-full"
                        style={{ 
                          backgroundColor: `${styleSettings.color}30`,
                          color: styleSettings.textColor
                        }}
                      >
                        +{dayMemos.length}
                      </div>
                    )}
                  </button>
                </div>
              );
            })
            : 
            // 월간 보기
            Array.from({ length: 35 }).map((_, index) => {
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
              date.setDate(date.getDate() - date.getDay() + index);
              const dayMemos = memos.filter(memo => {
                const memoDate = new Date(memo.date);
                return (
                  memoDate.getFullYear() === date.getFullYear() &&
                  memoDate.getMonth() === date.getMonth() &&
                  memoDate.getDate() === date.getDate()
                );
              });
              
              // 해당 날짜의 대표 감정 찾기
              const mainEmotion = dayMemos
                .filter(memo => memo.emotion)
                .sort((a, b) => (b.emotion?.intensity || 0) - (a.emotion?.intensity || 0))[0]?.emotion;
              
              if (mainEmotion) {
                console.log('감정 데이터:', {
                  date: format(date, 'yyyy-MM-dd'),
                  memoCount: dayMemos.length,
                  emotion: mainEmotion.emotion,
                  image: mainEmotion.image,
                  color: mainEmotion.color
                });
              }

              const isToday = date.getFullYear() === new Date().getFullYear() &&
                            date.getMonth() === new Date().getMonth() &&
                            date.getDate() === new Date().getDate();

              const isCurrentMonth = date.getMonth() === currentDate.getMonth();

              return (
                <div 
                  key={index}
                  className={cn(
                    "flex flex-col items-center py-1 transition-all",
                    isToday && "bg-white/5 backdrop-blur-sm",
                    !isCurrentMonth && "opacity-50",
                    styleSettings.borderRadius === 'none' && 'rounded-none',
                    styleSettings.borderRadius === 'sm' && 'rounded-sm',
                    styleSettings.borderRadius === 'md' && 'rounded-md',
                    styleSettings.borderRadius === 'lg' && 'rounded-lg',
                    styleSettings.borderRadius === 'xl' && 'rounded-xl',
                    styleSettings.borderRadius === 'full' && 'rounded-xl'
                  )}
                >
                  <button 
                    className={cn(
                      "flex flex-col items-center p-6 w-full transition-all",
                      styleSettings.hoverEffect && "hover:bg-white/10"
                    )}
                    style={{ 
                      color: styleSettings.textColor,
                      borderColor: styleSettings.borderColor
                    }}
                  >
                    <div 
                      className={cn(
                        "text-xl mb-2",
                        isToday && "font-medium"
                      )}
                    >
                      {format(date, 'd', { locale: ko })}
                    </div>
                    {mainEmotion ? (
                      <div 
                        className="flex items-center justify-center w-10 h-10 transition-transform hover:scale-110 mb-1" 
                        title={`${format(date, 'PPP', { locale: ko })} - ${mainEmotion.emotion}`}
                      >
                        <Image
                          src={EMOTION_IMAGES[mainEmotion.emotion] || '/emotions/neutral.png'}
                          alt={mainEmotion.emotion}
                          width={40}
                          height={40}
                          className="opacity-90"
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-10 h-10 mb-3 rounded-full border flex items-center justify-center"
                        style={{ 
                          borderColor: `${styleSettings.color}40`,
                          opacity: isToday ? 0.5 : 0.2
                        }}
                      />
                    )}
                    {dayMemos.length > 0 && (
                      <div 
                        className="text-base font-medium px-3 py-1.5 rounded-full"
                        style={{ 
                          backgroundColor: `${styleSettings.color}30`,
                          color: styleSettings.textColor
                        }}
                      >
                        +{dayMemos.length}
                      </div>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
