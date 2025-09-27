'use client';

import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { doc, collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, storage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Image as ImageIcon, X, Trash2, Calendar as CalendarIcon, List, Settings } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const COLOR_PALETTE = [
  'transparent',
  '#000000', '#FFFFFF', '#F87171', '#FBBF24',
  '#34D399', '#60A5FA', '#A78BFA', '#F472B6',
];

const MEMO_STYLES: { [key: string]: string } = {
  default: "bg-white/10 backdrop-blur-sm",
  solid: "border-l-4",
  gradient: "bg-gradient-to-r from-transparent",
  glow: "shadow-[0_0_8px_currentColor]",
  glass: "backdrop-blur-md bg-white/5",
  modern: "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm",
  minimal: "border-l border-t border-white/10",
  floating: "shadow-lg backdrop-blur-md hover:translate-y-[-2px] transition-all",
  neon: "shadow-[0_0_8px_currentColor] border border-current",
};

interface EmotionAnalysis {
  emotion: string;
  intensity: number;
  keywords: string[];
  summary: string;
  color: string;
  icon: string;
}

interface MemoItem {
  id: string;
  content: string;
  date: Date;
  status: 'todo' | 'today' | 'completed';
  emotion?: EmotionAnalysis;
  images?: string[];
}

interface DayOneBookProps {
  userId: string;
  editable?: boolean;
}

export default function DayOneBook({ userId, editable = true }: DayOneBookProps) {
  // 애니메이션 스타일 추가
  const animationStyle = `
    @keyframes floating {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    .floating-animation {
      animation: floating 5s ease-in-out infinite;
    }
  `;
  const pathname = usePathname();
  type TabType = 'todo' | 'today' | 'completed';
  
  // 모든 useState를 최상단에 배치
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingMemo, setEditingMemo] = useState<MemoItem | null>(null);
  const [selectedMemo, setSelectedMemo] = useState<MemoItem | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {}
  });
  const [writeForm, setWriteForm] = useState({
    content: '',
    images: [] as string[],
    pendingImages: [] as File[],
    date: new Date()
  });
  
  // useRef는 useState 다음에 배치
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [analyzingMemos, setAnalyzingMemos] = useState<string[]>([]);
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
        : `${styleSettings.color}${Math.round(styleSettings.opacity * 255).toString(16).padStart(2, '0')}`,
      boxShadow,
      borderColor: styleSettings.borderColor,
      borderWidth: '2px',
      borderStyle: 'solid',
    };
  };

  // 스타일 설정 저장
  const saveStyleSettings = async (newSettings: typeof styleSettings) => {
    if (!userId) {
      console.log('userId가 없음');
      return;
    }
    
    console.log('스타일 저장 시도:', {
      userId,
      newSettings,
      path: `users/${userId}/settings/dayOneBook`
    });

    try {
      // 먼저 상태를 업데이트하여 UI가 즉시 반응하도록 함
      setStyleSettings(newSettings);
      console.log('로컬 상태 업데이트 완료');
      
      // 그 다음 Firestore에 저장 (merge 옵션 제거)
      const docRef = doc(db, 'users', userId, 'settings', 'dayOneBook');
      await setDoc(docRef, {
        ...newSettings,
        updatedAt: new Date().toISOString() // 타임스탬프 추가
      });
      console.log('Firestore 저장 완료');
    } catch (error) {
      console.error('스타일 설정 저장 실패:', error);
      // 저장 실패 시 이전 상태로 롤백
      setStyleSettings(styleSettings);
    }
  };

  // 스타일 설정 불러오기
  useEffect(() => {
    if (!userId) {
      console.log('스타일 불러오기: userId가 없음');
      return;
    }

    console.log('스타일 불러오기 시도:', {
      userId,
      path: `users/${userId}/settings/dayOneBook`
    });

    // Firestore 실시간 구독 설정
    const unsubscribe = onSnapshot(
      doc(db, 'users', userId, 'settings', 'dayOneBook'),
      (docSnap) => {
        console.log('스타일 문서 변경 감지:', {
          exists: docSnap.exists(),
          data: docSnap.data()
        });
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStyleSettings(prev => ({
            ...prev,
            ...data,
            style: data.style || prev.style,
            color: data.color || prev.color,
            opacity: data.opacity ?? prev.opacity,
            borderRadius: data.borderRadius || prev.borderRadius,
            shadow: data.shadow || prev.shadow,
            hoverEffect: data.hoverEffect ?? prev.hoverEffect,
            animation: data.animation ?? prev.animation
          }));
          console.log('스타일 설정 업데이트 완료');
        }
      },
      (error) => {
        console.error('스타일 설정 구독 에러:', error);
      }
    );

    // 컴포넌트 언마운트 시 구독 해제
    return () => unsubscribe();
  }, [userId]);
  const currentUser = useSelector((state: any) => state.user.currentUser);

  // 메모 불러오기
  useEffect(() => {
    const loadMemos = async () => {
      if (!userId) return;
      
      try {
        const q = query(
          collection(db, `users/${userId}/memos`),
          orderBy('date', 'desc')
        );
        const snapshot = await getDocs(q);
        const loadedMemos = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            content: data.content || '',
            status: data.status as 'todo' | 'today' | 'completed',
            date: data.date?.toDate() || new Date(),
            emotion: data.emotion,
            images: data.images || []
          };
        });
        setMemos(loadedMemos);
      } catch (error) {
        console.error('메모 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMemos();
  }, [userId]);

  // 감정 분석 수행
  const analyzeEmotion = async (text: string): Promise<EmotionAnalysis | null> => {
    try {
      console.log('감정 분석 시작:', text);
      
      const response = await fetch('/api/analyze-emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('감정 분석 API 오류:', data);
        throw new Error(data.error || '감정 분석 실패');
      }

      console.log('감정 분석 결과:', data);
      return data;
    } catch (error) {
      console.error('감정 분석 중 오류:', error);
      alert('감정 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
      return null;
    }
  };

  // 메모 추가
  const handleAddMemo = async () => {
    if (!writeForm.content.trim() || !userId) return;

    try {
      console.log('메모 추가 시작:', { userId, content: writeForm.content, activeTab });
      
      // 이미지 병렬 업로드
      const uploadedUrls = await Promise.all(
        writeForm.pendingImages.map(async (file) => {
          const fileRef = ref(storage, `memos/${userId}/${Date.now()}_${file.name}`);
          await uploadBytes(fileRef, file);
          return getDownloadURL(fileRef);
        })
      );

      const memoData = {
        content: writeForm.content,
        date: writeForm.date,
        status: activeTab,
        emotion: null, // 초기에는 감정 분석 없음
        images: uploadedUrls
      };

      console.log('저장할 메모 데이터:', memoData);
      console.log('저장 경로:', `users/${userId}/memos`);

      const docRef = await addDoc(collection(db, `users/${userId}/memos`), memoData);
      console.log('메모 저장 완료. 문서 ID:', docRef.id);

      // 메모 목록 새로고침
      const q = query(
        collection(db, `users/${userId}/memos`),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const loadedMemos = snapshot.docs.map(doc => ({
        id: doc.id,
        content: doc.data().content || '',
        status: doc.data().status as 'todo' | 'today' | 'completed',
        date: doc.data().date?.toDate() || new Date(),
        emotion: doc.data().emotion,
        images: doc.data().images || []
      }));
      setMemos(loadedMemos);

      setWriteForm({
        content: '',
        images: [],
        pendingImages: [],
        date: new Date()
      });
      setIsWriting(false);
    } catch (error) {
      console.error('메모 추가 실패:', error);
      alert('메모 저장 중 오류가 발생했습니다.');
    }
  };

  // 메모 삭제
  const handleDelete = async (memoId: string) => {
    try {
      await deleteDoc(doc(db, `users/${userId}/memos`, memoId));
      setMemos(memos.filter(memo => memo.id !== memoId));
    } catch (error) {
      console.error('메모 삭제 실패:', error);
    }
  };

  // 메모 상태 변경
  const handleStatusChange = async (memoId: string, newStatus: 'todo' | 'today' | 'completed') => {
    try {
      await updateDoc(doc(db, `users/${userId}/memos`, memoId), {
        status: newStatus
      });
      setMemos(memos.map(memo => 
        memo.id === memoId ? { ...memo, status: newStatus } : memo
      ));
    } catch (error) {
      console.error('상태 변경 실패:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  // 스타일 설정 UI 렌더링
  const renderStyleSettings = () => {
    // 에디터 페이지에서만 스타일 설정 표시
    const isEditorPage = pathname?.includes('/editor/') || pathname?.startsWith('/editor');

    return (
      <div className="w-full mb-4 p-4 bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-white">메모장 스타일 설정</h3>
        <div className="space-y-4">
          {/* 스타일 선택 */}
          <div className="grid gap-2">
            <label className="text-sm font-medium text-white">스타일</label>
            <select
              value={styleSettings.style}
              onChange={(e) => saveStyleSettings({ ...styleSettings, style: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700/50 rounded-lg border border-gray-600"
            >
              <option value="default">기본</option>
              <option value="solid">실선 강조</option>
              <option value="gradient">그라데이션</option>
              <option value="glow">글로우</option>
              <option value="glass">글래스</option>
              <option value="modern">모던</option>
              <option value="minimal">미니멀</option>
              <option value="floating">플로팅</option>
              <option value="neon">네온</option>
            </select>
          </div>

          {/* 배경 색상 선택 */}
          <div className="grid gap-2">
            <label className="text-sm font-medium text-white">배경 색상</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map(color => (
                <button
                  key={color}
                  onClick={() => saveStyleSettings({ ...styleSettings, color })}
                  className={cn(
                    "w-8 h-8 rounded-full border border-gray-600",
                    styleSettings.color === color && "ring-2 ring-blue-500"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* 텍스트 색상 선택 */}
          <div className="grid gap-2">
            <label className="text-sm font-medium text-white">텍스트 색상</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map(color => (
                <button
                  key={color}
                  onClick={() => saveStyleSettings({ ...styleSettings, textColor: color })}
                  className={cn(
                    "w-8 h-8 rounded-full border border-gray-600",
                    styleSettings.textColor === color && "ring-2 ring-blue-500"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* 모서리 색상 선택 */}
          <div className="grid gap-2">
            <label className="text-sm font-medium text-white">모서리 색상</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map(color => (
                <button
                  key={color}
                  onClick={() => saveStyleSettings({ ...styleSettings, borderColor: color })}
                  className={cn(
                    "w-8 h-8 rounded-full border-2",
                    styleSettings.borderColor === color && "ring-2 ring-blue-500"
                  )}
                  style={{ 
                    backgroundColor: 'transparent',
                    borderColor: color
                  }}
                />
              ))}
            </div>
          </div>

          {/* 투명도 설정 */}
          <div className="grid gap-2">
            <label className="text-sm font-medium text-white">배경 투명도</label>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.05}
              value={styleSettings.opacity}
              onChange={(e) => saveStyleSettings({ ...styleSettings, opacity: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* 모서리 설정 */}
          <div className="grid gap-2">
            <label className="text-sm font-medium text-white">모서리</label>
            <select
              value={styleSettings.borderRadius}
              onChange={(e) => saveStyleSettings({ ...styleSettings, borderRadius: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700/50 rounded-lg border border-gray-600"
            >
              <option value="none">각진</option>
              <option value="sm">약간 둥근</option>
              <option value="lg">둥근</option>
              <option value="xl">많이 둥근</option>
              <option value="full">완전 둥근</option>
            </select>
          </div>

          {/* 그림자 설정 */}
          <div className="grid gap-2">
            <label className="text-sm font-medium text-white">그림자</label>
            <select
              value={styleSettings.shadow}
              onChange={(e) => saveStyleSettings({ ...styleSettings, shadow: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700/50 rounded-lg border border-gray-600"
            >
              <option value="none">없음</option>
              <option value="sm">약한</option>
              <option value="md">보통</option>
              <option value="lg">강한</option>
              <option value="inner">안쪽</option>
              <option value="glow">글로우</option>
            </select>
          </div>

          {/* 호버 효과 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hoverEffect"
              checked={styleSettings.hoverEffect}
              onChange={(e) => saveStyleSettings({ ...styleSettings, hoverEffect: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="hoverEffect" className="text-sm font-medium text-white">호버 효과</label>
          </div>

          {/* 애니메이션 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="animation"
              checked={styleSettings.animation}
              onChange={(e) => saveStyleSettings({ ...styleSettings, animation: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="animation" className="text-sm font-medium text-white">애니메이션 효과</label>
          </div>
        </div>
      </div>
    );
  };

  // 에디터 페이지 여부 확인
  const isEditorPage = pathname?.includes('/editor/') || pathname?.startsWith('/editor');

  return (
    <div className="w-full max-w-[1100px] mx-auto p-4 bg-gray-900/10 backdrop-blur-sm border border-white/5 rounded-lg space-y-6">
      <style jsx global>{animationStyle}</style>
      {isEditorPage && (
        <div className="w-full mb-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "w-full p-2 rounded-lg mb-2 hover:bg-opacity-30 transition-all",
              styleSettings.borderRadius === 'none' && 'rounded-none',
              styleSettings.borderRadius === 'sm' && 'rounded',
              styleSettings.borderRadius === 'md' && 'rounded-lg',
              styleSettings.borderRadius === 'lg' && 'rounded-xl',
              styleSettings.borderRadius === 'full' && 'rounded-full'
            )}
            style={{ 
              backgroundColor: `${styleSettings.color}${Math.round((styleSettings.opacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
              color: styleSettings.textColor 
            }}
          >
            데이원메모 스타일 설정 {showSettings ? '닫기' : '열기'}
          </button>
          {showSettings && renderStyleSettings()}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="flex-1">
          <TabsList 
            className={cn(
              "grid w-full grid-cols-3 bg-transparent h-10",
              styleSettings.borderRadius === 'none' && 'rounded-none',
              styleSettings.borderRadius === 'sm' && 'rounded',
              styleSettings.borderRadius === 'md' && 'rounded-lg',
              styleSettings.borderRadius === 'lg' && 'rounded-xl',
              styleSettings.borderRadius === 'full' && 'rounded-full'
            )}
            style={{
              backgroundColor: `${styleSettings.color}${Math.round(styleSettings.opacity * 255).toString(16).padStart(2, '0')}`,
              color: styleSettings.textColor
            }}
          >
            <TabsTrigger 
              value="todo" 
              className={cn(
                "data-[state=active]:bg-white/5 h-10",
                styleSettings.hoverEffect && "hover:bg-white/10"
              )}
              style={{ color: styleSettings.textColor }}
            >
              해야할 일
            </TabsTrigger>
            <TabsTrigger 
              value="today" 
              className={cn(
                "data-[state=active]:bg-white/5 h-10",
                styleSettings.hoverEffect && "hover:bg-white/10"
              )}
              style={{ color: styleSettings.textColor }}
            >
              오늘의 메모
            </TabsTrigger>
            <TabsTrigger 
              value="completed" 
              className={cn(
                "data-[state=active]:bg-white/5 h-10",
                styleSettings.hoverEffect && "hover:bg-white/10"
              )}
              style={{ color: styleSettings.textColor }}
            >
              완료된 일
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setViewMode(prev => prev === 'list' ? 'calendar' : 'list')}
          className={cn(
            "w-10 h-10",
            styleSettings.hoverEffect && "hover:bg-white/10",
            styleSettings.animation && "floating-animation",
            styleSettings.borderRadius === 'none' && 'rounded-none',
            styleSettings.borderRadius === 'sm' && 'rounded',
            styleSettings.borderRadius === 'md' && 'rounded-lg',
            styleSettings.borderRadius === 'lg' && 'rounded-xl',
            styleSettings.borderRadius === 'full' && 'rounded-full'
          )}
          style={{
            backgroundColor: `${styleSettings.color}${Math.round(styleSettings.opacity * 255).toString(16).padStart(2, '0')}`,
            color: styleSettings.textColor,
            boxShadow: styleSettings.shadow === 'none' ? 'none' : `0 4px 6px ${styleSettings.color}40`
          }}
        >
          {viewMode === 'list' ? <CalendarIcon className="w-4 h-4" /> : <List className="w-4 h-4" />}
        </Button>
      </div>

      {viewMode === 'calendar' ? (
        <div className="mt-4 p-4 bg-white/5 rounded-lg backdrop-blur-sm">
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={(date) => setSelectedDate(date || null)}
            required={false}
            className="w-full"
            locale={ko}
            modifiers={{
              booked: (date) => {
                return memos.some(memo => {
                  const memoDate = new Date(memo.date);
                  return (
                    memoDate.getFullYear() === date.getFullYear() &&
                    memoDate.getMonth() === date.getMonth() &&
                    memoDate.getDate() === date.getDate()
                  );
                });
              }
            }}
            modifiersStyles={{
              booked: {
                fontWeight: 'bold',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#fff'
              }
            }}
          />
          {selectedDate && (
            <div className="mt-4 space-y-4">
              <h3 className="font-medium text-lg">
                {format(selectedDate, 'PPP', { locale: ko })}의 메모
              </h3>
              {memos
                .filter(memo => {
                  const memoDate = new Date(memo.date);
                  return (
                    memoDate.getFullYear() === selectedDate.getFullYear() &&
                    memoDate.getMonth() === selectedDate.getMonth() &&
                    memoDate.getDate() === selectedDate.getDate()
                  );
                })
                .map(memo => (
                <div 
                  key={memo.id} 
                  className={cn(
                    "p-4 backdrop-blur-sm transition-all duration-300 ease-in-out",
                    styleSettings.borderRadius === 'none' && 'rounded-none',
                    styleSettings.borderRadius === 'sm' && 'rounded',
                    styleSettings.borderRadius === 'md' && 'rounded-lg',
                    styleSettings.borderRadius === 'lg' && 'rounded-xl',
                    styleSettings.borderRadius === 'full' && 'rounded-full',
                    styleSettings.hoverEffect && "hover:bg-white/20 hover:scale-[1.01]",
                    styleSettings.animation && "floating-animation"
                  )}
                  style={getStyleObject()}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: `${styleSettings.textColor}80` }}>
                        {format(new Date(memo.date), 'p', { locale: ko })}
                      </span>
                        {memo.emotion && (
                          <div 
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-sm"
                            style={{ backgroundColor: `${memo.emotion.color}30` }}
                          >
                            <span>{memo.emotion.icon}</span>
                            <span style={{ color: styleSettings.textColor }}>{memo.emotion.emotion}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {memo.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(memo.id, 'completed')}
                          >
                            완료
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(memo.id)}
                        >
                          삭제
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap" style={{ color: styleSettings.textColor }}>{memo.content}</p>
                        {memo.emotion && (
                          <div className="mt-2 text-sm" style={{ color: `${styleSettings.textColor}80` }}>
                            <p>{memo.emotion.summary}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {memo.emotion.keywords.map((keyword, index) => (
                                <span 
                                  key={index}
                                  className="px-2 py-0.5 rounded-full text-xs"
                                  style={{ backgroundColor: `${memo.emotion?.color}20` }}
                                >
                                  #{keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {memo.images && memo.images.length > 0 && (
                        <div className="relative flex-shrink-0 w-16 h-16">
                          <img
                            src={memo.images[0]}
                            alt={`메모 이미지 1`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          {memo.images.length > 1 && (
                            <div 
                              className="absolute top-0 right-0 -mt-2 -mr-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                              style={{ backgroundColor: styleSettings.color }}
                            >
                              +{memo.images.length - 1}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap" style={{ color: styleSettings.textColor }}>{memo.content}</p>
                    {memo.emotion && (
                      <div className="mt-2 text-sm" style={{ color: `${styleSettings.textColor}80` }}>
                        <p>{memo.emotion.summary}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {memo.emotion.keywords.map((keyword, index) => (
                            <span 
                              key={index}
                              className="px-2 py-0.5 rounded-full text-xs"
                              style={{ backgroundColor: `${memo.emotion?.color}20` }}
                            >
                              #{keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4">
          {editable && (
            <Button 
              onClick={() => setIsWriting(true)}
              className={cn(
                "w-full mb-4",
                styleSettings.hoverEffect && "hover:bg-white/10",
                styleSettings.animation && "floating-animation",
                styleSettings.borderRadius === 'none' && 'rounded-none',
                styleSettings.borderRadius === 'sm' && 'rounded',
                styleSettings.borderRadius === 'md' && 'rounded-lg',
                styleSettings.borderRadius === 'lg' && 'rounded-xl',
                styleSettings.borderRadius === 'full' && 'rounded-full'
              )}
              style={{
                backgroundColor: `${styleSettings.color}${Math.round(styleSettings.opacity * 255).toString(16).padStart(2, '0')}`,
                color: styleSettings.textColor,
                boxShadow: styleSettings.shadow === 'none' ? 'none' : `0 4px 6px ${styleSettings.color}40`
              }}
            >
              새 메모 작성
            </Button>
          )}

          {/* 주간 감정 흐름 */}
          <div 
            className={cn(
              "mb-6 p-3 backdrop-blur-sm transition-all duration-300 ease-in-out",
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
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, index) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - index));
                const dayMemos = memos.filter(memo => {
                  const memoDate = new Date(memo.date);
                  return (
                    memoDate.getFullYear() === date.getFullYear() &&
                    memoDate.getMonth() === date.getMonth() &&
                    memoDate.getDate() === date.getDate()
                  );
                });
                
                // 해당 날짜의 대표 감정 찾기 (가장 강한 intensity를 가진 감정)
                const mainEmotion = dayMemos
                  .filter(memo => memo.emotion)
                  .sort((a, b) => (b.emotion?.intensity || 0) - (a.emotion?.intensity || 0))[0]?.emotion;

                const isToday = index === 6;

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
                    <div 
                      className={cn(
                        "text-xs mb-1",
                        isToday && "font-medium"
                      )}
                      style={{ color: styleSettings.textColor }}
                    >
                      {format(date, 'd', { locale: ko })}
                    </div>
                    {mainEmotion ? (
                      <div 
                        className="text-xl transition-transform hover:scale-110" 
                        title={`${format(date, 'PPP', { locale: ko })} - ${mainEmotion.emotion}`}
                        style={{ 
                          color: mainEmotion.color,
                          textShadow: styleSettings.shadow === 'glow' ? `0 0 10px ${mainEmotion.color}` : 'none'
                        }}
                      >
                        {mainEmotion.icon}
                      </div>
                    ) : (
                      <div 
                        className="w-4 h-4 rounded-full border flex items-center justify-center"
                        style={{ 
                          borderColor: `${styleSettings.color}40`,
                          opacity: isToday ? 0.5 : 0.2
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {memos
              .filter(memo => {
                const today = new Date();
                const memoDate = new Date(memo.date);
                const isToday = (
                  memoDate.getFullYear() === today.getFullYear() &&
                  memoDate.getMonth() === today.getMonth() &&
                  memoDate.getDate() === today.getDate()
                );

                switch (activeTab) {
                  case 'today':
                    // '오늘의 메모' 탭에서는 오늘 날짜의 모든 메모 표시
                    return isToday;
                  case 'todo':
                    // '해야할 일' 탭에서는 완료되지 않은 할 일만 표시
                    return memo.status === 'todo';
                  case 'completed':
                    // '완료된 일' 탭에서는 완료된 메모만 표시
                    return memo.status === 'completed';
                  default:
                    return false;
                }
              })
              // '해야할 일'은 작성 순서대로, 나머지는 날짜 순으로 정렬
              .sort((a, b) => {
                if (activeTab === 'todo') {
                  return 0; // 작성 순서 유지 (이미 Firestore에서 가져온 순서대로)
                }
                return new Date(b.date).getTime() - new Date(a.date).getTime();
              })
              .map(memo => (
                <div 
                  key={memo.id} 
                  className={cn(
                    "p-4 backdrop-blur-sm transition-all duration-300 ease-in-out",
                    styleSettings.borderRadius === 'none' && 'rounded-none',
                    styleSettings.borderRadius === 'sm' && 'rounded-sm',
                    styleSettings.borderRadius === 'md' && 'rounded-md',
                    styleSettings.borderRadius === 'lg' && 'rounded-lg',
                    styleSettings.borderRadius === 'xl' && 'rounded-xl',
                    styleSettings.borderRadius === 'full' && 'rounded-3xl',
                    styleSettings.hoverEffect && "hover:bg-white/20 hover:scale-[1.01]",
                    styleSettings.animation && "floating-animation"
                  )}
                  style={{
                    ...getStyleObject(),
                    overflow: 'hidden' // 이미지가 모서리를 벗어나지 않도록
                  }}
                >
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm" style={{ color: `${styleSettings.textColor}80` }}>
                            {format(new Date(memo.date), 'PPP', { locale: ko })}
                          </span>
                          {memo.emotion && (
                            <div 
                              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm"
                              style={{ backgroundColor: `${memo.emotion.color}30` }}
                            >
                              <span>{memo.emotion.icon}</span>
                              <span style={{ color: styleSettings.textColor }}>{memo.emotion.emotion}</span>
                            </div>
                          )}
                        </div>
                        <div 
                          className="cursor-pointer"
                          onClick={() => setSelectedMemo(memo)}
                        >
                          <p className="whitespace-pre-wrap" style={{ color: styleSettings.textColor }}>{memo.content}</p>
                          {memo.emotion && (
                            <div className="mt-2 text-sm" style={{ color: `${styleSettings.textColor}80` }}>
                              <p>{memo.emotion.summary}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {memo.emotion.keywords.map((keyword, index) => (
                                  <span 
                                    key={index}
                                    className="px-2 py-0.5 rounded-full text-xs"
                                    style={{ backgroundColor: `${memo.emotion?.color}20` }}
                                  >
                                    #{keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 mt-3">
                          {memo.emotion ? (
                            <div className="flex flex-col gap-1 p-2 rounded-lg" style={{ backgroundColor: `${memo.emotion.color}15` }}>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{memo.emotion.icon}</span>
                                <div>
                                  <div className="font-medium" style={{ color: memo.emotion.color }}>
                                    {memo.emotion.emotion}
                                  </div>
                                  <div className="text-sm" style={{ color: `${styleSettings.textColor}80` }}>
                                    {memo.emotion.summary}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {memo.emotion.keywords.map((keyword, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-0.5 rounded-full text-xs"
                                    style={{ 
                                      backgroundColor: `${memo.emotion?.color}20`,
                                      color: memo.emotion?.color
                                    }}
                                  >
                                    #{keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-1 items-center text-sm" style={{ color: `${styleSettings.textColor}80` }}>
                          
                            <button
                              onClick={() => {
                                setConfirmDialog({
                                  isOpen: true,
                                  title: '감정 분석',
                                  message: '이 메모의 감정을 분석하시겠습니까? AI가 메모의 내용을 분석하여 감정 상태를 파악합니다.',
                                  action: async () => {
                                    setAnalyzingMemos(prev => [...prev, memo.id]);
                                    try {
                                      const emotionAnalysis = await analyzeEmotion(memo.content);
                                      if (emotionAnalysis) {
                                        await updateDoc(doc(db, `users/${userId}/memos`, memo.id), {
                                          emotion: emotionAnalysis
                                        });
                                      }
                                    } catch (error) {
                                      console.error('감정 분석 실패:', error);
                                    } finally {
                                      setAnalyzingMemos(prev => prev.filter(id => id !== memo.id));
                                      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                    }
                                  }
                                });
                              }}
                              className="p-1.5 rounded transition-colors hover:bg-white/10 relative"
                              title="감정 분석"
                              disabled={analyzingMemos.includes(memo.id)}
                            >
                              {analyzingMemos.includes(memo.id) ? (
                                <div className="animate-spin">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                  </svg>
                                </div>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"/>
                                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                                </svg>
                              )}
                            </button>
                          )
                          {activeTab !== 'completed' && (
                            <button
                              onClick={() => {
                                setConfirmDialog({
                                  isOpen: true,
                                  title: '메모 완료',
                                  message: '이 메모를 완료 처리하시겠습니까?',
                                  action: async () => {
                                    await handleStatusChange(memo.id, 'completed');
                                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                  }
                                });
                              }}
                              className="p-1.5 rounded transition-colors hover:bg-white/10"
                              title="완료"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5"/>
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingMemo(memo);
                              setWriteForm({
                                content: memo.content,
                                images: memo.images || [],
                                pendingImages: [],
                                date: new Date(memo.date)
                              });
                              setIsWriting(true);
                            }}
                            className="p-1.5 rounded transition-colors hover:bg-white/10"
                            title="수정"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                title: '메모 삭제',
                                message: '정말 이 메모를 삭제하시겠습니까?',
                                action: async () => {
                                  await handleDelete(memo.id);
                                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                }
                              });
                            }}
                            className="p-1.5 rounded transition-colors hover:bg-white/10"
                            title="삭제"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {memo.images && memo.images.length > 0 && (
                        <div 
                          className={cn(
                            "relative flex-shrink-0 w-24 h-24 group cursor-pointer",
                            styleSettings.borderRadius === 'none' && 'rounded-none',
                            styleSettings.borderRadius === 'sm' && 'rounded-sm',
                            styleSettings.borderRadius === 'md' && 'rounded-md',
                            styleSettings.borderRadius === 'lg' && 'rounded-lg',
                            styleSettings.borderRadius === 'xl' && 'rounded-xl',
                            styleSettings.borderRadius === 'full' && 'rounded-2xl'
                          )}
                          onClick={() => setSelectedMemo(memo)}
                        >
                          <div className={cn(
                            "absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity",
                            styleSettings.borderRadius === 'none' && 'rounded-none',
                            styleSettings.borderRadius === 'sm' && 'rounded-sm',
                            styleSettings.borderRadius === 'md' && 'rounded-md',
                            styleSettings.borderRadius === 'lg' && 'rounded-lg',
                            styleSettings.borderRadius === 'xl' && 'rounded-xl',
                            styleSettings.borderRadius === 'full' && 'rounded-2xl'
                          )} />
                          <img
                            src={memo.images[0]}
                            alt={`메모 이미지 1`}
                            className={cn(
                              "w-full h-full object-cover ring-1 ring-white/10",
                              styleSettings.borderRadius === 'none' && 'rounded-none',
                              styleSettings.borderRadius === 'sm' && 'rounded-sm',
                              styleSettings.borderRadius === 'md' && 'rounded-md',
                              styleSettings.borderRadius === 'lg' && 'rounded-lg',
                              styleSettings.borderRadius === 'xl' && 'rounded-xl',
                              styleSettings.borderRadius === 'full' && 'rounded-2xl'
                            )}
                          />
                          {memo.images.length > 1 && (
                            <div 
                              className="absolute bottom-1.5 right-1.5 text-white text-xs px-1.5 py-0.5 rounded-full backdrop-blur-sm bg-black/30 border border-white/20 text-[10px] font-medium"
                            >
                              +{memo.images.length - 1}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <Dialog 
        open={isWriting} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingMemo(null);
            setWriteForm({
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
            <DialogTitle>{editingMemo ? '메모 수정' : '새 메모 작성'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 날짜 선택 */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">날짜</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(writeForm.date, 'PPP', { locale: ko })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={writeForm.date}
                    onSelect={(date) => date && setWriteForm(prev => ({ ...prev, date }))}
                    initialFocus
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* 메모 내용 */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">내용</label>
              <Textarea
                value={writeForm.content}
                onChange={(e) => setWriteForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="메모를 입력하세요..."
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
                          <Trash2 className="w-4 h-4" />
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
              if (editingMemo) {
                // 수정 모드
                try {
                  // 이미지 업로드 (새로 추가된 이미지만)
                  const uploadedUrls = await Promise.all(
                    writeForm.pendingImages.map(async (file) => {
                      const fileRef = ref(storage, `memos/${userId}/${Date.now()}_${file.name}`);
                      await uploadBytes(fileRef, file);
                      return getDownloadURL(fileRef);
                    })
                  );

                  // 기존 이미지와 새로 업로드된 이미지 합치기
                  const allImages = [...writeForm.images, ...uploadedUrls];

                  await updateDoc(doc(db, `users/${userId}/memos`, editingMemo.id), {
                    content: writeForm.content,
                    date: writeForm.date,
                    images: allImages
                  });

                  setIsWriting(false);
                  setEditingMemo(null);
                } catch (error) {
                  console.error('메모 수정 실패:', error);
                  alert('메모 수정 중 오류가 발생했습니다.');
                }
              } else {
                // 새 메모 작성
                await handleAddMemo();
              }
            }}>
              {editingMemo ? '수정' : '저장'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 상세 보기 모달 */}
      <Dialog open={selectedMemo !== null} onOpenChange={(open) => !open && setSelectedMemo(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-lg text-gray-900">
                  {format(selectedMemo ? new Date(selectedMemo.date) : new Date(), 'PPP', { locale: ko })}
                </DialogTitle>
                {selectedMemo?.emotion && (
                  <div 
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-sm"
                    style={{ backgroundColor: `${selectedMemo.emotion.color}30` }}
                  >
                    <span>{selectedMemo.emotion.icon}</span>
                    <span className="text-gray-900">{selectedMemo.emotion.emotion}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                {selectedMemo && !selectedMemo.emotion && (
                  <button
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: '감정 분석',
                        message: '이 메모의 감정을 분석하시겠습니까? AI가 메모의 내용을 분석하여 감정 상태를 파악합니다.',
                        action: async () => {
                          setAnalyzingMemos(prev => [...prev, selectedMemo.id]);
                          try {
                            const emotionAnalysis = await analyzeEmotion(selectedMemo.content);
                            if (emotionAnalysis) {
                              await updateDoc(doc(db, `users/${userId}/memos`, selectedMemo.id), {
                                emotion: emotionAnalysis
                              });
                            }
                          } catch (error) {
                            console.error('감정 분석 실패:', error);
                          } finally {
                            setAnalyzingMemos(prev => prev.filter(id => id !== selectedMemo.id));
                            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                          }
                        }
                      });
                    }}
                    className="p-1.5 rounded transition-colors hover:bg-white/10 relative"
                    title="감정 분석"
                    disabled={analyzingMemos.includes(selectedMemo.id)}
                  >
                    {analyzingMemos.includes(selectedMemo.id) ? (
                      <div className="animate-spin">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12a9 9 0 11-6.219-8.56"/>
                        </svg>
                      </div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                        <line x1="9" y1="9" x2="9.01" y2="9"/>
                        <line x1="15" y1="9" x2="15.01" y2="9"/>
                      </svg>
                    )}
                  </button>
                )}
                {selectedMemo && selectedMemo.status !== 'completed' && (
                  <button
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: '메모 완료',
                        message: '이 메모를 완료 처리하시겠습니까?',
                        action: async () => {
                          await handleStatusChange(selectedMemo.id, 'completed');
                          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                          setSelectedMemo(null);
                        }
                      });
                    }}
                    className="p-1.5 rounded transition-colors hover:bg-white/10"
                    title="완료"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </button>
                )}
                {selectedMemo && (
                  <>
                    <button
                      onClick={() => {
                        setEditingMemo(selectedMemo);
                        setWriteForm({
                          content: selectedMemo.content,
                          images: selectedMemo.images || [],
                          pendingImages: [],
                          date: new Date(selectedMemo.date)
                        });
                        setIsWriting(true);
                        setSelectedMemo(null);
                      }}
                      className="p-1.5 rounded transition-colors hover:bg-white/10"
                      title="수정"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: '메모 삭제',
                          message: '정말 이 메모를 삭제하시겠습니까?',
                          action: async () => {
                            await handleDelete(selectedMemo.id);
                            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                            setSelectedMemo(null);
                          }
                        });
                      }}
                      className="p-1.5 rounded transition-colors hover:bg-white/10"
                      title="삭제"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {selectedMemo && (
              <>
                <p className="whitespace-pre-wrap mb-6 text-gray-900">
                  {selectedMemo.content}
                </p>
                {selectedMemo.emotion && (
                  <div className="mb-6 text-sm text-gray-600">
                    <p>{selectedMemo.emotion.summary}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedMemo.emotion.keywords.map((keyword, index) => (
                        <span 
                          key={index}
                          className="px-2 py-0.5 rounded-full text-xs text-gray-900"
                          style={{ backgroundColor: `${selectedMemo.emotion?.color}20` }}
                        >
                          #{keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedMemo.images && selectedMemo.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {selectedMemo.images.map((imageUrl, index) => (
                      <div key={index} className="aspect-square relative group">
                        <img
                          src={imageUrl}
                          alt={`메모 이미지 ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg ring-1 ring-white/10"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 확인 다이얼로그 */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => !open && setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500">{confirmDialog.message}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            >
              취소
            </Button>
            <Button 
              onClick={async () => {
                try {
                  await confirmDialog.action();
                } catch (error) {
                  console.error('작업 실패:', error);
                  alert('작업 중 오류가 발생했습니다.');
                }
              }}
            >
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}