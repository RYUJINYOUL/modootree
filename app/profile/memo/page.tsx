'use client';

import { useState, useEffect, useRef } from 'react';
import './styles.css';
import { useSelector } from 'react-redux';
import { doc, collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Image as ImageIcon, Trash2, PenSquare, Calendar as CalendarIcon } from 'lucide-react';
import Image from 'next/image';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MemoItem {
  id: string;
  content: string;
  date: Date;
  status: 'todo' | 'today' | 'completed';
  images?: string[];
}

export default function MemoPage() {
  const { currentUser } = useSelector((state: any) => state.user);
  type TabType = 'todo' | 'today' | 'completed';
  
  // States
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingMemo, setEditingMemo] = useState<MemoItem | null>(null);
  const [selectedMemo, setSelectedMemo] = useState<MemoItem | null>(null);
  const [writeForm, setWriteForm] = useState<{
    content: string;
    images: string[];
    pendingImages: File[];
    date: Date;
  }>({
    content: '',
    images: [],
    pendingImages: [],
    date: new Date()
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [visibleCount, setVisibleCount] = useState<{ [key in TabType]: number }>({
    todo: 5,
    today: 5,
    completed: 5
  });

  // 탭 변경 핸들러
  const handleTabChange = (value: TabType) => {
    setActiveTab(value);
    setVisibleCount(prev => ({
      ...prev,
      [value]: 5
    }));
  };

  // 메모 실시간 구독
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    const q = query(
      collection(db, `users/${currentUser.uid}/private_memos`),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMemos = snapshot.docs.map(doc => ({
        id: doc.id,
        content: doc.data().content || '',
        status: doc.data().status as TabType,
        date: doc.data().date?.toDate() || new Date(),
        images: doc.data().images || []
      }));
      setMemos(loadedMemos);
      setLoading(false);
    }, (error) => {
      console.error('메모 구독 에러:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // 메모 추가
  const handleAddMemo = async () => {
    if (!writeForm.content.trim() || !currentUser?.uid) return;

    try {
      // 이미지 업로드
      const uploadedUrls = await Promise.all(
        writeForm.pendingImages.map(async (file) => {
          const fileRef = ref(storage, `private_memos/${currentUser.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(fileRef, file);
          return getDownloadURL(fileRef);
        })
      );

      // 날짜에 따른 status 결정
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const memoDate = new Date(writeForm.date);
      memoDate.setHours(0, 0, 0, 0);
      
      // 오늘이면 today, 나머지는 모두 todo로 설정
      const status: TabType = memoDate.getTime() === today.getTime() ? 'today' : 'todo';

      const memoData = {
        content: writeForm.content,
        date: writeForm.date,
        status,
        images: uploadedUrls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, `users/${currentUser.uid}/private_memos`), memoData);

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
    if (!currentUser?.uid) return;
    
    try {
      await deleteDoc(doc(db, `users/${currentUser.uid}/private_memos`, memoId));
      setMemos(memos.filter(memo => memo.id !== memoId));
    } catch (error) {
      console.error('메모 삭제 실패:', error);
    }
  };

  // 메모 상태 변경
  const handleStatusChange = async (memoId: string, newStatus: TabType) => {
    if (!currentUser?.uid) return;
    
    try {
      await updateDoc(doc(db, `users/${currentUser.uid}/private_memos`, memoId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('상태 변경 실패:', error);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">로그인이 필요합니다.</p>
      </div>
    );
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex-1 md:p-6 py-6 overflow-auto w-full">
      <div className="w-full space-y-6">
        {/* 탭 & 작성 버튼 */}
        <div className="flex items-center gap-2 px-2 md:px-0">
          <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as TabType)} className="flex-1">
              <TabsList className="grid w-full grid-cols-3 bg-[#2A4D45]/50 backdrop-blur-sm border border-[#358f80]/30 p-2 rounded-2xl">
                <TabsTrigger 
                  value="todo"
                  className="data-[state=active]:bg-[#56ab91]/60 data-[state=active]:text-white py-3 text-lg rounded-xl transition-all text-white"
                >
                  목록
                </TabsTrigger>
                <TabsTrigger 
                  value="today"
                  className="data-[state=active]:bg-[#56ab91]/60 data-[state=active]:text-white py-3 text-lg rounded-xl transition-all text-white"
                >
                  오늘
                </TabsTrigger>
                <TabsTrigger 
                  value="completed"
                  className="data-[state=active]:bg-[#56ab91]/60 data-[state=active]:text-white py-3 text-lg rounded-xl transition-all text-white"
                >
                  완료
                </TabsTrigger>
              </TabsList>
          </Tabs>
          <Button
            variant="outline"
            onClick={() => setIsWriting(true)}
            className="bg-[#56ab91]/60 hover:bg-[#56ab91]/80 border-[#358f80]/20 h-[60px] px-4 backdrop-blur-sm text-white"
          >
            <PenSquare className="w-6 h-6" />
          </Button>
        </div>

        {/* 메모 목록 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2 md:px-0">
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
                  return isToday && memo.status !== 'completed';
                case 'todo':
                  return memo.status === 'todo' || (memo.status !== 'completed' && !isToday);
                case 'completed':
                  return memo.status === 'completed';
                default:
                  return false;
              }
            });

            const sortedMemos = filteredMemos.sort((a, b) => {
              if (activeTab === 'todo') {
                return 0;
              }
              return new Date(b.date).getTime() - new Date(a.date).getTime();
            });

            const visibleMemos = sortedMemos.slice(0, visibleCount[activeTab]);
            const hasMore = sortedMemos.length > visibleCount[activeTab];

            return (
              <>
                {visibleMemos.length === 0 ? (
                      <div className="p-6 text-center bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-lg md:col-span-3">
                    <p className="text-gray-400">메모가 없습니다</p>
                  </div>
                ) : (
                  visibleMemos.map(memo => (
                        <div 
                          key={memo.id}
                          className={`p-6 rounded-lg transition-colors cursor-pointer backdrop-blur-sm border border-[#358f80]/20 ${
                            activeTab === 'todo' 
                              ? 'bg-[#2A4D45]/40 hover:bg-[#2A4D45]/50' 
                              : activeTab === 'today' 
                              ? 'bg-[#2A4D45]/50 hover:bg-[#2A4D45]/60'
                              : 'bg-[#2A4D45]/60 hover:bg-[#2A4D45]/70'
                          }`}
                          onClick={() => setSelectedMemo(memo)}
                        >
                      <div className="flex items-start gap-4">
                        {(activeTab === 'todo' || activeTab === 'today') && memo.status !== 'completed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('이 메모를 완료 처리하시겠습니까?\n완료된 메모는 \'완료\' 탭으로 이동됩니다.')) {
                                handleStatusChange(memo.id, 'completed');
                              }
                            }}
                            className="w-6 h-6 rounded border-2 border-gray-600 flex items-center justify-center flex-shrink-0 hover:bg-gray-700"
                          >
                            <svg
                              className="w-4 h-4 opacity-0 hover:opacity-50 transition-opacity"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
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
                            <span className="text-sm text-gray-400">
                              {activeTab === 'today' ? (
                                format(new Date(memo.date), 'a h:mm', { locale: ko })
                              ) : activeTab === 'completed' ? (
                                format(new Date(memo.date), 'M월 d일', { locale: ko })
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
                          <p className="whitespace-pre-wrap text-base line-clamp-3">
                            {memo.content}
                          </p>
                        </div>
                        {memo.images && memo.images.length > 0 && (
                              <div className="relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20">
                            <img
                              src={memo.images[0]}
                              alt="메모 이미지"
                              className="w-full h-full object-cover rounded-lg"
                            />
                            {memo.images.length > 1 && (
                              <div className="absolute bottom-1.5 right-1.5 text-white text-xs px-1.5 py-0.5 rounded-full bg-black/50 text-[10px]">
                                +{memo.images.length - 1}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {hasMore && (
                  <button
                    onClick={() => setVisibleCount(prev => ({
                      ...prev,
                      [activeTab]: prev[activeTab] + 5
                    }))}
                    className="w-full p-3 bg-[#2A4D45]/40 hover:bg-[#2A4D45]/50 backdrop-blur-sm border border-[#358f80]/20 rounded-lg transition-colors text-white md:col-span-3"
                  >
                    더보기 ({sortedMemos.length - visibleCount[activeTab]}개)
                  </button>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* 작성/수정 다이얼로그 */}
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
        <DialogContent className="memo-dialog-content sm:max-w-[800px] bg-[#2A4D45]/40 backdrop-blur-sm border border-[#358f80]/20">
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
                    className="w-full justify-start text-left font-normal bg-[#2A4D45]/40 border-[#358f80]/20 text-white"
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
                        if (date) {
                          const newDate = new Date(date);
                          setWriteForm(prev => ({
                            ...prev,
                            date: newDate
                          }));
                        }
                      }}
                      initialFocus
                      locale={ko}
                      disabled={(date) => false}
                      fromDate={new Date(2020, 0)}
                      toDate={new Date(2025, 11)}
                      className="rounded-md border border-input bg-background pointer-events-auto memo-calendar"
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
                className="min-h-[200px] bg-[#2A4D45]/40 border-[#358f80]/20 text-white placeholder-gray-400"
              />
            </div>
            
            {/* 이미지 업로드 */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">사진</label>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="bg-[#2A4D45]/40 border-[#358f80]/20 text-white hover:bg-[#2A4D45]/50"
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
                      const previewUrls = files.map(file => URL.createObjectURL(file));
                      setWriteForm(prev => ({
                        ...prev,
                        images: [...prev.images, ...previewUrls],
                        pendingImages: [...prev.pendingImages, ...files]
                      }));
                    }}
                    className="hidden"
                  />
                </div>

                {/* 이미지 미리보기 */}
                {writeForm.images.length > 0 && (
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
                              pendingImages: prev.pendingImages.filter((_, i) => i !== index)
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
              className="bg-[#2A4D45]/40 border-[#358f80]/20 text-white hover:bg-[#2A4D45]/50"
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
            <Button 
              onClick={handleAddMemo}
              className="bg-[#56ab91]/60 hover:bg-[#56ab91]/80 text-white"
            >
              {editingMemo ? '수정' : '저장'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 상세 보기 다이얼로그 */}
      <Dialog open={selectedMemo !== null} onOpenChange={(open) => !open && setSelectedMemo(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {selectedMemo && format(new Date(selectedMemo.date), 'PPP', { locale: ko })}
              </DialogTitle>
              {selectedMemo && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
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
                  >
                    <PenSquare className="w-4 h-4 mr-2" />
                    수정
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('정말 삭제하시겠습니까?')) {
                        handleDelete(selectedMemo.id);
                        setSelectedMemo(null);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    삭제
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {selectedMemo && (
              <>
                <p className="whitespace-pre-wrap mb-6">
                  {selectedMemo.content}
                </p>
                {selectedMemo.images && selectedMemo.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {selectedMemo.images.map((imageUrl, index) => (
                      <div key={index} className="aspect-square relative">
                        <img
                          src={imageUrl}
                          alt={`메모 이미지 ${index + 1}`}
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