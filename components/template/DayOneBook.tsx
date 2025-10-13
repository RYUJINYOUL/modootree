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
import { Image as ImageIcon, X, Trash2, PenSquare, List, Settings, Calendar as CalendarIcon } from 'lucide-react';
import Image from 'next/image';
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


interface MemoItem {
  id: string;
  content: string;
  date: Date;
  status: 'todo' | 'today' | 'completed';
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
  
  // 탭 변경 시 보이는 개수 초기화
  const handleTabChange = (value: TabType) => {
    setActiveTab(value);
    setVisibleCount(prev => ({
      ...prev,
      [value]: 5
    }));
  };
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
  const [writeForm, setWriteForm] = useState<{
    content: string;
    images: string[];
    pendingImages: File[];
    date: Date;
  }>({
    content: '',
    images: [] as string[],
    pendingImages: [] as File[],
    date: new Date()
  });
  
  // useRef는 useState 다음에 배치
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [visibleCount, setVisibleCount] = useState<{ [key in 'todo' | 'today' | 'completed']: number }>({
    todo: 5,
    today: 5,
    completed: 5
  });
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
        : `${styleSettings.color}${Math.round((1 - styleSettings.opacity) * 255).toString(16).padStart(2, '0')}`,
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

  // 메모 실시간 구독
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
          content: data.content || '',
          status: data.status as 'todo' | 'today' | 'completed',
          date: data.date?.toDate() || new Date(),
          suggestion: data.suggestion,
          images: data.images || []
        };
      });
      setMemos(loadedMemos);
      setLoading(false);
    }, (error) => {
      console.error('메모 구독 에러:', error);
      setLoading(false);
    });

    // 컴포넌트 언마운트 시 구독 해제
    return () => unsubscribe();
  }, [userId]);

  // 감정 분석 제거

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
              max={1}
              step={0.1}
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
    <div className="w-full max-w-[1200px] mx-auto space-y-6 p-2 pt-4 md:flex md:flex-col md:items-center md:w-full">
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
      <div className="flex items-center gap-2 w-full max-w-[1100px]">
        <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as TabType)} className="flex-1">
          <TabsList 
            className={cn(
              "grid w-full grid-cols-3 bg-transparent h-12 p-0 overflow-hidden",
              styleSettings.borderRadius === 'none' && 'rounded-none',
              styleSettings.borderRadius === 'sm' && 'rounded',
              styleSettings.borderRadius === 'md' && 'rounded-lg',
              styleSettings.borderRadius === 'lg' && 'rounded-xl',
              styleSettings.borderRadius === 'full' && 'rounded-2xl'
            )}
            style={{
                            backgroundColor: `${styleSettings.color}${Math.round((1 - styleSettings.opacity) * 255).toString(16).padStart(2, '0')}`,
              color: styleSettings.textColor,
              border: `1px solid ${styleSettings.borderColor}`,
              boxShadow: styleSettings.shadow === 'none' ? 'none' : `0 0 10px ${styleSettings.borderColor}30`
            }}
          >
            <TabsTrigger 
              value="todo" 
              className={cn(
                "data-[state=active]:bg-white/5 h-12 text-base",
                styleSettings.hoverEffect && "hover:bg-white/10"
              )}
              style={{ 
                color: styleSettings.textColor
              }}
            >
              목록
            </TabsTrigger>
            <TabsTrigger 
              value="today" 
              className={cn(
                "data-[state=active]:bg-white/5 h-12 text-base",
                styleSettings.hoverEffect && "hover:bg-white/10"
              )}
              style={{ 
                color: styleSettings.textColor
              }}
            >
              오늘
            </TabsTrigger>
            <TabsTrigger 
              value="completed" 
              className={cn(
                "data-[state=active]:bg-white/5 h-12 text-base",
                styleSettings.hoverEffect && "hover:bg-white/10"
              )}
              style={{ 
                color: styleSettings.textColor
              }}
            >
              완료
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsWriting(true)}
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
                            backgroundColor: `${styleSettings.color}${Math.round((1 - styleSettings.opacity) * 255).toString(16).padStart(2, '0')}`,
            color: styleSettings.textColor,
            boxShadow: styleSettings.shadow === 'none' ? 'none' : `0 4px 6px ${styleSettings.color}40`
          }}
        >
          <PenSquare className="w-4 h-4" />
        </Button>
      </div>

      {(
        <div className="mt-4 w-full max-w-[1100px]">
          <div className="space-y-4">
            {/* 필터링된 메모 목록 */}
            {(() => {
              const filteredMemos = memos.filter(memo => {
                const today = new Date();
                const memoDate = new Date(memo.date);
                const isToday = (
                  memoDate.getFullYear() === today.getFullYear() &&
                  memoDate.getMonth() === today.getMonth() &&
                  memoDate.getDate() === today.getDate()
                );

                switch (activeTab) {
                  case 'today':
                    // '오늘 메모' 탭에서는 오늘 날짜의 모든 메모 표시
                    return isToday;
                  case 'todo':
                    // '목록' 탭에서는 완료되지 않은 할 일만 표시
                    return memo.status === 'todo';
                  case 'completed':
                    // '완료' 탭에서는 완료된 메모만 표시
                    return memo.status === 'completed';
                  default:
                    return false;
                }
              });

              // '해야할 일'은 작성 순서대로, 나머지는 날짜 순으로 정렬
              const sortedMemos = filteredMemos.sort((a, b) => {
                if (activeTab === 'todo') {
                  return 0; // 작성 순서 유지 (이미 Firestore에서 가져온 순서대로)
                }
                return new Date(b.date).getTime() - new Date(a.date).getTime();
              });

              // 현재 탭에 해당하는 표시 개수만큼 잘라내기
              const visibleMemos = sortedMemos.slice(0, visibleCount[activeTab]);
              const hasMore = sortedMemos.length > visibleCount[activeTab];

              return (
                <>
                  {visibleMemos.length === 0 ? (
                    <div 
                      className={cn(
                        "p-6 backdrop-blur-sm transition-all duration-300 ease-in-out text-center",
                        styleSettings.borderRadius === 'none' && 'rounded-none',
                        styleSettings.borderRadius === 'sm' && 'rounded-sm',
                        styleSettings.borderRadius === 'md' && 'rounded-md',
                        styleSettings.borderRadius === 'lg' && 'rounded-lg',
                        styleSettings.borderRadius === 'xl' && 'rounded-xl',
                        styleSettings.borderRadius === 'full' && 'rounded-3xl',
                      )}
                      style={getStyleObject()}
                    >
                      <p style={{ color: styleSettings.textColor }}>메모가 없습니다</p>
                    </div>
                  ) : (
                    visibleMemos.map(memo => (
                <div 
                  key={memo.id} 
                  className={cn(
                    "p-6 backdrop-blur-sm transition-all duration-300 ease-in-out",
                    styleSettings.borderRadius === 'none' && 'rounded-none',
                    styleSettings.borderRadius === 'sm' && 'rounded-sm',
                    styleSettings.borderRadius === 'md' && 'rounded-md',
                    styleSettings.borderRadius === 'lg' && 'rounded-lg',
                    styleSettings.borderRadius === 'xl' && 'rounded-xl',
                    styleSettings.borderRadius === 'full' && 'rounded-3xl',
                    styleSettings.hoverEffect && "hover:bg-white/20 hover:scale-[1.01]",
                    styleSettings.animation && "floating-animation",
                    activeTab === 'completed' && "opacity-80"
                  )}
                  style={{
                    ...getStyleObject(),
                    overflow: 'hidden',
                    ...(activeTab === 'completed' && { filter: 'grayscale(30%)' })
                  }}
                >
                    <div className="flex items-start gap-4">
                      {activeTab === 'todo' && (
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
                          className={cn(
                            "w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                            "hover:bg-white/10"
                          )}
                          style={{ borderColor: styleSettings.borderColor }}
                        >
                          <svg
                            className="w-4 h-4 opacity-0 hover:opacity-50 transition-opacity"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke={styleSettings.textColor}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm" style={{ color: `${styleSettings.textColor}80` }}>
                            {activeTab === 'today' ? (
                              format(new Date(memo.date), 'a h:mm', { locale: ko })
                            ) : activeTab === 'completed' ? (
                              format(new Date(memo.date), 'M월 d일', { locale: ko }) + 
                              ' ' + new Date(memo.date).getFullYear().toString().slice(-2) + '년'
                            ) : (
                              (() => {
                                const today = new Date();
                                const memoDate = new Date(memo.date);
                                const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                const memoStart = new Date(memoDate.getFullYear(), memoDate.getMonth(), memoDate.getDate());
                                const diffDays = Math.floor((memoStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
                                if (diffDays > 0) return `D-${diffDays}`;
                                if (diffDays < 0) return `${Math.abs(diffDays)}일 지남`;
                                return '오늘';
                              })()
                            )}
                          </span>
                        </div>
                        <div 
                          className="cursor-pointer"
                          onClick={() => setSelectedMemo(memo)}
                        >
                          <p 
                            className="whitespace-pre-wrap text-base line-clamp-3 sm:line-clamp-none" 
                            style={{ color: styleSettings.textColor }}
                          >
                            {memo.content}
                          </p>
                          {memo.content.split('\n').length > 3 && (
                            <button
                              onClick={() => setSelectedMemo(memo)}
                              className="text-sm mt-2 hover:underline"
                              style={{ color: `${styleSettings.textColor}80` }}
                            >
                              더보기...
                            </button>
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
              )                  ))}
                  {hasMore && (
                    <button
                      onClick={() => setVisibleCount(prev => ({
                        ...prev,
                        [activeTab]: prev[activeTab] + 5
                      }))}
                      className={cn(
                        "w-full p-3 mt-4 rounded-lg transition-all",
                        styleSettings.hoverEffect && "hover:bg-white/10"
                      )}
                      style={{
                        backgroundColor: `${styleSettings.color}20`,
                        border: `1px solid ${styleSettings.color}40`,
                        color: styleSettings.textColor
                      }}
                    >
                      더보기 ({sortedMemos.length - visibleCount[activeTab]}개)
                    </button>
                  )}
                </>
              );
            })()}
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
                <PopoverContent className="w-auto p-0 relative z-50" align="start">
  <div className="relative">
    <Calendar
      mode="single"
      selected={writeForm.date}
      onSelect={(date) => {
        console.log('선택된 날짜:', date);
        console.log('현재 writeForm:', writeForm);
        if (date) {
          const newDate = new Date(date);
          console.log('변환된 날짜:', newDate);
          setWriteForm(prev => {
            const updated = {
              ...prev,
              date: newDate
            };
            console.log('업데이트될 writeForm:', updated);
            return updated;
          });
        }
      }}
      initialFocus
      locale={ko}
      disabled={(date) => false}
      fromDate={new Date(2020, 0)}
      toDate={new Date(2025, 11)}
      className="rounded-md border border-input bg-background pointer-events-auto"
    />
  </div>
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
                <DialogTitle className="text-lg text-white/90">
                  {format(selectedMemo ? new Date(selectedMemo.date) : new Date(), 'PPP', { locale: ko })}
                </DialogTitle>
              </div>
              <div className="flex justify-end">
                {currentUser?.uid === userId && (
                  <div className="flex gap-1">
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
                          className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 transition-all flex items-center gap-1.5"
                        >
                          <PenSquare className="w-4 h-4" />
                          <span>수정</span>
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
                          className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all flex items-center gap-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>삭제</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {selectedMemo && (
              <>
                <p className="whitespace-pre-wrap mb-6 text-white/90">
                  {selectedMemo.content}
                </p>
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