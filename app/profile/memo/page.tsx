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
import { Image as ImageIcon, Trash2, PenSquare, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import imageCompression from 'browser-image-compression';

interface MemoItem {
  id: string;
  content: string;
  date: Date;
  status: 'todo' | 'today' | 'completed';
  images?: string[];
  important?: boolean;
}

export default function MemoPage() {
  const { currentUser } = useSelector((state: any) => state.user);
  type TabType = 'todo' | 'today' | 'completed';
  
  // 로그인하지 않은 경우 바로 안내 메시지 표시
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">로그인이 필요한 서비스입니다</h2>
          <p className="text-gray-400">메모 기능을 사용하려면 회원가입 후 로그인해주세요.</p>
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
  
  // States
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showImportantOnly, setShowImportantOnly] = useState(false);
  const [editingMemo, setEditingMemo] = useState<MemoItem | null>(null);
  const [selectedMemo, setSelectedMemo] = useState<MemoItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [writeForm, setWriteForm] = useState<{
    content: string;
    images: string[];
    pendingImages: File[];
    existingImages: string[];
    date: Date;
  }>({
    content: '',
    images: [],
    pendingImages: [],
    existingImages: [],
    date: new Date()
  });

  // 안정적인 이미지 압축 함수 (browser-image-compression 사용, HEIC/HEIF 지원)
  const optimizeImageWithLibrary = async (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> => {
    // 타임아웃 Promise 생성 (30초)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('메모 이미지 압축 시간 초과 (30초)'));
      }, 30000);
    });

    try {
      console.log(`메모 이미지 압축 시작: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      // 파일 크기 체크 (30MB 이상이면 거부)
      if (file.size > 30 * 1024 * 1024) {
        throw new Error('파일 크기가 너무 큽니다. 30MB 이하의 이미지를 선택해주세요.');
      }
      
      // 파일이 이미 작으면 최적화 건너뛰기 (500KB 미만)
      if (file.size < 500 * 1024) {
        console.log('파일 크기가 작아 최적화 건너뛰기:', (file.size / 1024).toFixed(1) + 'KB');
        return file;
      }
      
      // HEIC/HEIF 파일 감지
      const isHEIC = file.type === 'image/heic' || file.type === 'image/heif' || 
                     file.name.toLowerCase().endsWith('.heic') || 
                     file.name.toLowerCase().endsWith('.heif');
      
      if (isHEIC) {
        console.log('🔄 HEIC/HEIF 포맷 감지됨, 자동 변환 및 압축 중...');
      }
      
      // browser-image-compression 옵션 설정
      const options = {
        maxSizeMB: Math.min(1.5, file.size / (1024 * 1024) * 0.6), // 원본 크기의 60% 또는 1.5MB 중 작은 값
        maxWidthOrHeight: maxWidth, // 최대 너비/높이
        useWebWorker: true, // 웹 워커 사용으로 UI 블로킹 방지
        fileType: 'image/jpeg', // JPEG로 변환 (HEIC 포함)
        initialQuality: quality, // 초기 품질 설정
        alwaysKeepResolution: false, // 해상도 조정 허용
        exifOrientation: 1 // EXIF 회전 정보 정규화
      };
      
      // 타임아웃과 함께 이미지 압축 실행
      const compressionPromise = imageCompression(file, options);
      const compressedFile = await Promise.race([compressionPromise, timeoutPromise]);
      
      // 파일명 처리 (HEIC는 jpg로 변경)
      let fileName = file.name;
      if (isHEIC) {
        fileName = fileName.replace(/\.(heic|heif)$/i, '.jpg');
      }
      
      // 새로운 File 객체 생성
      const finalFile = new File([compressedFile], fileName, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      
      const compressionRate = ((file.size - finalFile.size) / file.size * 100).toFixed(1);
      console.log(`✅ 메모 이미지 압축 완료: ${compressionRate}% 압축 (${(file.size / 1024 / 1024).toFixed(2)}MB → ${(finalFile.size / 1024 / 1024).toFixed(2)}MB)`);
      
      return finalFile;
    } catch (error) {
      console.error('❌ 메모 이미지 압축 실패:', error);
      
      // 에러 메시지에 따른 처리
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      
      if (errorMessage.includes('시간 초과')) {
        console.log('⏰ 메모 이미지 압축 시간 초과, 원본 파일 사용');
        throw new Error('이미지 처리 시간이 너무 오래 걸립니다. 더 작은 이미지를 선택해주세요.');
      } else if (errorMessage.includes('파일 크기')) {
        throw error; // 파일 크기 오류는 그대로 전달
      } else {
        console.log('⚠️ 압축 실패, 원본 파일 사용');
        return file; // 기타 오류는 원본 파일 반환
      }
    }
  };
  
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
        images: doc.data().images || [],
        important: doc.data().important || false
      }));
      setMemos(loadedMemos);
      setLoading(false);
    }, (error) => {
      console.error('메모 구독 에러:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // 메모 추가/수정
  const handleAddMemo = async () => {
    if (!writeForm.content.trim() || !currentUser?.uid) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // 새로 추가된 이미지만 업로드 (안정적인 압축 포함)
      const uploadedUrls = await Promise.all(
        writeForm.pendingImages.map(async (file, index) => {
          try {
            console.log(`메모 이미지 ${index + 1}/${writeForm.pendingImages.length} 처리 시작 (크기: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
            
            // 안정적인 이미지 압축 (HEIC/HEIF 지원)
            const optimizedFile = await optimizeImageWithLibrary(file);
            
            const fileRef = ref(storage, `private_memos/${currentUser.uid}/${Date.now()}_${Math.random().toString(36).substring(7)}_${optimizedFile.name}`);
            await uploadBytes(fileRef, optimizedFile);
            const url = await getDownloadURL(fileRef);
            
            // 진행률 업데이트
            const progress = ((index + 1) / writeForm.pendingImages.length) * 100;
            setUploadProgress(progress);
            
            console.log(`메모 이미지 ${index + 1}/${writeForm.pendingImages.length} 업로드 완료`);
            return url;
          } catch (error) {
            console.error(`메모 이미지 ${index + 1} 업로드 실패:`, error);
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            throw new Error(`이미지 "${file.name}" 처리 중 오류가 발생했습니다: ${errorMessage}`);
          }
        })
      );

      // 성공한 업로드만 필터링
      const successfulUploads = uploadedUrls.filter(url => url !== null) as string[];

      // 날짜에 따른 status 결정
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const memoDate = new Date(writeForm.date);
      memoDate.setHours(0, 0, 0, 0);
      
      // 오늘이면 today, 나머지는 모두 todo로 설정
      const status: TabType = memoDate.getTime() === today.getTime() ? 'today' : 'todo';

      // 기존 이미지와 새로 업로드된 이미지 합치기
      const allImages = [...writeForm.existingImages, ...successfulUploads];

      const memoData = {
        content: writeForm.content,
        date: writeForm.date,
        status,
        images: allImages,
        updatedAt: serverTimestamp()
      };

      if (editingMemo) {
        // 수정 모드: updateDoc 사용
        await updateDoc(doc(db, `users/${currentUser.uid}/private_memos`, editingMemo.id), memoData);
      } else {
        // 새로 추가 모드: addDoc 사용
        const newMemoData = {
          ...memoData,
          createdAt: serverTimestamp()
        };
        await addDoc(collection(db, `users/${currentUser.uid}/private_memos`), newMemoData);
      }

      // 상태 초기화
      setWriteForm({
        content: '',
        images: [],
        pendingImages: [],
        existingImages: [],
        date: new Date()
      });
      setEditingMemo(null);
      setIsWriting(false);
    } catch (error) {
      console.error(editingMemo ? '메모 수정 실패:' : '메모 추가 실패:', error);
      
      // 구체적인 오류 메시지 제공
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      
      if (errorMessage.includes('이미지 처리 시간이 너무 오래')) {
        alert('이미지 처리 시간이 너무 오래 걸립니다.\n더 작은 크기의 이미지를 선택해주세요.');
      } else if (errorMessage.includes('파일 크기가 너무 큽니다')) {
        alert('선택한 이미지 파일이 너무 큽니다.\n30MB 이하의 이미지를 선택해주세요.');
      } else if (errorMessage.includes('이미지') && errorMessage.includes('처리 중 오류')) {
        alert(`이미지 업로드 중 오류가 발생했습니다:\n${errorMessage}\n\n다시 시도하거나 다른 이미지를 선택해주세요.`);
      } else {
        alert(`메모 저장 중 오류가 발생했습니다:\n${errorMessage}\n\n잠시 후 다시 시도해주세요.`);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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

  // 중요문서 상태 변경
  const handleImportantChange = async (memoId: string, isImportant: boolean) => {
    if (!currentUser?.uid) return;
    
    try {
      await updateDoc(doc(db, `users/${currentUser.uid}/private_memos`, memoId), {
        important: isImportant,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('중요문서 상태 변경 실패:', error);
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
        <div className="flex items-center gap-2 px-2 md:px-0 mt-1">
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
          <Button
            variant="outline"
            onClick={() => {
              setShowImportantOnly(!showImportantOnly);
              // 중요문서 필터 활성화 시 탭을 초기화하지 않고 현재 탭 유지
            }}
            className={`h-[60px] px-4 backdrop-blur-sm border-[#358f80]/20 transition-all ${
              showImportantOnly 
                ? 'bg-pink-500/60 hover:bg-pink-500/80 text-white' 
                : 'bg-[#2A4D45]/40 hover:bg-[#2A4D45]/60 text-white'
            }`}
            title={showImportantOnly ? '전체 메모 보기' : '중요문서만 보기'}
          >
            <AlertTriangle className="w-6 h-6" />
          </Button>
        </div>

        {/* 중요문서 필터 안내 */}
        {showImportantOnly && (
          <div className="px-2 md:px-0">
            <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-pink-400" />
              <span className="text-pink-300 text-sm">중요문서만 표시 중입니다</span>
              <button
                onClick={() => setShowImportantOnly(false)}
                className="ml-auto text-pink-400 hover:text-pink-300 text-sm underline"
              >
                전체 보기
              </button>
            </div>
          </div>
        )}

        {/* 메모 목록 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2 md:px-0">
          {(() => {
            const filteredMemos = memos.filter(memo => {
              // 중요문서 필터가 활성화된 경우 중요문서가 아닌 메모는 제외
              if (showImportantOnly && !memo.important) {
                return false;
              }

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
                    <p className="text-gray-400">
                      {showImportantOnly ? '중요문서가 없습니다' : '메모가 없습니다'}
                    </p>
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('현재 중요문서 상태:', memo.important, '메모 ID:', memo.id);
                                handleImportantChange(memo.id, !memo.important);
                              }}
                              className={`p-1 rounded-full transition-colors ${
                                memo.important 
                                  ? 'text-pink-400 hover:text-red-500 bg-pink-400/10 hover:bg-red-500/10' 
                                  : 'text-gray-500 hover:text-pink-400 hover:bg-pink-400/10'
                              }`}
                              title={memo.important ? '중요문서 해제' : '중요문서로 설정'}
                            >
                              <AlertTriangle className="w-3 h-3" />
                            </button>
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
              existingImages: [],
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
                placeholder="메모를 입력하시거나 오른쪽 AI대화로 메모 저장 오전 11시 강남역 미팅 채팅으로 요청하셔도 저장됩니다"
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
                    className="bg-[#2A4D45]/40 border-[#358f80]/20 text-white hover:bg-[#2A4D45]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? '업로드 중...' : '사진 선택'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        // 이미지 파일만 필터링
                        const imageFiles = files.filter(file => file.type.startsWith('image/'));
                        
                        if (imageFiles.length !== files.length) {
                          alert('이미지 파일만 업로드할 수 있습니다.');
                        }
                        
                        if (imageFiles.length > 0) {
                          // 미리보기용 URL 생성
                          const previewUrls = imageFiles.map(file => URL.createObjectURL(file));
                          
                          setWriteForm(prev => ({
                            ...prev,
                            images: [...prev.existingImages, ...prev.pendingImages.map(f => URL.createObjectURL(f)), ...previewUrls],
                            pendingImages: [...prev.pendingImages, ...imageFiles]
                          }));
                        }
                        
                        // 파일 입력 초기화하여 같은 파일 재선택 가능하게 함
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />
                </div>

                {/* 업로드 진행률 */}
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">이미지 업로드 중...</span>
                      <span className="text-[#56ab91]">{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-[#56ab91] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

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
                            const existingImagesCount = writeForm.existingImages.length;
                            
                            if (index < existingImagesCount) {
                              // 기존 이미지 삭제
                              setWriteForm(prev => ({
                                ...prev,
                                existingImages: prev.existingImages.filter((_, i) => i !== index),
                                images: prev.images.filter((_, i) => i !== index)
                              }));
                            } else {
                              // 새로 추가된 이미지 삭제
                              const pendingIndex = index - existingImagesCount;
                              setWriteForm(prev => ({
                                ...prev,
                                pendingImages: prev.pendingImages.filter((_, i) => i !== pendingIndex),
                                images: prev.images.filter((_, i) => i !== index)
                              }));
                            }
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={isUploading}
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
                setEditingMemo(null);
                setWriteForm({
                  content: '',
                  images: [],
                  pendingImages: [],
                  existingImages: [],
                  date: new Date()
                });
              }}
            >
              취소
            </Button>
            <Button 
              onClick={handleAddMemo}
              disabled={isUploading}
              className="bg-[#56ab91]/60 hover:bg-[#56ab91]/80 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  업로드 중...
                </>
              ) : (
                editingMemo ? '수정' : '저장'
              )}
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
                        existingImages: selectedMemo.images || [],
                        date: new Date(selectedMemo.date)
                      });
                      setIsWriting(true);
                      setSelectedMemo(null);
                    }}
                  >
                    <PenSquare className="w-2 h-4" />
                    
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
                    <Trash2 className="w-2 h-4" />
                    
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