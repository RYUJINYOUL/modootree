'use client';

import React, { useState, useEffect, useRef } from 'react';
import './styles.css';
import { useSelector } from 'react-redux';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { doc, collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PenSquare, Trash2, Calendar as CalendarIcon } from 'lucide-react';

interface DiaryItem {
  id: string;
  title: string;
  content: string;
  date: Date;
  images?: string[];
}

export default function DiaryPage() {
  const { currentUser } = useSelector((state: any) => state.user);
  
  // 로그인하지 않은 경우 바로 안내 메시지 표시
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">로그인이 필요한 서비스입니다</h2>
          <p className="text-gray-400">다이어리 기능을 사용하려면 회원가입 후 로그인해주세요.</p>
          <div className="space-x-4">
            <Button 
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              로그인
            </Button>
            <Button 
              onClick={() => window.location.href = '/signup'}
              className="bg-green-600 hover:bg-green-700"
            >
              회원가입
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  const [activeTab, setActiveTab] = useState<'list' | 'calendar' | 'gallery'>('list');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [diaries, setDiaries] = useState<DiaryItem[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDiary, setSelectedDiary] = useState<DiaryItem | null>(null);
  const [editingDiary, setEditingDiary] = useState<DiaryItem | null>(null);
  const [writeForm, setWriteForm] = useState<{
    title: string;
    content: string;
    images: string[];
    pendingImages: File[];
    date: Date;
  }>({
    title: '',
    content: '',
    images: [],
    pendingImages: [],
    date: new Date()
  });

  // 일기 실시간 구독
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    const q = query(
      collection(db, `users/${currentUser.uid}/private_diary`),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedDiaries = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || '',
        content: doc.data().content || '',
        date: doc.data().date?.toDate() || new Date(),
        images: doc.data().images || []
      }));
      setDiaries(loadedDiaries);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // 일기 추가
  const handleAddDiary = async () => {
    if (!writeForm.content.trim() || !currentUser?.uid) return;

    try {
      // 이미지 업로드
      const uploadedUrls = await Promise.all(
        writeForm.pendingImages.map(async (file) => {
          const fileRef = ref(storage, `private_diary/${currentUser.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(fileRef, file);
          return getDownloadURL(fileRef);
        })
      );

      const diaryData = {
        title: writeForm.title,
        content: writeForm.content,
        date: writeForm.date,
        images: uploadedUrls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, `users/${currentUser.uid}/private_diary`), diaryData);

      setWriteForm({
        title: '',
        content: '',
        images: [],
        pendingImages: [],
        date: new Date()
      });
      setIsWriting(false);
    } catch (error) {
      console.error('일기 추가 실패:', error);
      alert('일기 저장 중 오류가 발생했습니다.');
    }
  };

  // 일기 삭제
  const handleDelete = async (diaryId: string) => {
    if (!currentUser?.uid) return;
    
    try {
      await deleteDoc(doc(db, `users/${currentUser.uid}/private_diary`, diaryId));
    } catch (error) {
      console.error('일기 삭제 실패:', error);
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

  // 모든 이미지를 하나의 배열로 변환
  const allImages = diaries
    .filter(diary => diary.images && diary.images.length > 0)
    .reduce<Array<{ image: string; diary: DiaryItem }>>((acc, diary) => {
      const diaryImages = diary.images?.map(image => ({
        image,
        diary
      })) || [];
      return [...acc, ...diaryImages];
    }, [])
              .slice(0, 24);

  return (
    <div className="flex-1 md:p-6 py-6 overflow-x-hidden overflow-y-auto w-full">
      <div className="w-full space-y-6">
        {/* 탭 & 작성 버튼 */}
        <div className="flex items-center gap-2 px-2 md:px-0">
          <Tabs value={activeTab} onValueChange={(value: 'list' | 'calendar' | 'gallery') => setActiveTab(value)} className="flex-1">
            <TabsList className="grid w-full grid-cols-3 bg-[#2A4D45]/50 backdrop-blur-sm border border-[#358f80]/30 p-2 rounded-2xl">
              <TabsTrigger 
                value="list"
                className="data-[state=active]:bg-[#56ab91]/60 data-[state=active]:text-white py-3 text-lg rounded-xl transition-all text-white"
              >
                목록
              </TabsTrigger>
              <TabsTrigger 
                value="calendar"
                className="data-[state=active]:bg-[#56ab91]/60 data-[state=active]:text-white py-3 text-lg rounded-xl transition-all text-white"
              >
                달력
              </TabsTrigger>
              <TabsTrigger 
                value="gallery"
                className="data-[state=active]:bg-[#56ab91]/60 data-[state=active]:text-white py-3 text-lg rounded-xl transition-all text-white"
              >
                사진첩
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

        {/* 일기 목록 */}
        {activeTab === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2 md:px-0">
            {diaries.length === 0 ? (
              <div className="p-6 text-center bg-[#2A4D45]/40 backdrop-blur-sm rounded-lg md:col-span-3">
                <p className="text-gray-400">작성된 일기가 없습니다</p>
              </div>
            ) : (
              diaries.map(diary => (
                  <div 
                    key={diary.id}
                    className="p-6 bg-[#2A4D45]/40 hover:bg-[#2A4D45]/50 backdrop-blur-sm rounded-lg transition-colors cursor-pointer group"
                    onClick={() => setSelectedDiary(diary)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-medium">{diary.title || '제목 없음'}</h3>
                      <span className="text-sm text-gray-400">
                        {format(new Date(diary.date), 'PPP', { locale: ko })}
                      </span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:text-white hover:bg-[#56ab91]/60"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingDiary(diary);
                          setWriteForm({
                            title: diary.title,
                            content: diary.content,
                            images: diary.images || [],
                            pendingImages: [],
                            date: new Date(diary.date)
                          });
                          setIsWriting(true);
                        }}
                      >
                        <PenSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-gray-300 line-clamp-3">{diary.content}</p>
                  {diary.images && diary.images.length > 0 && (
                    <div className="mt-4">
                      <div className="grid grid-cols-3 gap-2">
                        {diary.images.slice(0, 3).map((image, index) => (
                          <div key={index} className="aspect-square relative">
                            <img
                              src={image}
                              alt={`일기 이미지 ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* 달력 뷰 */}
        {activeTab === 'calendar' && (
          <div className="w-full px-2 md:px-0 md:grid md:grid-cols-10 md:gap-1">
            <div className="mb-4 md:mb-0 md:col-span-6">
              <Calendar
              mode="single"
              selected={writeForm.date}
              onSelect={(date) => date && setWriteForm(prev => ({ ...prev, date }))}
              className="rounded-md w-full max-w-full bg-[#2A4D45]/40 backdrop-blur-sm border-[#358f80]/20"
              locale={ko}
              disabled={(date) => false}
              fromDate={new Date(2020, 0)}
              toDate={new Date(2025, 11)}
              modifiers={{
                hasDiary: diaries.map(diary => new Date(diary.date))
              }}
              modifiersStyles={{
                hasDiary: {
                  backgroundColor: 'rgba(59, 130, 246, 0.3)',
                  borderRadius: '50%',
                  color: '#fff'
                }
              }}
              components={{
                DayContent: ({ date }) => {
                  const hasEntry = diaries.some(diary => {
                    const diaryDate = new Date(diary.date);
                    return (
                      diaryDate.getFullYear() === date.getFullYear() &&
                      diaryDate.getMonth() === date.getMonth() &&
                      diaryDate.getDate() === date.getDate()
                    );
                  });

                  return (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <span>{date.getDate()}</span>
                      {hasEntry && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  );
                }
              }}
            />
            </div>
            <div className="md:overflow-y-auto md:max-h-[calc(100vh-16rem)] md:col-span-4 md:mt-[-0.5rem] md:pl-2">
              {diaries
                .filter(diary => {
                  const diaryDate = new Date(diary.date);
                  const selectedDate = writeForm.date;
                  return (
                    diaryDate.getFullYear() === selectedDate.getFullYear() &&
                    diaryDate.getMonth() === selectedDate.getMonth() &&
                    diaryDate.getDate() === selectedDate.getDate()
                  );
                })
                .map(diary => (
                  <div 
                    key={diary.id}
                    className="p-4 bg-[#2A4D45]/50 hover:bg-[#2A4D45]/60 backdrop-blur-sm rounded-lg mt-2 cursor-pointer"
                    onClick={() => setSelectedDiary(diary)}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium mb-2 truncate">{diary.title || '제목 없음'}</h3>
                        <p className="text-sm text-gray-300 line-clamp-2">{diary.content}</p>
                      </div>
                      {diary.images && diary.images.length > 0 && (
                        <div className="flex-shrink-0 relative w-16 h-16">
                          <img
                            src={diary.images[0]}
                            alt="첫 번째 이미지"
                            className="w-full h-full object-cover rounded-lg"
                          />
                          {diary.images.length > 1 && (
                            <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full">
                              +{diary.images.length - 1}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* 사진첩 뷰 */}
        {activeTab === 'gallery' && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 px-2 md:px-0">
            {allImages.map(({ image, diary }, index) => (
              <div 
                key={`image-${index}`}
                className="aspect-square relative group cursor-pointer"
                onClick={() => setSelectedDiary(diary)}
              >
                <img
                  src={image}
                  alt={diary.title || '일기 이미지'}
                  className="w-full h-full object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <div className="text-white text-center p-2">
                    <div className="font-medium">{diary.title || '제목 없음'}</div>
                    <div className="text-sm">{format(new Date(diary.date), 'PPP', { locale: ko })}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 작성/수정 다이얼로그 */}
      <Dialog 
        open={isWriting} 
        onOpenChange={(open) => {
          if (!open) {
            setWriteForm({
              title: '',
              content: '',
              images: [],
              pendingImages: [],
              date: new Date()
            });
          }
          setIsWriting(open);
        }}
      >
        <DialogContent className="sm:max-w-[800px] bg-[#2A4D45]/40 backdrop-blur-sm border border-[#358f80]/20">
          <DialogHeader>
            <DialogTitle>일기 작성</DialogTitle>
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

            {/* 제목 */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">제목</label>
              <input
                type="text"
                value={writeForm.title}
                onChange={(e) => setWriteForm(prev => ({ ...prev, title: e.target.value }))}
                className="flex h-10 w-full rounded-md border bg-[#2A4D45]/40 border-[#358f80]/20 text-white placeholder-gray-400 px-3 py-2"
                placeholder="제목을 입력하세요"
              />
            </div>

            {/* 내용 */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">내용</label>
              <Textarea
                value={writeForm.content}
                onChange={(e) => setWriteForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="일기를 작성해주세요..."
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
              onClick={() => setIsWriting(false)}
            >
              취소
            </Button>
            <Button 
              onClick={async () => {
                if (editingDiary) {
                  // 수정 모드
                  try {
                    // 이미지 업로드 (새로 추가된 이미지만)
                    const uploadedUrls = await Promise.all(
                      writeForm.pendingImages.map(async (file) => {
                        const fileRef = ref(storage, `private_diary/${currentUser.uid}/${Date.now()}_${file.name}`);
                        await uploadBytes(fileRef, file);
                        return getDownloadURL(fileRef);
                      })
                    );

                    // 기존 이미지와 새로 업로드된 이미지 합치기
                    const allImages = [...writeForm.images, ...uploadedUrls];

                    await updateDoc(doc(db, `users/${currentUser.uid}/private_diary`, editingDiary.id), {
                      title: writeForm.title,
                      content: writeForm.content,
                      date: writeForm.date,
                      images: allImages,
                      updatedAt: serverTimestamp()
                    });

                    setIsWriting(false);
                    setEditingDiary(null);
                  } catch (error) {
                    console.error('일기 수정 실패:', error);
                    alert('일기 수정 중 오류가 발생했습니다.');
                  }
                } else {
                  // 새 일기 작성
                  await handleAddDiary();
                }
              }}
              className="bg-[#56ab91]/60 hover:bg-[#56ab91]/80 text-white"
            >
              {editingDiary ? '수정' : '저장'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 상세 보기 다이얼로그 */}
      <Dialog open={selectedDiary !== null} onOpenChange={(open) => !open && setSelectedDiary(null)}>
        <DialogContent className="sm:max-w-[800px] bg-[#2A4D45]/40 backdrop-blur-sm border border-[#358f80]/20">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{selectedDiary?.title || '제목 없음'}</DialogTitle>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (selectedDiary && window.confirm('정말 삭제하시겠습니까?')) {
                      handleDelete(selectedDiary.id);
                      setSelectedDiary(null);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-4">
            <div className="text-sm text-gray-400 mb-4">
              {selectedDiary && format(new Date(selectedDiary.date), 'PPP', { locale: ko })}
            </div>
            <p className="whitespace-pre-wrap">
              {selectedDiary?.content}
            </p>
            {selectedDiary?.images && selectedDiary.images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                {selectedDiary.images.map((image, index) => (
                  <div key={index} className="aspect-square relative">
                    <img
                      src={image}
                      alt={`일기 이미지 ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}