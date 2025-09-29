'use client';

import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { collection, query, orderBy, getDocs, doc, getDoc, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, ImageIcon, X, PenSquare, Trash2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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


interface EmotionAnalysis {
  emotion: string;
  intensity: number;
  keywords: string[];
  summary: string;
  color: string;
  image: string;
}

interface DiaryEntry {
  id: string;
  date: Date;
  content: string;
  images?: string[];
  emotion?: EmotionAnalysis;
}

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
  const currentUser = useSelector((state: any) => state.user.currentUser);
  console.log('Current User:', currentUser?.uid, 'Page User ID:', userId);
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [isWriting, setIsWriting] = useState(false);
  const [writeForm, setWriteForm] = useState({
    id: '',
    content: '',
    images: [] as string[],
    pendingImages: [] as File[],
    date: new Date()
  });
  const [selectedDiary, setSelectedDiary] = useState<DiaryEntry | null>(null);
  const [analyzingDiaries, setAnalyzingDiaries] = useState<string[]>([]);
  const [deletingDiaries, setDeletingDiaries] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // 일기 및 메모 데이터 로드
  useEffect(() => {
    if (!userId) return;
    
    // 1. 일기 데이터 구독
    const diariesQuery = query(
      collection(db, `users/${userId}/diaries`),
      orderBy('date', 'desc')
    );

    const diariesUnsubscribe = onSnapshot(diariesQuery, (snapshot) => {
      const loadedDiaries = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          date: data.date?.toDate() || new Date(),
          content: data.content || '',
          images: data.images || [],
          emotion: data.emotion
        };
      });
      setDiaries(loadedDiaries);
    });

    // 2. 메모 데이터 구독
    const memosQuery = query(
      collection(db, `users/${userId}/memos`),
      orderBy('date', 'desc')
    );

    const memosUnsubscribe = onSnapshot(memosQuery, (snapshot) => {
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

    return () => {
      diariesUnsubscribe();
      memosUnsubscribe();
    };
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
          "px-4 py-3 backdrop-blur-sm transition-all duration-300 ease-in-out w-full max-w-[1100px]",
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
              "p-1.2 transition-all duration-300 ease-in-out",
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
            <div className="flex items-center gap-2">
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
              <button
                onClick={() => {
                  setWriteForm(prev => ({ ...prev, date: currentDate }));
                  setIsWriting(true);
                }}
                className={cn(
                  "p-1.5 transition-all duration-300 ease-in-out",
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
                <PenSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            onClick={handleNext}
            className={cn(
              "p-1.5 transition-all duration-300 ease-in-out",
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
              // 해당 날짜의 일기 찾기
              const diary = diaries.find(d => {
                const diaryDate = new Date(d.date);
                return (
                  diaryDate.getFullYear() === date.getFullYear() &&
                  diaryDate.getMonth() === date.getMonth() &&
                  diaryDate.getDate() === date.getDate()
                );
              });

              // 해당 날짜의 메모 찾기
              const dayMemos = memos.filter(memo => {
                const memoDate = new Date(memo.date);
                return (
                  memoDate.getFullYear() === date.getFullYear() &&
                  memoDate.getMonth() === date.getMonth() &&
                  memoDate.getDate() === date.getDate()
                );
              });
              
              // 일기의 감정이 있으면 우선 사용, 없으면 메모의 감정 사용
              const mainEmotion = diary?.emotion || dayMemos
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
                    onClick={() => diary && setSelectedDiary(diary)}
                    className={cn(
                      "flex flex-col items-center p-6 w-full transition-all",
                      styleSettings.hoverEffect && "hover:bg-white/10",
                      diary && "cursor-pointer"
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
                        className={cn(
                          "flex items-center justify-center w-10 h-10 transition-transform hover:scale-110 mb-1",
                          diary && "ring-2 ring-offset-2 rounded-full"
                        )}
                        style={{
                          borderColor: styleSettings.color
                        }}
                        title={`${format(date, 'PPP', { locale: ko })} - ${mainEmotion.emotion}`}
                      >
                        <Image
                          src={EMOTION_IMAGES[mainEmotion.emotion] || '/emotions/neutral.png'}
                          alt={mainEmotion.emotion}
                          width={40}
                          height={40}
                          className={cn(
                            "opacity-90",
                            !diary && "grayscale opacity-50"
                          )}
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
              // 해당 날짜의 일기 찾기
              const diary = diaries.find(d => {
                const diaryDate = new Date(d.date);
                return (
                  diaryDate.getFullYear() === date.getFullYear() &&
                  diaryDate.getMonth() === date.getMonth() &&
                  diaryDate.getDate() === date.getDate()
                );
              });

              // 해당 날짜의 메모 찾기
              const dayMemos = memos.filter(memo => {
                const memoDate = new Date(memo.date);
                return (
                  memoDate.getFullYear() === date.getFullYear() &&
                  memoDate.getMonth() === date.getMonth() &&
                  memoDate.getDate() === date.getDate()
                );
              });
              
              // 일기의 감정이 있으면 우선 사용, 없으면 메모의 감정 사용
              const mainEmotion = diary?.emotion || dayMemos
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
                    onClick={() => diary && setSelectedDiary(diary)}
                    className={cn(
                      "flex flex-col items-center p-6 w-full transition-all",
                      styleSettings.hoverEffect && "hover:bg-white/10",
                      diary && "cursor-pointer"
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
                        className={cn(
                          "flex items-center justify-center w-10 h-10 transition-transform hover:scale-110 mb-1",
                          diary && "ring-2 ring-offset-2 rounded-full"
                        )}
                        style={{
                          borderColor: styleSettings.color
                        }}
                        title={`${format(date, 'PPP', { locale: ko })} - ${mainEmotion.emotion}`}
                      >
                        <Image
                          src={EMOTION_IMAGES[mainEmotion.emotion] || '/emotions/neutral.png'}
                          alt={mainEmotion.emotion}
                          width={40}
                          height={40}
                          className={cn(
                            "opacity-90",
                            !diary && "grayscale opacity-50"
                          )}
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

      {/* 일기 작성 모달 */}
      <Dialog 
        open={isWriting} 
        onOpenChange={(open) => {
          if (!open) {
            setWriteForm({
              id: '',
              content: '',
              images: [],
              pendingImages: [],
              date: new Date()
            });
          }
          setIsWriting(open);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>감정 일기 작성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 날짜 표시 */}
            <div className="text-sm font-medium">
              {format(writeForm.date, 'PPP', { locale: ko })}
            </div>

            {/* 일기 내용 */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">내용</label>
              <Textarea
                value={writeForm.content}
                onChange={(e) => setWriteForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="오늘의 감정과 생각을 자유롭게 적어보세요..."
                className="min-h-[200px]"
              />
            </div>
            
            {/* 이미지 업로드 영역 */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">사진</label>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    사진 선택
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      
                      // 이미지 미리보기 URL 생성
                      const previewUrls = files.map(file => URL.createObjectURL(file));
                      setWriteForm(prev => ({
                        ...prev,
                        images: [...prev.images, ...previewUrls],
                        pendingImages: [...(prev.pendingImages || []), ...files]
                      }));
                    }}
                    className="hidden"
                  />
                </div>

                {/* 이미지 미리보기 */}
                {writeForm.images && writeForm.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {writeForm.images.map((url, index) => (
                      <div key={index} className="aspect-square relative group">
                        <img
                          src={url}
                          alt={`업로드 이미지 ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          onClick={() => {
                            setWriteForm(prev => ({
                              ...prev,
                              images: prev.images.filter((_, i) => i !== index),
                              pendingImages: prev.pendingImages?.filter((_, i) => i !== index)
                            }));
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsWriting(false);
                setWriteForm({
                  id: '',
                  content: '',
                  images: [],
                  pendingImages: [],
                  date: new Date()
                });
              }}
            >
              취소
            </Button>
            <Button onClick={async () => {
              if (!writeForm.content.trim() || !userId) return;

              try {
                // 1. 이미지 업로드
                const uploadedUrls = await Promise.all(
                  writeForm.pendingImages.map(async (file) => {
                    const fileRef = ref(storage, `diaries/${userId}/${Date.now()}_${file.name}`);
                    await uploadBytes(fileRef, file);
                    return getDownloadURL(fileRef);
                  })
                );

                // 2. 일기 저장 또는 수정
                const diaryData = {
                  content: writeForm.content,
                  date: writeForm.date,
                  images: [...writeForm.images.filter(url => !url.startsWith('blob:')), ...uploadedUrls],
                  updatedAt: new Date()
                };

                // 기존 일기 수정인 경우
                const existingDiary = diaries.find(d => 
                  d.id === writeForm.id
                );

                if (existingDiary) {
                  console.log('Updating diary:', existingDiary.id, diaryData);
                  await updateDoc(doc(db, `users/${userId}/diaries`, existingDiary.id), {
                    ...diaryData,
                    emotion: existingDiary.emotion, // 기존 감정 분석 유지
                    createdAt: existingDiary.date // 원래 생성일 유지
                  });
                } else {
                  // 새 일기 작성
                  console.log('Creating new diary:', diaryData);
                  await addDoc(collection(db, `users/${userId}/diaries`), {
                    ...diaryData,
                    createdAt: new Date()
                  });
                }

                // 4. 모달 닫고 폼 초기화
                setIsWriting(false);
                setWriteForm({
                  id: '',
                  content: '',
                  images: [],
                  pendingImages: [],
                  date: new Date()
                });

              } catch (error) {
                console.error('일기 저장 실패:', error);
                alert('일기 저장 중 오류가 발생했습니다.');
              }
            }}>
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 일기 보기 모달 */}
      <Dialog 
        open={selectedDiary !== null} 
        onOpenChange={(open) => !open && setSelectedDiary(null)}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DialogTitle>
                  {selectedDiary && format(new Date(selectedDiary.date), 'PPP', { locale: ko })}
                </DialogTitle>
              </div>
              {currentUser?.uid === userId && selectedDiary && (
                <div className="flex gap-2">
                  {!selectedDiary.emotion && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (!confirm('이 일기의 감정을 분석하시겠습니까? AI가 일기의 내용을 분석하여 감정 상태를 파악합니다.')) return;
                        
                        try {
                          setAnalyzingDiaries(prev => [...prev, selectedDiary.id]);
                          
                          // 감정 분석 수행
                          const response = await fetch('/api/analyze-emotion', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: selectedDiary.content })
                          });

                          if (!response.ok) {
                            throw new Error('감정 분석 실패');
                          }

                          const emotionAnalysis = await response.json();

                          // 일기 업데이트
                          await updateDoc(doc(db, `users/${userId}/diaries`, selectedDiary.id), {
                            emotion: emotionAnalysis
                          });

                        } catch (error) {
                          console.error('감정 분석 실패:', error);
                          alert('감정 분석 중 오류가 발생했습니다.');
                        } finally {
                          setAnalyzingDiaries(prev => prev.filter(id => id !== selectedDiary.id));
                        }
                      }}
                      className="h-8 w-8"
                      disabled={analyzingDiaries.includes(selectedDiary.id)}
                    >
                      {analyzingDiaries.includes(selectedDiary.id) ? (
                        <div className="animate-spin">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12a9 9 0 11-6.219-8.56"/>
                          </svg>
                        </div>
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setWriteForm({
                        id: selectedDiary.id,
                        content: selectedDiary.content,
                        images: selectedDiary.images || [],
                        pendingImages: [],
                        date: new Date(selectedDiary.date)
                      });
                      setSelectedDiary(null);
                      setIsWriting(true);
                    }}
                    className="h-8 w-8"
                  >
                    <PenSquare className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      if (!confirm('이 일기를 삭제하시겠습니까?')) return;
                      
                      try {
                        setDeletingDiaries(prev => [...prev, selectedDiary.id]);
                        console.log('Deleting diary:', selectedDiary.id);

                        // 이미지 삭제
                        if (selectedDiary.images?.length) {
                          console.log('Deleting images:', selectedDiary.images);
                          await Promise.all(
                            selectedDiary.images.map(async (imageUrl) => {
                              const imageRef = ref(storage, imageUrl);
                              try {
                                await deleteObject(imageRef);
                                console.log('Deleted image:', imageUrl);
                              } catch (error) {
                                console.error('이미지 삭제 실패:', imageUrl, error);
                              }
                            })
                          );
                        }

                        // 일기 문서 삭제
                        await deleteDoc(doc(db, `users/${userId}/diaries`, selectedDiary.id));
                        console.log('Deleted diary document:', selectedDiary.id);
                        setSelectedDiary(null);
                      } catch (error) {
                        console.error('일기 삭제 실패:', error);
                        alert('일기 삭제 중 오류가 발생했습니다.');
                      } finally {
                        setDeletingDiaries(prev => prev.filter(id => id !== selectedDiary.id));
                      }
                    }}
                    disabled={deletingDiaries.includes(selectedDiary.id)}
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    {deletingDiaries.includes(selectedDiary.id) ? (
                      <div className="animate-spin">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12a9 9 0 11-6.219-8.56"/>
                        </svg>
                      </div>
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {selectedDiary && (
              <>
                {/* 일기 내용 */}
                <p className="whitespace-pre-wrap text-gray-900">
                  {selectedDiary.content}
                </p>

                {/* 감정 분석 결과 */}
                {selectedDiary.emotion && (
                  <div 
                    className="p-4 rounded-lg" 
                    style={{ 
                      backgroundColor: `${styleSettings.color}20`,
                      border: `1px solid ${styleSettings.color}40`
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className="flex items-center justify-center px-2.5 py-1 rounded-full text-sm font-medium whitespace-nowrap"
                        style={{ 
                          color: styleSettings.textColor,
                          backgroundColor: `${styleSettings.color}30`,
                          border: `1px solid ${styleSettings.color}40`
                        }}
                      >
                        {selectedDiary.emotion.emotion}
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3">{selectedDiary.emotion.summary}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDiary.emotion.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 rounded-full text-sm"
                          style={{ 
                            backgroundColor: `${styleSettings.color}30`,
                            color: 'rgb(17 24 39)',
                            border: `1px solid ${styleSettings.color}40`
                          }}
                        >
                          #{keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 이미지 */}
                {selectedDiary.images && selectedDiary.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedDiary.images.map((imageUrl, index) => (
                      <div key={index} className="aspect-square relative">
                        <img
                          src={imageUrl}
                          alt={`일기 이미지 ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
