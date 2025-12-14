'use client';

import React, { useState, useEffect, useRef } from 'react';
import './styles.css';
import { useSelector } from 'react-redux';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { doc, collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PenSquare, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface EmotionAnalysis {
  emotion: string;
  intensity: number;
  keywords: string[];
  summary: string;
  color: string;
  image: string;
}

interface DiaryItem {
  id: string;
  title: string;
  content: string;
  date: Date;
  images?: string[];
  emotion?: EmotionAnalysis; // emotion 필드 추가
  isPersonaGenerated?: boolean; // 매거진 생성 여부 플래그 추가
}

interface PersonaEntry {
  id: string;
  date: Date;
  originalDiaryContent: string;
  emotionAnalysis?: EmotionAnalysis;
  uploadedImageUrl?: string | null; // Allow null
  personaImageUrl?: string | null;  // Allow null
  likesCount?: number;
  commentsCount?: number;
  createdAt: Date;
  updatedAt?: Date;
  diaryRef?: string; // private_diary 문서 참조 ID 추가
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [writeForm, setWriteForm] = useState<{
    title: string;
    content: string;
    images: string[];
    pendingImages: File[];
    existingImages: string[];
    date: Date;
  }>({
    title: '',
    content: '',
    images: [],
    pendingImages: [],
    existingImages: [],
    date: new Date()
  });

  // 안정적인 이미지 압축 함수 (browser-image-compression 사용, HEIC/HEIF 지원)
  const optimizeImageWithLibrary = async (file: File, maxWidth: number = 1400, quality: number = 0.85): Promise<File> => {
    // 타임아웃 Promise 생성 (30초)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('다이어리 이미지 압축 시간 초과 (30초)'));
      }, 30000);
    });

    try {
      console.log(`다이어리 이미지 압축 시작: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      // 파일 크기 체크 (40MB 이상이면 거부)
      if (file.size > 40 * 1024 * 1024) {
        throw new Error('파일 크기가 너무 큽니다. 40MB 이하의 이미지를 선택해주세요.');
      }
      
      // 파일이 이미 작으면 최적화 건너뛰기 (800KB 미만)
      if (file.size < 800 * 1024) {
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
      
      // browser-image-compression 옵션 설정 (다이어리용 고품질)
      const options = {
        maxSizeMB: Math.min(2.5, file.size / (1024 * 1024) * 0.7), // 원본 크기의 70% 또는 2.5MB 중 작은 값
        maxWidthOrHeight: maxWidth, // 최대 너비/높이 (다이어리용으로 높은 해상도)
        useWebWorker: true, // 웹 워커 사용으로 UI 블로킹 방지
        fileType: 'image/jpeg', // JPEG로 변환 (HEIC 포함)
        initialQuality: quality, // 초기 품질 설정 (다이어리용으로 높은 품질)
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
      console.log(`✅ 다이어리 이미지 압축 완료: ${compressionRate}% 압축 (${(file.size / 1024 / 1024).toFixed(2)}MB → ${(finalFile.size / 1024 / 1024).toFixed(2)}MB)`);
      
      return finalFile;
    } catch (error) {
      console.error('❌ 다이어리 이미지 압축 실패:', error);
      
      // 에러 메시지에 따른 처리
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      
      if (errorMessage.includes('시간 초과')) {
        console.log('⏰ 다이어리 이미지 압축 시간 초과, 원본 파일 사용');
        throw new Error('이미지 처리 시간이 너무 오래 걸립니다. 더 작은 이미지를 선택해주세요.');
      } else if (errorMessage.includes('파일 크기')) {
        throw error; // 파일 크기 오류는 그대로 전달
      } else {
        console.log('⚠️ 압축 실패, 원본 파일 사용');
        return file; // 기타 오류는 원본 파일 반환
      }
    }
  };

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
        images: doc.data().images || [],
        emotion: doc.data().emotion, // emotion 필드 추가
        isPersonaGenerated: doc.data().isPersonaGenerated // isPersonaGenerated 필드 추가
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
      setIsUploading(true);
      setUploadProgress(0);

      // 새로 추가된 이미지만 업로드 (안정적인 압축 포함)
      const uploadedUrls = await Promise.all(
        writeForm.pendingImages.map(async (file, index) => {
          try {
            console.log(`다이어리 이미지 ${index + 1}/${writeForm.pendingImages.length} 처리 시작 (크기: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
            
            // 안정적인 이미지 압축 (HEIC/HEIF 지원)
            const optimizedFile = await optimizeImageWithLibrary(file);
            
            const fileRef = ref(storage, `private_diary/${currentUser.uid}/${Date.now()}_${Math.random().toString(36).substring(7)}_${optimizedFile.name}`);
            await uploadBytes(fileRef, optimizedFile);
            const url = await getDownloadURL(fileRef);
            
            // 진행률 업데이트
            const progress = ((index + 1) / writeForm.pendingImages.length) * 100;
            setUploadProgress(progress);
            
            console.log(`다이어리 이미지 ${index + 1}/${writeForm.pendingImages.length} 업로드 완료`);
            return url;
          } catch (error) {
            console.error(`다이어리 이미지 ${index + 1} 업로드 실패:`, error);
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            throw new Error(`이미지 "${file.name}" 처리 중 오류가 발생했습니다: ${errorMessage}`);
          }
        })
      );

      // 성공한 업로드만 필터링
      const successfulUploads = uploadedUrls.filter(url => url !== null) as string[];

      // 기존 이미지와 새로 업로드된 이미지 합치기
      const allImages = [...writeForm.existingImages, ...successfulUploads];

      // private_diary 컬렉션에 일기 저장
      const diaryData = {
        title: writeForm.title,
        content: writeForm.content,
        date: writeForm.date,
        images: allImages,
        emotion: null, // undefined 대신 null 사용
        isPersonaGenerated: false, // 매거진 생성 여부 플래그 초기화
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, `users/${currentUser.uid}/private_diary`), diaryData);

      // persona_entries 컬렉션에 기본 데이터 저장 (이미지 제외)
      const personaEntryData = {
        date: writeForm.date,
        originalDiaryContent: writeForm.content,
        emotion: null, // 감정 분석 없음
        uploadedImageUrl: null, // 이미지 제외
        personaImageUrl: null,
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, `users/${currentUser.uid}/persona_entries`), personaEntryData);

      setWriteForm({
        title: '',
        content: '',
        images: [],
        pendingImages: [],
        existingImages: [],
        date: new Date()
      });
      setIsWriting(false);
      alert('일기가 성공적으로 저장되었습니다. 매거진에서 사진업로드 감정분석 버튼을 눌러보세요.');

    } catch (error) {
      console.error('일기 추가 실패:', error);
      
      // 구체적인 오류 메시지 제공
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      
      if (errorMessage.includes('이미지 처리 시간이 너무 오래')) {
        alert('이미지 처리 시간이 너무 오래 걸립니다.\n더 작은 크기의 이미지를 선택해주세요.');
      } else if (errorMessage.includes('파일 크기가 너무 큽니다')) {
        alert('선택한 이미지 파일이 너무 큽니다.\n40MB 이하의 이미지를 선택해주세요.');
      } else if (errorMessage.includes('이미지') && errorMessage.includes('처리 중 오류')) {
        alert(`이미지 업로드 중 오류가 발생했습니다:\n${errorMessage}\n\n다시 시도하거나 다른 이미지를 선택해주세요.`);
      } else {
        alert(`일기 저장 중 오류가 발생했습니다:\n${errorMessage}\n\n잠시 후 다시 시도해주세요.`);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // 일기 삭제
  const handleDelete = async (diaryId: string) => {
    if (!currentUser?.uid) return;
    
    try {
      // 1. private_diary에서 일기 삭제
      await deleteDoc(doc(db, `users/${currentUser.uid}/private_diary`, diaryId));

      // 2. persona_entries에서도 해당 일기 참조하는 문서 삭제
      const personaQuery = query(
        collection(db, `users/${currentUser.uid}/persona_entries`),
        where('diaryRef', '==', diaryId)
      );
      const snapshot = await getDocs(personaQuery);
      snapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });

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
        <div className="flex items-center gap-2 px-2 md:px-0 mt-1">
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
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className="text-lg font-medium">{diary.title || '제목 없음'}</h3>
                    <span className="text-sm text-gray-400">
                      {format(new Date(diary.date), 'PPP', { locale: ko })}
                    </span>
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
            setEditingDiary(null);
            setWriteForm({
              title: '',
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
                placeholder="일기를 작성하세요"
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
                setEditingDiary(null);
                setWriteForm({
                  title: '',
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
              onClick={async () => {
                if (editingDiary) {
                  // 수정 모드
                  try {
                    setIsUploading(true);
                    setUploadProgress(0);

                    // 새로 추가된 이미지만 업로드 (안정적인 압축 포함)
                    const uploadedUrls = await Promise.all(
                      writeForm.pendingImages.map(async (file, index) => {
                        try {
                          console.log(`다이어리 수정 이미지 ${index + 1}/${writeForm.pendingImages.length} 처리 시작 (크기: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
                          
                          // 안정적인 이미지 압축 (HEIC/HEIF 지원)
                          const optimizedFile = await optimizeImageWithLibrary(file);
                          
                          const fileRef = ref(storage, `private_diary/${currentUser.uid}/${Date.now()}_${Math.random().toString(36).substring(7)}_${optimizedFile.name}`);
                          await uploadBytes(fileRef, optimizedFile);
                          const url = await getDownloadURL(fileRef);
                          
                          // 진행률 업데이트
                          const progress = ((index + 1) / writeForm.pendingImages.length) * 100;
                          setUploadProgress(progress);
                          
                          console.log(`다이어리 수정 이미지 ${index + 1}/${writeForm.pendingImages.length} 업로드 완료`);
                          return url;
                        } catch (error) {
                          console.error(`다이어리 수정 이미지 ${index + 1} 업로드 실패:`, error);
                          const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
                          throw new Error(`이미지 "${file.name}" 처리 중 오류가 발생했습니다: ${errorMessage}`);
                        }
                      })
                    );

                    // 성공한 업로드만 필터링
                    const successfulUploads = uploadedUrls.filter(url => url !== null) as string[];

                    // 기존 이미지와 새로 업로드된 이미지 합치기
                    const allImages = [...writeForm.existingImages, ...successfulUploads];

                    // private_diary 컬렉션의 일기 업데이트
                    await updateDoc(doc(db, `users/${currentUser.uid}/private_diary`, editingDiary.id), {
                      title: writeForm.title,
                      content: writeForm.content,
                      date: writeForm.date,
                      images: allImages,
                      emotion: null, // undefined 대신 null 사용
                      isPersonaGenerated: false, // 매거진 생성 여부 플래그 업데이트
                      updatedAt: serverTimestamp()
                    });

                    // persona_entries 컬렉션 관련 로직 제거
                    // const personaQuery = query( ... );
                    // const snapshot = await getDocs(personaQuery);
                    // const personaEntryUpdateData = { ... };
                    // if (!snapshot.empty) { ... } else { ... }

                    setWriteForm({
                      title: '',
                      content: '',
                      images: [],
                      pendingImages: [],
                      existingImages: [],
                      date: new Date()
                    });
                    setIsWriting(false);
                    setEditingDiary(null);
                    alert('일기가 성공적으로 수정되었습니다. 매거진 피드에서 다시 생성 버튼을 눌러보세요.');

                  } catch (error) {
                    console.error('일기 수정 실패:', error);
                    
                    // 구체적인 오류 메시지 제공
                    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
                    
                    if (errorMessage.includes('이미지 처리 시간이 너무 오래')) {
                      alert('이미지 처리 시간이 너무 오래 걸립니다.\n더 작은 크기의 이미지를 선택해주세요.');
                    } else if (errorMessage.includes('파일 크기가 너무 큽니다')) {
                      alert('선택한 이미지 파일이 너무 큽니다.\n40MB 이하의 이미지를 선택해주세요.');
                    } else if (errorMessage.includes('이미지') && errorMessage.includes('처리 중 오류')) {
                      alert(`이미지 업로드 중 오류가 발생했습니다:\n${errorMessage}\n\n다시 시도하거나 다른 이미지를 선택해주세요.`);
                    } else {
                      alert(`일기 수정 중 오류가 발생했습니다:\n${errorMessage}\n\n잠시 후 다시 시도해주세요.`);
                    }
                  } finally {
                    setIsUploading(false);
                    setUploadProgress(0);
                  }
                } else {
                  // 새 일기 작성
                  await handleAddDiary();
                }
              }}
              disabled={isUploading}
              className="bg-[#56ab91]/60 hover:bg-[#56ab91]/80 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  업로드 중...
                </>
              ) : (
                editingDiary ? '수정' : '저장'
              )}
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
              {selectedDiary && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingDiary(selectedDiary);
                      setWriteForm({
                        title: selectedDiary.title,
                        content: selectedDiary.content,
                        images: selectedDiary.images || [],
                        pendingImages: [],
                        existingImages: selectedDiary.images || [],
                        date: new Date(selectedDiary.date)
                      });
                      setIsWriting(true);
                      setSelectedDiary(null);
                    }}
                  >
                    <PenSquare className="w-2 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('정말 삭제하시겠습니까?')) {
                        handleDelete(selectedDiary.id);
                        setSelectedDiary(null);
                      }
                    }}
                  >
                    <Trash2 className="w-2 h-4" />
                  </Button>
                </div>
              )}
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