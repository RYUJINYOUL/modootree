'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, getDoc, deleteDoc, deleteField, FieldValue, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, MessageCircle, ImageIcon, Upload, Loader2, Edit, Trash2 } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from '@/firebase';
import imageCompression from 'browser-image-compression';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogTitle
} from "@/components/ui/dialog";

interface EmotionAnalysis {
  emotion: string;
  intensity: number;
  keywords: string[];
  summary: string;
  color: string;
  image: string;
}

interface PersonaEntry {
  id: string;
  date: Date;
  originalDiaryContent: string;
  emotionAnalysis?: EmotionAnalysis;
  uploadedImageUrl?: string;
  personaImageUrl?: string;
  likesCount?: number;
  commentsCount?: number;
  createdAt: Date;
  updatedAt?: Date; // Add this line
  diaryRef?: string;
  hasGeneratedPersonaImage?: boolean; // 페르소나 이미지 생성 여부 추적
  authorId?: string; // 게시물 작성자 ID 추가
}

interface PersonaFeedProps {
  userId: string;
}

// 색상 팔레트
const COLOR_PALETTE = [
  'transparent',
  '#000000', '#FFFFFF', '#F87171', '#FBBF24',
  '#34D399', '#60A5FA', '#A78BFA', '#F472B6',
];

export default function PersonaFeed({ userId }: PersonaFeedProps) {
  const { currentUser } = useSelector((state: any) => state.user);
  const [personaEntries, setPersonaEntries] = useState<PersonaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'card' | 'list' | 'popular'>('card');
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({}); // 각 카드별 파일 인풋을 위한 ref
  const [isUploadingImage, setIsUploadingImage] = useState<{ [key: string]: boolean }>({}); // 카드별 업로드 상태
  const [uploadProgressImage, setUploadProgressImage] = useState<{ [key: string]: number }>({}); // 카드별 업로드 진행률
  const [selectedEntry, setSelectedEntry] = useState<PersonaEntry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Add this line for editing mode
  const [editingContent, setEditingContent] = useState(''); // To hold content during editing
  const [editingUploadedImageUrl, setEditingUploadedImageUrl] = useState<string | undefined>(undefined); // Add this for image editing
  const [editingPersonaImageUrl, setEditingPersonaImageUrl] = useState<string | undefined>(undefined); // Add this for persona image editing
  const editFileInputRef = useRef<HTMLInputElement>(null); // Ref for file input in edit dialog
  const [isUploadingImageForEdit, setIsUploadingImageForEdit] = useState(false); // New state for upload in edit dialog
  const [isUploadDialogForPersonaOpen, setIsUploadDialogForPersonaOpen] = useState(false); // New: for opening persona upload dialog
  const [selectedEntryForUpload, setSelectedEntryForUpload] = useState<PersonaEntry | null>(null); // New: to track entry for persona upload
  const [commentContent, setCommentContent] = useState(''); // 답글 입력 필드 내용
  const [isSubmittingComment, setIsSubmittingComment] = useState(false); // 답글 제출 중 상태
  const [comments, setComments] = useState<any[]>([]); // 답글 목록 상태
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null); // 수정 중인 답글 ID
  const [editingCommentContent, setEditingCommentContent] = useState(''); // 수정 중인 답글 내용
  const [activities, setActivities] = useState<any[]>([]); // 활동 피드 데이터
  
  // 스타일 설정 상태
  const [styleSettings, setStyleSettings] = useState({
    bgColor: '#2A4D45',
    textColor: '#FFFFFF',
    bgOpacity: 0.4,
    shadow: 'none',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    rounded: 'xl'
  });
  const [showStyleSettings, setShowStyleSettings] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [isGeneratingPersonaImage, setIsGeneratingPersonaImage] = useState<{ [key: string]: boolean }>({}); // 카드별 페르소나 이미지 생성 상태
  const [isAnalyzingEmotion, setIsAnalyzingEmotion] = useState<{ [key: string]: boolean }>({}); // 카드별 감정 분석 상태
  const [likedEntries, setLikedEntries] = useState<{ [key: string]: boolean }>({}); // 좋아요 상태를 추적

  // 스타일 설정 저장/불러오기 함수
  const saveStyleSettings = async (newSettings: any) => {
    if (!userId) return;
    try {
      await setDoc(doc(db, 'users', userId, 'settings', 'personafeed'), newSettings, { merge: true });
      setStyleSettings(newSettings);
    } catch (error) {
      console.error('스타일 설정 저장 실패:', error);
    }
  };

  // 스타일 설정 불러오기
  useEffect(() => {
    const loadStyleSettings = async () => {
      if (!userId) return;
      try {
        const docRef = doc(db, 'users', userId, 'settings', 'personafeed');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStyleSettings({ ...styleSettings, ...docSnap.data() });
        }
      } catch (error) {
        console.error('스타일 설정 불러오기 실패:', error);
      }
    };
    loadStyleSettings();
  }, [userId]);

  // 카드 클릭 핸들러
  const handleCardClick = (entry: PersonaEntry) => {
    setSelectedEntry(entry);
    setIsDialogOpen(true);
  };

  // 이미지 URL을 base64 문자열로 변환하는 헬퍼 함수
  const getImageBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // 감정 분석 함수
  const handleAnalyzeEmotion = async (entry: PersonaEntry) => {
    if (!currentUser?.uid || !entry.originalDiaryContent) {
      alert('감정 분석을 위한 내용이 없습니다.');
      return;
    }

    setIsAnalyzingEmotion(prev => ({ ...prev, [entry.id]: true }));

    try {
      const response = await fetch('/api/analyze-emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: entry.originalDiaryContent }),
      });

      if (!response.ok) {
        throw new Error('감정 분석 실패');
      }

      const emotionAnalysis = await response.json();

      // 분석 결과를 persona_entries에 저장
      const entryRef = doc(db, `users/${currentUser.uid}/persona_entries`, entry.id);
      await updateDoc(entryRef, {
        emotionAnalysis: emotionAnalysis,
        updatedAt: new Date(),
      });

      alert('감정 분석이 완료되었습니다!');
    } catch (error) {
      console.error('감정 분석 실패:', error);
      alert(`감정 분석 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsAnalyzingEmotion(prev => ({ ...prev, [entry.id]: false }));
    }
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `users/${userId}/persona_entries`),
      orderBy('createdAt', 'desc') // 최신순 정렬
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedEntries: PersonaEntry[] = snapshot.docs.map(doc => {
        const data = doc.data();
        const entry = {
          id: doc.id,
          date: data.date?.toDate() || data.createdAt?.toDate() || new Date(),
          originalDiaryContent: data.originalDiaryContent || '',
          emotionAnalysis: data.emotionAnalysis || undefined,
          uploadedImageUrl: data.uploadedImageUrl || undefined,
          personaImageUrl: data.personaImageUrl || undefined,
          likesCount: data.likesCount || 0,
          commentsCount: data.commentsCount || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          hasGeneratedPersonaImage: data.hasGeneratedPersonaImage || false,
          authorId: userId, // 게시물 작성자 ID 설정
        };
        
        // 좋아요 상태 초기화 (여기서 getDoc 호출 제거)
        // 좋아요 상태는 별도의 로직으로 관리하거나, 전체 좋아요 데이터를 가져와서 처리해야 합니다.

        return entry;
      });
      setPersonaEntries(loadedEntries);
      setLoading(false);

      // 좋아요 상태 초기화
      if (currentUser?.uid && loadedEntries.length > 0) {
        const initializeLikedStatus = async () => {
          const likedStatus: { [key: string]: boolean } = {};
          for (const entry of loadedEntries) {
            try {
              // 게시물 작성자의 UID 사용
              const postAuthorId = entry.authorId || userId;
              const likeDocRef = doc(db, `users/${postAuthorId}/persona_entries/${entry.id}/likes`, currentUser.uid);
              const likeDoc = await getDoc(likeDocRef);
              likedStatus[entry.id] = likeDoc.exists();
            } catch (error) {
              console.error('좋아요 상태 확인 실패:', error);
              likedStatus[entry.id] = false;
            }
          }
          setLikedEntries(likedStatus);
        };
        initializeLikedStatus();
      }
    }, (error) => {
      console.error("Error fetching persona entries: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // 답글 불러오기 (selectedEntry 변경 시)
  useEffect(() => {
    if (!selectedEntry) {
      setComments([]);
      return;
    }

    // 게시물 작성자의 UID를 사용하여 답글을 불러옴
    const authorId = selectedEntry.authorId || selectedEntry.diaryRef || userId;
    const commentsCollectionRef = collection(db, `users/${authorId}/persona_entries/${selectedEntry.id}/comments`);
    const q = query(commentsCollectionRef, orderBy('createdAt', 'asc'));

    console.log('답글 불러오기 경로:', `users/${authorId}/persona_entries/${selectedEntry.id}/comments`); // 디버깅용

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedComments: any[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log('불러온 답글 수:', loadedComments.length); // 디버깅용
      setComments(loadedComments);
    }, (error) => {
      console.error("Error fetching comments: ", error);
    });

    return () => unsubscribe();
  }, [selectedEntry, userId]);

  // 활동 피드 데이터 수집 (공감 탭용)
  useEffect(() => {
    if (!currentUser?.uid || activeTab !== 'popular') {
      setActivities([]);
      return;
    }

    const collectActivities = async () => {
      const allActivities: any[] = [];

      // 내 게시물들에 대한 좋아요와 답글 수집
      for (const entry of personaEntries) {
        try {
          // 좋아요 수집
          const likesQuery = query(
            collection(db, `users/${userId}/persona_entries/${entry.id}/likes`),
            orderBy('createdAt', 'desc')
          );
          const likesSnapshot = await getDocs(likesQuery);
          
          likesSnapshot.docs.forEach(doc => {
            const likeData = doc.data();
            if (likeData.userId !== currentUser.uid) { // 본인 좋아요 제외
              allActivities.push({
                id: `like_${entry.id}_${doc.id}`,
                type: 'like',
                userId: likeData.userId,
                userName: likeData.userName || '익명 사용자',
                entryId: entry.id,
                entryContent: entry.originalDiaryContent,
                entryImage: entry.personaImageUrl || entry.uploadedImageUrl,
                createdAt: likeData.createdAt?.toDate() || new Date(),
              });
            }
          });

          // 답글 수집
          const commentsQuery = query(
            collection(db, `users/${userId}/persona_entries/${entry.id}/comments`),
            orderBy('createdAt', 'desc')
          );
          const commentsSnapshot = await getDocs(commentsQuery);
          
          commentsSnapshot.docs.forEach(doc => {
            const commentData = doc.data();
            if (commentData.userId !== currentUser.uid) { // 본인 답글 제외
              allActivities.push({
                id: `comment_${entry.id}_${doc.id}`,
                type: 'comment',
                userId: commentData.userId,
                userName: commentData.userName || '익명 사용자',
                entryId: entry.id,
                entryContent: entry.originalDiaryContent,
                entryImage: entry.personaImageUrl || entry.uploadedImageUrl,
                commentContent: commentData.content,
                createdAt: commentData.createdAt?.toDate() || new Date(),
              });
            }
          });
        } catch (error) {
          console.error('활동 수집 실패:', error);
        }
      }

      // 시간순으로 정렬
      allActivities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setActivities(allActivities);
    };

    if (personaEntries.length > 0) {
      collectActivities();
    }
  }, [personaEntries, currentUser?.uid, activeTab, userId]);

  // 안정적인 이미지 압축 함수 (browser-image-compression 사용, HEIC/HEIF 지원)
  const optimizeImageWithLibrary = async (file: File, maxWidth: number = 1400, quality: number = 0.85): Promise<File> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('이미지 압축 시간 초과 (30초)'));
      }, 30000);
    });

    try {
      console.log(`이미지 압축 시작: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);

      if (file.size > 40 * 1024 * 1024) {
        throw new Error('파일 크기가 너무 큽니다. 40MB 이하의 이미지를 선택해주세요.');
      }

      if (file.size < 800 * 1024) {
        console.log('파일 크기가 작아 최적화 건너뛰기:', (file.size / 1024).toFixed(1) + 'KB');
        return file;
      }

      const isHEIC = file.type === 'image/heic' || file.type === 'image/heif' ||
        file.name.toLowerCase().endsWith('.heic') ||
        file.name.toLowerCase().endsWith('.heif');

      if (isHEIC) {
        console.log('🔄 HEIC/HEIF 포맷 감지됨, 자동 변환 및 압축 중...');
      }

      const options = {
        maxSizeMB: Math.min(2.5, file.size / (1024 * 1024) * 0.7), // 원본 크기의 70% 또는 2.5MB 중 작은 값
        maxWidthOrHeight: maxWidth, // 최대 너비/높이 (다이어리용으로 높은 해상도)
        useWebWorker: true, // 웹 워커 사용으로 UI 블로킹 방지
        fileType: 'image/jpeg', // JPEG로 변환 (HEIC 포함)
        initialQuality: quality, // 초기 품질 설정 (다이어리용으로 높은 품질)
        alwaysKeepResolution: false, // 해상도 조정 허용
        exifOrientation: 1 // EXIF 회전 정보 정규화
      };

      const compressionPromise = imageCompression(file, options);
      const compressedFile = await Promise.race([compressionPromise, timeoutPromise]);

      let fileName = file.name;
      if (isHEIC) {
        fileName = fileName.replace(/\.(heic|heif)$/i, '.jpg');
      }

      const finalFile = new File([compressedFile], fileName, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const compressionRate = ((file.size - finalFile.size) / file.size * 100).toFixed(1);
      console.log(`✅ 이미지 압축 완료: ${compressionRate}% 압축 (${(file.size / 1024 / 1024).toFixed(2)}MB → ${(finalFile.size / 1024 / 1024).toFixed(2)}MB)`);

      return finalFile;
    } catch (error) {
      console.error('❌ 이미지 압축 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      if (errorMessage.includes('시간 초과')) {
        console.log('⏰ 이미지 압축 시간 초과, 원본 파일 사용');
        throw new Error('이미지 처리 시간이 너무 오래 걸립니다. 더 작은 이미지를 선택해주세요.');
      } else if (errorMessage.includes('파일 크기')) {
        throw error;
      } else {
        console.log('⚠️ 압축 실패, 원본 파일 사용');
        return file;
      }
    }
  };

  const handleImageUploadForPersona = async (e: React.ChangeEvent<HTMLInputElement>, entryId: string) => {
    if (!currentUser?.uid || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    setIsUploadingImage(prev => ({ ...prev, [entryId]: true }));
    setUploadProgressImage(prev => ({ ...prev, [entryId]: 0 }));

    try {
      const optimizedFile = await optimizeImageWithLibrary(file);

      const fileRef = ref(storage, `person-images/${currentUser.uid}/${entryId}_${Date.now()}_${optimizedFile.name}`);
      const snapshot = await uploadBytes(fileRef, optimizedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const entryRef = doc(db, `users/${currentUser.uid}/persona_entries`, entryId);
      await updateDoc(entryRef, {
        uploadedImageUrl: downloadURL,
        updatedAt: new Date(),
      });

      alert('페르소나 이미지를 위한 사진이 업로드되었습니다!');
      setIsUploadDialogForPersonaOpen(false); // 다이얼로그 닫기
    } catch (error) {
      console.error('페르소나 이미지 업로드 실패:', error);
      alert(`사진 업로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsUploadingImage(prev => ({ ...prev, [entryId]: false }));
      setUploadProgressImage(prev => ({ ...prev, [entryId]: 0 }));
    }
  };

  // 페르소나 이미지 생성 함수 (수정 다이얼로그 전용)
  const handleGeneratePersonaImageInEdit = async (entry: PersonaEntry) => {
    if (!currentUser?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (!editingUploadedImageUrl) {
      alert('페르소나 이미지 생성을 위해 먼저 사진을 업로드해주세요.');
      return;
    }
    if (!entry.emotionAnalysis) {
      alert('감정 분석 정보가 없습니다. 일기 작성 시 감정 분석이 누락되었는지 확인해주세요.');
      return;
    }

    setIsGeneratingPersonaImage(prev => ({ ...prev, [entry.id]: true }));

    try {
      // 업로드된 이미지 URL을 base64로 변환
      const base64ImageUrl = await getImageBase64(editingUploadedImageUrl);

      // 인증 토큰 가져오기 (Firebase Auth에서 직접)
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        alert('로그인이 필요합니다.');
        return;
      }
      const token = await firebaseUser.getIdToken();

      const response = await fetch('/api/generate-persona-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64ImageUrl, // base64 이미지 데이터 전송
          emotion: entry.emotionAnalysis.emotion, // 감정 이름만 전달
          userId: currentUser.uid, // 사용자 ID 추가
          token: token // 인증 토큰 추가
        }),
      });

      const data = await response.json();

      // 🔍 요청/응답 디버깅 로그
      console.log('📤 요청 데이터:', {
        imageBase64: base64ImageUrl ? '✅ 이미지 데이터 존재' : '❌ 이미지 데이터 없음',
        emotion: entry.emotionAnalysis.emotion,
        emotionAnalysis: entry.emotionAnalysis
      });
      console.log('📥 API 응답:', data);

      if (!response.ok) {
        console.error('❌ API 오류:', data);
        throw new Error(data.error || '페르소나 이미지 생성에 실패했습니다.');
      }

      // 이미지 URL 처리
      if (data.success && data.imageUrl) {
        console.log('✅ 이미지 생성 성공:', {
          imageUrl: data.imageUrl,
          emotion: data.emotion,
          appliedStyle: data.appliedStyle
        });

        setEditingPersonaImageUrl(data.imageUrl); // Update local state, not Firestore directly

        alert(`페르소나 이미지가 성공적으로 생성되었습니다!\n감정: ${data.emotion}\n적용된 스타일: ${data.appliedStyle}\n저장 버튼을 눌러 변경사항을 확정하세요.`);
      } else {
        console.error('❌ 이미지 생성 실패:', data);
        throw new Error(data.error || '이미지 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('페르소나 이미지 생성 실패 (수정 중):', error);
      alert(`페르소나 이미지 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsGeneratingPersonaImage(prev => ({ ...prev, [entry.id]: false }));
    }
  };

  // 페르소나 이미지 생성 함수
  const handleGeneratePersonaImage = async (entry: PersonaEntry) => {
    if (!currentUser?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }
    // Use editingUploadedImageUrl if in editing mode, otherwise use entry.uploadedImageUrl
    const imageUrlToUse = isEditing ? editingUploadedImageUrl : entry.uploadedImageUrl;

    if (!imageUrlToUse) {
      alert('페르소나 이미지 생성을 위해 먼저 사진을 업로드해주세요.');
      return;
    }
    if (!entry.emotionAnalysis) {
      alert('감정 분석 정보가 없습니다. 일기 작성 시 감정 분석이 누락되었는지 확인해주세요.');
      return;
    }

    setIsGeneratingPersonaImage(prev => ({ ...prev, [entry.id]: true }));

    try {
      // 업로드된 이미지 URL을 base64로 변환
      const base64ImageUrl = await getImageBase64(imageUrlToUse);

      // 인증 토큰 가져오기 (Firebase Auth에서 직접)
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        alert('로그인이 필요합니다.');
        return;
      }
      const token = await firebaseUser.getIdToken();

      const response = await fetch('/api/generate-persona-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64ImageUrl, // base64 이미지 데이터 전송
          emotion: entry.emotionAnalysis.emotion, // 감정 이름만 전달
          userId: currentUser.uid, // 사용자 ID 추가
          token: token // 인증 토큰 추가
        }),
      });

      const data = await response.json();

      // 🔍 요청/응답 디버깅 로그
      console.log('📤 요청 데이터:', {
        imageBase64: base64ImageUrl ? '✅ 이미지 데이터 존재' : '❌ 이미지 데이터 없음',
        emotion: entry.emotionAnalysis.emotion,
        emotionAnalysis: entry.emotionAnalysis
      });
      console.log('📥 API 응답:', data);

      if (!response.ok) {
        console.error('❌ API 오류:', data);
        throw new Error(data.error || '페르소나 이미지 생성에 실패했습니다.');
      }

      // 이미지 URL 처리
      if (data.success && data.imageUrl) {
        console.log('✅ 이미지 생성 성공:', {
          imageUrl: data.imageUrl,
          emotion: data.emotion,
          appliedStyle: data.appliedStyle
        });

        const updateData = {
          personaImageUrl: data.imageUrl,
          hasGeneratedPersonaImage: true, // 페르소나 이미지 생성 플래그 설정
          updatedAt: new Date(),
        };

        const entryRef = doc(db, `users/${currentUser.uid}/persona_entries`, entry.id);
        await updateDoc(entryRef, updateData);

        alert(`페르소나 이미지가 성공적으로 생성되었습니다!\n감정: ${data.emotion}\n적용된 스타일: ${data.appliedStyle}`);
      } else {
        console.error('❌ 이미지 생성 실패:', data);
        throw new Error(data.error || '이미지 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('페르소나 이미지 생성 실패:', error);
      alert(`페르소나 이미지 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsGeneratingPersonaImage(prev => ({ ...prev, [entry.id]: false }));
    }
  };

  // 이미지 업로드 핸들러 (수정 다이얼로그 전용)
  const handleImageUploadForEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser?.uid || !e.target.files || e.target.files.length === 0 || !selectedEntry) return;

    const file = e.target.files[0];

    setIsUploadingImageForEdit(true);

    try {
      const optimizedFile = await optimizeImageWithLibrary(file);

      const fileRef = ref(storage, `person-images/${currentUser.uid}/${selectedEntry.id}_${Date.now()}_${optimizedFile.name}`);
      const snapshot = await uploadBytes(fileRef, optimizedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 새로운 사진을 업로드하면 기존 personaImageUrl을 제거하고 uploadedImageUrl로 설정
      setEditingUploadedImageUrl(downloadURL);
      setEditingPersonaImageUrl(undefined); // 기존 페르소나 이미지 제거
      alert('새로운 사진이 성공적으로 업로드되었습니다. 저장 버튼을 눌러 변경사항을 확정하세요.');
    } catch (error) {
      console.error('사진 업로드 실패 (수정 중): ', error);
      alert(`사진 업로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsUploadingImageForEdit(false);
    }
  };

  const getFilteredEntries = () => {
    switch (activeTab) {
      case 'card':
      case 'list':
        // 전체 게시물 표시 (최신순 정렬)
        return personaEntries;
      case 'popular':
        // 좋아요 + 답글 수가 많은 순으로 정렬
        return [...personaEntries].sort((a, b) => {
          const aEngagement = (a.likesCount || 0) + (a.commentsCount || 0);
          const bEngagement = (b.likesCount || 0) + (b.commentsCount || 0);
          return bEngagement - aEngagement;
        });
      default:
        return personaEntries;
    }
  };

  const filteredEntries = getFilteredEntries();

  if (loading) {
    return <div className="flex justify-center items-center h-40 text-gray-400">로딩 중...</div>;
  }

  if (!currentUser) {
    return (
      <div className="min-h-[200px] bg-gray-900 text-white flex items-center justify-center rounded-lg p-4">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">로그인이 필요한 서비스입니다</h2>
          <p className="text-gray-400">페르소나 피드를 보려면 로그인해주세요.</p>
          <Button onClick={() => window.location.href = '/login'} className="bg-blue-600 hover:bg-blue-700">로그인</Button>
        </div>
      </div>
    );
  }

  // 스타일 설정 UI 렌더링 함수
  const renderStyleSettings = () => {
    if (!pathname?.startsWith('/editor')) return null;

    return (
      <div className="w-full max-w-[1100px] mb-6 mx-auto">
        <button
          onClick={() => setShowStyleSettings(!showStyleSettings)}
          className="w-full p-3 rounded-lg mb-2 hover:bg-opacity-30 transition-all font-semibold"
          style={{
            backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.4) * 255).toString(16).padStart(2, '0')}`,
            color: styleSettings.textColor
          }}
        >
          페르소나 피드 스타일 설정 {showStyleSettings ? '닫기' : '열기'}
        </button>

        {showStyleSettings && (
          <div className="flex flex-col gap-4 bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-700">
            {/* 배경색 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">배경색</span>
                <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      onClick={() => saveStyleSettings({ ...styleSettings, bgColor: color })}
                      className={`w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110 ${styleSettings.bgColor === color ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800' : ''
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* 투명도 슬라이더 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-100 w-24">투명도</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={styleSettings.bgOpacity ?? 0.4}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, bgOpacity: parseFloat(e.target.value) })}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-100 w-12 text-right">
                  {(styleSettings.bgOpacity ?? 0.4).toFixed(1)}
                </span>
              </div>
            </div>

            {/* 텍스트 색상 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">텍스트</span>
              <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={`text-${color}`}
                    onClick={() => saveStyleSettings({ ...styleSettings, textColor: color })}
                    className={`w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110 ${styleSettings.textColor === color ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800' : ''
                      }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* 그림자 색상 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자</span>
                <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={`shadow-${color}`}
                      onClick={() => saveStyleSettings({ ...styleSettings, shadowColor: color })}
                      className={`w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110 ${styleSettings.shadowColor === color ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800' : ''
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* 그림자 투명도 슬라이더 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-100 w-24">투명도</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={styleSettings.shadowOpacity ?? 0.2}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, shadowOpacity: parseFloat(e.target.value) })}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-100 w-12 text-right">
                  {(styleSettings.shadowOpacity ?? 0.2).toFixed(1)}
                </span>
              </div>
            </div>

            {/* 모서리와 그림자 스타일 설정 */}
            <div className="flex flex-col gap-4 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">모서리</span>
                <select
                  value={styleSettings.rounded || 'xl'}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, rounded: e.target.value })}
                  className="px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
                >
                  <option value="none">각진</option>
                  <option value="sm">약간 둥근</option>
                  <option value="md">둥근</option>
                  <option value="lg">많이 둥근</option>
                  <option value="xl">매우 둥근</option>
                  <option value="2xl">극도로 둥근</option>
                  <option value="full">완전 둥근</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자</span>
                <select
                  value={styleSettings.shadow || 'none'}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, shadow: e.target.value })}
                  className="px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
                >
                  <option value="none">없음</option>
                  <option value="sm">약한</option>
                  <option value="md">보통</option>
                  <option value="lg">강한</option>
                  <option value="xl">매우 강한</option>
                  <option value="2xl">극도로 강한</option>
                  <option value="inner">안쪽</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 카드 스타일 적용
  const getCardStyle = () => ({
    backgroundColor: styleSettings.bgColor === 'transparent' ? 'transparent' : `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.4) * 255).toString(16).padStart(2, '0')}`,
    color: styleSettings.textColor,
    boxShadow: (() => {
      const shadowColor = styleSettings.shadowColor
        ? `rgba(${parseInt(styleSettings.shadowColor.slice(1, 3), 16)}, ${parseInt(styleSettings.shadowColor.slice(3, 5), 16)}, ${parseInt(styleSettings.shadowColor.slice(5, 7), 16)}, ${styleSettings.shadowOpacity ?? 0.2})`
        : 'rgba(0, 0, 0, 0.2)';

      switch (styleSettings.shadow) {
        case 'none':
          return 'none';
        case 'sm':
          return `0 1px 2px ${shadowColor}`;
        case 'md':
          return `0 4px 6px ${shadowColor}`;
        case 'lg':
          return `0 10px 15px ${shadowColor}`;
        case 'xl':
          return `0 20px 25px ${shadowColor}`;
        case '2xl':
          return `0 25px 50px ${shadowColor}`;
        case 'inner':
          return `inset 0 2px 4px ${shadowColor}`;
        default:
          return 'none';
      }
    })(),
    borderRadius: (() => {
      switch (styleSettings.rounded) {
        case 'none': return '0';
        case 'sm': return '0.125rem';
        case 'md': return '0.375rem';
        case 'lg': return '0.5rem';
        case 'xl': return '0.75rem';
        case '2xl': return '1rem';
        case 'full': return '9999px';
        default: return '0.75rem';
      }
    })()
  });

  // 다이얼로그 내용 렌더링 함수
  const renderPersonaDialog = () => {
    if (!selectedEntry) return null;

    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto bg-white">
          <DialogTitle className="sr-only">페르소나 엔트리 상세보기</DialogTitle>
          {/* 다이얼로그 내용 - 선택된 엔트리의 상세 정보 */}
          <div className="flex flex-col gap-6">
            {/* 헤더 - 날짜와 감정 평가 및 수정/삭제 버튼 */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-green-100">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-semibold text-green-800">
                  {format(new Date(selectedEntry.date), 'yy년 MM월 dd일', { locale: ko })}
                </h3>
                {selectedEntry.emotionAnalysis && (
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200"
                  >
                    {selectedEntry.emotionAnalysis.emotion}
                  </span>
                )}
              </div>

              {/* 수정/삭제 버튼 */}
              {userId === currentUser?.uid && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white text-green-700 border-green-300 hover:bg-green-50 p-2"
                    onClick={() => handleEditEntry(selectedEntry)}
                    title="수정"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white text-red-600 border-red-300 hover:bg-red-50 p-2"
                    onClick={() => handleDeleteEntry(selectedEntry)}
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* 이미지 섹션 - 전체 너비로 최대 크기 */}
            <div className="relative flex justify-center px-4">
              {selectedEntry.personaImageUrl ? (
                <img 
                  src={selectedEntry.personaImageUrl} 
                  alt="Persona Image" 
                  className="w-auto max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                  onError={(e) => {
                    // 404 오류 시 uploadedImageUrl로 fallback하거나 기본 아이콘 표시
                    const target = e.target as HTMLImageElement;
                    if (selectedEntry.uploadedImageUrl && target.src !== selectedEntry.uploadedImageUrl) {
                      target.src = selectedEntry.uploadedImageUrl;
                      target.className = "w-auto max-w-full max-h-[60vh] object-contain rounded-lg opacity-60";
                    } else {
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="flex items-center justify-center h-64 bg-gray-100 rounded-lg w-full"><svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                      }
                    }
                  }}
                />
              ) : selectedEntry.uploadedImageUrl ? (
                <img 
                  src={selectedEntry.uploadedImageUrl} 
                  alt="Uploaded Image" 
                  className="w-auto max-w-full max-h-[60vh] object-contain rounded-lg opacity-60"
                  onError={(e) => {
                    // 404 오류 시 기본 아이콘 표시
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="flex items-center justify-center h-64 bg-gray-100 rounded-lg w-full"><svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg w-full">
                  <ImageIcon className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>

            {/* 내용 섹션 */}
            <div className="space-y-6 px-4 pb-6">
              {/* 감정 분석 결과 */}
              {selectedEntry.emotionAnalysis && (
                <div className="space-y-3">
                  <h4 className="font-medium text-green-700">감정 분석</h4>
                  <p className="text-gray-600">{selectedEntry.emotionAnalysis.summary}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.emotionAnalysis.keywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-sm"
                      >
                        #{keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 상호작용 버튼들 */}
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  className={`flex items-center gap-2 ${likedEntries[selectedEntry.id] ? 'text-red-500 border-red-300' : 'text-gray-600 border-gray-300 hover:bg-red-50'}`}
                  onClick={(e) => handleLike(e, selectedEntry)}
                >
                  <Heart className="w-4 h-4" fill={likedEntries[selectedEntry.id] ? '#EF4444' : 'none'} />
                  <span>{selectedEntry.likesCount || 0}</span>
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>{selectedEntry.commentsCount || 0}</span>
                </Button>
              </div>

            {/* 답글 섹션 - Apple 스타일 */}
            <div className="px-4 pb-6 border-t border-gray-100 pt-4">
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">답글 {comments.length > 0 && `(${comments.length})`}</h4>
                
                {/* 답글 입력 필드 - Apple 스타일 */}
                {currentUser?.uid ? (
                  <form onSubmit={handleSubmitComment} className="mb-4">
                    <div className="flex items-start gap-3">
                      <img 
                        src={currentUser.photoURL || '/default-avatar.png'} 
                        alt="User Avatar" 
                        className="w-8 h-8 rounded-full flex-shrink-0"
                      />
                      <div className="flex-1">
                        <input
                          type="text"
                          value={commentContent}
                          onChange={(e) => setCommentContent(e.target.value)}
                          placeholder="답글 추가..."
                          className="w-full p-3 bg-gray-50 border-0 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 transition-all"
                          disabled={isSubmittingComment}
                        />
                        {commentContent.trim() && (
                          <div className="flex justify-end mt-2">
                            <Button 
                              type="submit" 
                              size="sm"
                              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 py-1 text-sm font-medium" 
                              disabled={isSubmittingComment}
                            >
                              {isSubmittingComment ? <Loader2 className="w-3 h-3 animate-spin" /> : '게시'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">답글을 작성하려면 로그인해주세요.</p>
                  </div>
                )}

                {/* 답글 목록 - Apple 스타일 */}
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">아직 답글이 없습니다.</p>
                    </div>
                  ) : (
                    comments.map(comment => (
                      <div key={comment.id} className="flex items-start gap-3">
                        <img 
                          src={comment.userPhotoURL || '/default-avatar.png'} 
                          alt="User Avatar" 
                          className="w-8 h-8 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="bg-gray-50 rounded-2xl px-4 py-3 relative group">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900 text-sm">{comment.userName || '익명'}</span>
                                <span className="text-xs text-gray-500">
                                  {format(new Date(comment.createdAt.toDate()), 'MM월 dd일', { locale: ko })}
                                  {comment.updatedAt && ' (수정됨)'}
                                </span>
                              </div>
                              
                              {/* 수정/삭제 버튼 (본인 댓글만) */}
                              {currentUser?.uid === comment.userId && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleStartEditComment(comment.id, comment.content)}
                                    className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded"
                                  >
                                    수정
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded"
                                  >
                                    삭제
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            {/* 수정 모드 */}
                            {editingCommentId === comment.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editingCommentContent}
                                  onChange={(e) => setEditingCommentContent(e.target.value)}
                                  className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                                  autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={handleCancelEditComment}
                                    className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1 rounded"
                                  >
                                    취소
                                  </button>
                                  <button
                                    onClick={() => handleSaveEditComment(comment.id)}
                                    className="text-xs bg-blue-500 text-white hover:bg-blue-600 px-3 py-1 rounded"
                                  >
                                    저장
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-800 text-sm leading-relaxed">{comment.content}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // 엔트리 수정 핸들러
  const handleEditEntry = (entry: PersonaEntry) => {
    setSelectedEntry(entry);
    setEditingContent(entry.originalDiaryContent);
    setEditingUploadedImageUrl(entry.uploadedImageUrl); // Initialize for image editing
    setEditingPersonaImageUrl(entry.personaImageUrl); // Initialize for persona image editing
    setIsEditing(true);
    setIsDialogOpen(false); // Close detail dialog
  };

  // 수정 내용 저장 핸들러
  const handleSaveEdit = async () => {
    if (!currentUser?.uid || !selectedEntry) return;

    try {
      const entryRef = doc(db, `users/${currentUser.uid}/persona_entries`, selectedEntry.id);
      const updateData: { originalDiaryContent: string; updatedAt: Date; uploadedImageUrl?: string | FieldValue; personaImageUrl?: string | FieldValue; } = {
        originalDiaryContent: editingContent,
        updatedAt: new Date(),
      };

      // Handle uploadedImageUrl changes
      if (editingUploadedImageUrl !== selectedEntry.uploadedImageUrl) {
        if (editingUploadedImageUrl === undefined) {
          updateData.uploadedImageUrl = deleteField(); // Firestore에서 필드 삭제
        } else {
          updateData.uploadedImageUrl = editingUploadedImageUrl;
        }
        // If original uploaded image exists and is different (or removed), delete it from storage
        if (selectedEntry.uploadedImageUrl && !editingUploadedImageUrl) {
          const oldImageRef = ref(storage, selectedEntry.uploadedImageUrl);
          await deleteObject(oldImageRef);
        }
      }

      // Handle personaImageUrl changes
      if (editingPersonaImageUrl !== selectedEntry.personaImageUrl) {
        // 기존 personaImageUrl이 있고, 새로운 URL과 다를 경우 이전 이미지를 스토리지에서 삭제 (오류 무시)
        if (selectedEntry.personaImageUrl) {
          try {
            const oldPersonaImageRef = ref(storage, selectedEntry.personaImageUrl);
            await deleteObject(oldPersonaImageRef);
          } catch (error) {
            console.log('기존 페르소나 이미지 삭제 실패 (이미 삭제되었거나 존재하지 않음):', error);
            // 오류를 무시하고 계속 진행
          }
        }
        if (editingPersonaImageUrl === undefined) {
          updateData.personaImageUrl = deleteField(); // Firestore에서 필드 삭제
        } else {
          updateData.personaImageUrl = editingPersonaImageUrl;
        }
      }

      await updateDoc(entryRef, updateData);
      alert('게시물이 성공적으로 수정되었습니다.');
      setIsEditing(false);
      setEditingContent('');
      setEditingUploadedImageUrl(undefined); // Reset
      setEditingPersonaImageUrl(undefined); // Reset
      setSelectedEntry(null);
    } catch (error) {
      console.error('게시물 수정 실패:', error);
      alert('게시물 수정 중 오류가 발생했습니다.');
    }
  };

  // 수정 취소 핸들러
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingContent('');
    setEditingUploadedImageUrl(undefined); // Reset
    setEditingPersonaImageUrl(undefined); // Reset
    setSelectedEntry(null);
  };

  // 엔트리 삭제 핸들러
  const handleDeleteEntry = async (entry: PersonaEntry) => {
    if (!currentUser?.uid || !confirm('정말로 이 엔트리를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const entryRef = doc(db, `users/${currentUser.uid}/persona_entries`, entry.id);
      await deleteDoc(entryRef);

      // 스토리지에 저장된 이미지도 삭제 (선택사항)
      if (entry.uploadedImageUrl) {
        const imageRef = ref(storage, entry.uploadedImageUrl);
        await deleteObject(imageRef);
      }
      if (entry.personaImageUrl) {
        const personaImageRef = ref(storage, entry.personaImageUrl);
        await deleteObject(personaImageRef);
      }

      alert('엔트리가 삭제되었습니다.');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('엔트리 삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 좋아요 핸들러
  const handleLike = async (e: React.MouseEvent<HTMLButtonElement>, entry: PersonaEntry) => {
    e.stopPropagation(); // 이벤트 전파 방지

    if (!currentUser?.uid) {
      alert('로그인이 필요한 서비스입니다.');
      router.push('/login');
      return;
    }

    const currentUserId = currentUser.uid;
    const entryId = entry.id;
    // 게시물 작성자의 UID 사용 (entry.authorId가 있으면 사용, 없으면 userId 사용)
    const postAuthorId = entry.authorId || userId;
    const likeDocRef = doc(db, `users/${postAuthorId}/persona_entries/${entryId}/likes`, currentUserId);
    const entryRef = doc(db, `users/${postAuthorId}/persona_entries`, entryId);

    console.log('좋아요 처리 경로:', `users/${postAuthorId}/persona_entries/${entryId}/likes/${currentUserId}`); // 디버깅용

    try {
      if (likedEntries[entryId]) {
        // 이미 좋아요를 눌렀다면 좋아요 취소
        await deleteDoc(likeDocRef);
        await updateDoc(entryRef, { likesCount: (entry.likesCount || 1) - 1 });
        setLikedEntries(prev => ({ ...prev, [entryId]: false }));
        // selectedEntry가 현재 좋아요를 누른 엔트리라면 해당 엔트리 업데이트
        if (selectedEntry?.id === entryId) {
          setSelectedEntry(prev => prev ? { ...prev, likesCount: (prev.likesCount || 1) - 1 } : null);
        }
      } else {
        // 좋아요 추가
        await setDoc(likeDocRef, { 
          userId: currentUserId, 
          userName: currentUser.displayName || currentUser.email || '익명 사용자',
          createdAt: new Date() 
        });
        await updateDoc(entryRef, { likesCount: (entry.likesCount || 0) + 1 });
        setLikedEntries(prev => ({ ...prev, [entryId]: true }));
        // selectedEntry가 현재 좋아요를 누른 엔트리라면 해당 엔트리 업데이트
        if (selectedEntry?.id === entryId) {
          setSelectedEntry(prev => prev ? { ...prev, likesCount: (prev.likesCount || 0) + 1 } : null);
        }
      }
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
      alert('좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  // 답글 제출 핸들러
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault(); // 폼 제출 기본 동작 방지

    if (!currentUser?.uid || !selectedEntry || !commentContent.trim()) {
      alert('로그인 후 답글 내용을 입력해주세요.');
      return;
    }

    setIsSubmittingComment(true);

    try {
      const entryId = selectedEntry.id;
      const currentUserId = currentUser.uid;
      const authorId = selectedEntry.authorId || selectedEntry.diaryRef || userId;
      const commentsCollectionRef = collection(db, `users/${authorId}/persona_entries/${entryId}/comments`);
      const entryRef = doc(db, `users/${authorId}/persona_entries`, entryId);

      await addDoc(commentsCollectionRef, {
        userId: currentUserId,
        userName: currentUser.displayName || currentUser.email,
        userPhotoURL: currentUser.photoURL,
        content: commentContent.trim(),
        createdAt: new Date(),
      });

      // 답글 수 증가
      await updateDoc(entryRef, { commentsCount: (selectedEntry.commentsCount || 0) + 1 });
      
      // selectedEntry 상태 업데이트 (다이얼로그에 반영)
      setSelectedEntry(prev => prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : null);

      setCommentContent(''); // 입력 필드 초기화
      alert('답글이 성공적으로 작성되었습니다.');
    } catch (error) {
      console.error('답글 작성 실패:', error);
      alert('답글 작성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 답글 삭제 핸들러
  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser?.uid || !selectedEntry || !confirm('이 답글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const currentUserId = currentUser.uid;
      const entryId = selectedEntry.id;
      const authorId = selectedEntry.authorId || selectedEntry.diaryRef || userId;
      const commentDocRef = doc(db, `users/${authorId}/persona_entries/${entryId}/comments`, commentId);
      const entryRef = doc(db, `users/${authorId}/persona_entries`, entryId);

      await deleteDoc(commentDocRef);
      
      // 답글 수 감소
      await updateDoc(entryRef, { commentsCount: Math.max(0, (selectedEntry.commentsCount || 1) - 1) });
      
      // selectedEntry 상태 업데이트
      setSelectedEntry(prev => prev ? { ...prev, commentsCount: Math.max(0, (prev.commentsCount || 1) - 1) } : null);

      alert('답글이 삭제되었습니다.');
    } catch (error) {
      console.error('답글 삭제 실패:', error);
      alert('답글 삭제 중 오류가 발생했습니다.');
    }
  };

  // 답글 수정 시작 핸들러
  const handleStartEditComment = (commentId: string, currentContent: string) => {
    setEditingCommentId(commentId);
    setEditingCommentContent(currentContent);
  };

  // 답글 수정 저장 핸들러
  const handleSaveEditComment = async (commentId: string) => {
    if (!currentUser?.uid || !selectedEntry || !editingCommentContent.trim()) {
      return;
    }

    try {
      const currentUserId = currentUser.uid;
      const entryId = selectedEntry.id;
      const authorId = selectedEntry.authorId || selectedEntry.diaryRef || userId;
      const commentDocRef = doc(db, `users/${authorId}/persona_entries/${entryId}/comments`, commentId);

      await updateDoc(commentDocRef, {
        content: editingCommentContent.trim(),
        updatedAt: new Date(),
      });

      setEditingCommentId(null);
      setEditingCommentContent('');
      alert('답글이 수정되었습니다.');
    } catch (error) {
      console.error('답글 수정 실패:', error);
      alert('답글 수정 중 오류가 발생했습니다.');
    }
  };

  // 답글 수정 취소 핸들러
  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  // 게시물 수정 다이얼로그 렌더링 함수
  const renderEditDialog = () => {
    if (!isEditing || !selectedEntry) return null;

    return (
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl bg-white p-6 rounded-lg shadow-xl">
          <DialogTitle className="text-2xl font-bold text-green-800 mb-4">게시물 수정</DialogTitle>
          <div className="space-y-4">
            {/* 이미지 미리보기 및 업로드 */}
            <div className="flex flex-col items-center gap-4 p-4 border border-gray-200 rounded-lg">
              {editingPersonaImageUrl ? (
                <img 
                  src={editingPersonaImageUrl} 
                  alt="Persona Image" 
                  className="w-48 h-48 object-cover rounded-md shadow-md"
                  onError={(e) => {
                    // 404 오류 시 editingUploadedImageUrl로 fallback하거나 기본 아이콘 표시
                    const target = e.target as HTMLImageElement;
                    if (editingUploadedImageUrl && target.src !== editingUploadedImageUrl) {
                      target.src = editingUploadedImageUrl;
                      target.className = "w-48 h-48 object-cover rounded-md shadow-md opacity-70";
                    } else {
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-md"><svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                      }
                    }
                  }}
                />
              ) : editingUploadedImageUrl ? (
                <img 
                  src={editingUploadedImageUrl} 
                  alt="Uploaded Image" 
                  className="w-48 h-48 object-cover rounded-md shadow-md opacity-70"
                  onError={(e) => {
                    // 404 오류 시 기본 아이콘 표시
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-md"><svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                    }
                  }}
                />
              ) : (
                <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-md">
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <input
                type="file"
                accept="image/*,.heic,.heif"
                ref={editFileInputRef}
                style={{ display: 'none' }}
                onChange={handleImageUploadForEdit}
                disabled={isUploadingImageForEdit}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
                  onClick={() => editFileInputRef.current?.click()}
                  disabled={isUploadingImageForEdit}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  사진 변경
                </Button>
                {editingUploadedImageUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => setEditingUploadedImageUrl(undefined)}
                  >
                    사진 삭제
                  </Button>
                )}
              </div>
            </div>

            <textarea
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 text-gray-800 resize-y min-h-[200px]"
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              placeholder="일기 내용을 수정해주세요..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                className="bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                onClick={handleCancelEdit}
              >
                취소
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleSaveEdit}
                disabled={isUploadingImageForEdit || isGeneratingPersonaImage[selectedEntry.id]}
              >
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

// 리스트 뷰 렌더링 함수
const renderListView = () => {
  return (
    <div className="space-y-4 px-2 md:px-0">
      {filteredEntries.length === 0 ? (
        <div className="col-span-full p-6 text-center backdrop-blur-sm rounded-lg" style={getCardStyle()}>
          <p style={{ color: styleSettings.textColor }}>아직 생성된 페르소나 엔트리가 없습니다.</p>
        </div>
      ) : (
        filteredEntries.map(entry => (
          <div
            key={entry.id}
            className="flex items-start gap-4 p-4 backdrop-blur-sm border border-[#358f80]/30 rounded-xl shadow-lg hover:shadow-xl cursor-pointer transition-all"
            style={getCardStyle()}
            onClick={() => handleCardClick(entry)}
          >
            {/* 왼쪽: 이미지 썸네일 */}
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
              {entry.personaImageUrl ? (
                <img
                  src={entry.personaImageUrl}
                  alt="Persona"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (entry.uploadedImageUrl && target.src !== entry.uploadedImageUrl) {
                      target.src = entry.uploadedImageUrl;
                      target.className = "w-full h-full object-cover opacity-60";
                    } else {
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                      }
                    }
                  }}
                />
              ) : entry.uploadedImageUrl ? (
                <img
                  src={entry.uploadedImageUrl}
                  alt="Uploaded"
                  className="w-full h-full object-cover opacity-60"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-gray-500" />
                </div>
              )}
            </div>
           
            {/* 오른쪽: 세로 3개 행 (Column 구조) */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              {/* 1행: 날짜와 감정 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: styleSettings.textColor }}>
                  {format(new Date(entry.date), 'yy년 MM월 dd일', { locale: ko })}
                </span>
                {entry.emotionAnalysis && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: entry.emotionAnalysis.color + '30', color: entry.emotionAnalysis.color }}>
                    {entry.emotionAnalysis.emotion}
                  </span>
                )}
              </div>
             
              {/* 2행: 내용 */}
              <div>
                <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: styleSettings.textColor }}>
                  {entry.originalDiaryContent}
                </p>
              </div>

              {/* 3행: 태그, 좋아요, 답글 */}
              <div className="flex items-center justify-between gap-2">
                {/* 태그 */}
                <div className="flex gap-1 flex-wrap">
                  {entry.emotionAnalysis && entry.emotionAnalysis.keywords.length > 0 ? (
                    entry.emotionAnalysis.keywords.slice(0, 3).map((keyword, idx) => (
                      <span key={idx} className="text-xs bg-[#358f80]/20 px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: styleSettings.textColor }}>
                        #{keyword}
                      </span>
                    ))
                  ) : (
                    <div></div>
                  )}
                </div>
                
                {/* 상호작용 정보 */}
                <div className="flex items-center gap-3 text-sm flex-shrink-0" style={{ color: styleSettings.textColor }}>
                  <button
                    className="flex items-center gap-1 hover:scale-105 transition-transform bg-white px-2 py-1 rounded-md border border-gray-200"
                    onClick={(e) => handleLike(e, entry)}
                  >
                    <Heart className="w-4 h-4" fill={likedEntries[entry.id] ? '#EF4444' : 'none'} />
                    <span>{entry.likesCount || 0}</span>
                  </button>
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-gray-200">
                    <MessageCircle className="w-4 h-4" />
                    <span>{entry.commentsCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// 공감 탭 렌더링 함수 (인스타그램 스타일 활동 피드)
const renderPopularView = () => {
  return (
    <div className="space-y-4 px-2 md:px-0">
      <div className="text-center mb-6">
      </div>
      
      {activities.length === 0 ? (
        <div className="text-center py-12 backdrop-blur-sm rounded-lg" style={getCardStyle()}>
          <h4 className="text-lg font-medium mb-2" style={{ color: styleSettings.textColor }}>
            아직 활동이 없습니다
          </h4>
          <p className="text-sm opacity-70" style={{ color: styleSettings.textColor }}>
            다른 사용자들이 좋아요나 답글을 남기면 여기에 표시됩니다
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map(activity => (
            <div 
              key={activity.id}
              className="flex items-start gap-4 p-4 backdrop-blur-sm border border-[#358f80]/30 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all"
              style={getCardStyle()}
              onClick={() => {
                // 해당 게시물의 다이얼로그 열기
                const entry = personaEntries.find(e => e.id === activity.entryId);
                if (entry) handleCardClick(entry);
              }}
            >
              {/* 왼쪽: 게시물 썸네일 */}
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                {activity.entryImage ? (
                  <img 
                    src={activity.entryImage} 
                    alt="Entry" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-gray-500" />
                  </div>
                )}
              </div>

              {/* 오른쪽: 세로 배치 */}
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                {/* 1행: 유저명과 반응 글 */}
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm" style={{ color: styleSettings.textColor }}>
                    {activity.userName}
                  </span>
                  <span className="text-sm" style={{ color: styleSettings.textColor }}>
                    님이 {activity.type === 'like' ? '좋아요' : '답글'}을 남겼습니다
                  </span>
                </div>
                
                {/* 2행: 내용 (한 줄) */}
                <div>
                  <p className="text-sm opacity-80 truncate" style={{ color: styleSettings.textColor }}>
                    {activity.type === 'comment' && activity.commentContent 
                      ? `"${activity.commentContent}"`
                      : activity.entryContent}
                  </p>
                </div>

                {/* 3행: 날짜 + 시간 */}
                <div>
                  <span className="text-xs opacity-60" style={{ color: styleSettings.textColor }}>
                    {format(activity.createdAt, 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

  // 페르소나 이미지 업로드 다이얼로그 렌더링 함수
  const renderPersonaUploadDialog = () => {
    if (!isUploadDialogForPersonaOpen || !selectedEntryForUpload) return null;

    const entryId = selectedEntryForUpload.id;

    return (
      <Dialog open={isUploadDialogForPersonaOpen} onOpenChange={setIsUploadDialogForPersonaOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-lg shadow-xl">
          <DialogTitle className="text-2xl font-bold text-green-800 mb-4">사진 업로드</DialogTitle>
          <div className="space-y-4">
            {/* 이미지 미리보기 */}
            <div className="flex flex-col items-center gap-4 p-4 border border-gray-200 rounded-lg">
              {/* 여기에 선택된 파일 미리보기를 추가할 수 있습니다. */}
              {isUploadingImage[entryId] ? (
                <div className="flex flex-col items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                  <span>업로드 중...</span>
                  {uploadProgressImage[entryId] !== undefined && (
                    <span>{Math.round(uploadProgressImage[entryId])}%</span>
                  )}
                </div>
              ) : (
                <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-md">
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <input 
                type="file" 
                accept="image/*,.heic,.heif" 
                ref={el => { fileInputRefs.current[entryId] = el; }}
                style={{ display: 'none' }}
                onChange={(e) => handleImageUploadForPersona(e, entryId)}
                disabled={isUploadingImage[entryId]}
              />
              <Button
                variant="outline"
                size="sm"
                className="text-white-600 border-blue-300 hover:bg-blue-50"
                onClick={() => fileInputRefs.current[entryId]?.click()}
                disabled={isUploadingImage[entryId]}
              >
                <Upload className="w-4 h-4 mr-2" />
                파일 선택
              </Button>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                className="text-white-600 border-gray-300 hover:bg-gray-50"
                onClick={() => {
                  setIsUploadDialogForPersonaOpen(false);
                  setSelectedEntryForUpload(null);
                }}
              >
                닫기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="flex-1 md:p-6 py-6 overflow-x-hidden overflow-y-auto w-full">
      <style jsx>{`
        [data-state="active"] {
          background-color: var(--active-bg) !important;
          color: var(--active-text) !important;
        }
      `}</style>
      <div className="w-full space-y-6">
        {/* 스타일 설정 */}
        {renderStyleSettings()}

        {/* 탭 내비게이션 */}
        <div className="flex justify-center mb-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'card' | 'list' | 'popular')}>
            <TabsList 
              className="grid w-full max-w-lg grid-cols-3 backdrop-blur-sm border p-1"
              style={{
                backgroundColor: styleSettings.bgColor === 'transparent' ? 'rgba(42, 77, 69, 0.5)' : `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.5) * 255).toString(16).padStart(2, '0')}`,
                borderColor: `${styleSettings.shadowColor || '#358f80'}30`,
                borderRadius: (() => {
                  switch (styleSettings.rounded) {
                    case 'none': return '0';
                    case 'sm': return '0.125rem';
                    case 'md': return '0.375rem';
                    case 'lg': return '0.5rem';
                    case 'xl': return '0.75rem';
                    case '2xl': return '1rem';
                    case 'full': return '9999px';
                    default: return '1rem';
                  }
                })()
              }}
            >
              <TabsTrigger 
                value="card"
                className="py-3 px-6 text-lg transition-all font-medium data-[state=active]:shadow-sm"
                style={{
                  color: styleSettings.textColor,
                  borderRadius: (() => {
                    switch (styleSettings.rounded) {
                      case 'none': return '0';
                      case 'sm': return '0.125rem';
                      case 'md': return '0.375rem';
                      case 'lg': return '0.5rem';
                      case 'xl': return '0.75rem';
                      case '2xl': return '1rem';
                      case 'full': return '9999px';
                      default: return '0.75rem';
                    }
                  })(),
                  '--active-bg': (() => {
                    if (styleSettings.bgColor === 'transparent') return 'rgba(86, 171, 145, 0.6)';
                    const hex = styleSettings.bgColor;
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    // 더 진한 색상으로 만들기 (각 RGB 값에서 40 빼기, 최소 0)
                    const darkerR = Math.max(0, r - 40);
                    const darkerG = Math.max(0, g - 40);
                    const darkerB = Math.max(0, b - 40);
                    return `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
                  })(),
                  '--active-text': styleSettings.textColor === '#FFFFFF' ? '#FFFFFF' : styleSettings.textColor
                } as React.CSSProperties & { '--active-bg': string; '--active-text': string }}
              >
                카드
              </TabsTrigger>
              <TabsTrigger 
                value="list"
                className="py-3 px-6 text-lg transition-all font-medium data-[state=active]:shadow-sm"
                style={{
                  color: styleSettings.textColor,
                  borderRadius: (() => {
                    switch (styleSettings.rounded) {
                      case 'none': return '0';
                      case 'sm': return '0.125rem';
                      case 'md': return '0.375rem';
                      case 'lg': return '0.5rem';
                      case 'xl': return '0.75rem';
                      case '2xl': return '1rem';
                      case 'full': return '9999px';
                      default: return '0.75rem';
                    }
                  })(),
                  '--active-bg': (() => {
                    if (styleSettings.bgColor === 'transparent') return 'rgba(86, 171, 145, 0.6)';
                    const hex = styleSettings.bgColor;
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    // 더 진한 색상으로 만들기 (각 RGB 값에서 40 빼기, 최소 0)
                    const darkerR = Math.max(0, r - 50);
                    const darkerG = Math.max(0, g - 50);
                    const darkerB = Math.max(0, b - 50);
                    return `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
                  })(),
                  '--active-text': styleSettings.textColor === '#FFFFFF' ? '#FFFFFF' : styleSettings.textColor
                } as React.CSSProperties & { '--active-bg': string; '--active-text': string }}
              >
                리스트
              </TabsTrigger>
              <TabsTrigger 
                value="popular"
                className="py-3 px-6 text-lg transition-all font-medium data-[state=active]:shadow-sm"
                style={{
                  color: styleSettings.textColor,
                  borderRadius: (() => {
                    switch (styleSettings.rounded) {
                      case 'none': return '0';
                      case 'sm': return '0.125rem';
                      case 'md': return '0.375rem';
                      case 'lg': return '0.5rem';
                      case 'xl': return '0.75rem';
                      case '2xl': return '1rem';
                      case 'full': return '9999px';
                      default: return '0.75rem';
                    }
                  })(),
                  '--active-bg': (() => {
                    if (styleSettings.bgColor === 'transparent') return 'rgba(86, 171, 145, 0.6)';
                    const hex = styleSettings.bgColor;
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    // 더 진한 색상으로 만들기 (각 RGB 값에서 40 빼기, 최소 0)
                    const darkerR = Math.max(0, r - 40);
                    const darkerG = Math.max(0, g - 40);
                    const darkerB = Math.max(0, b - 40);
                    return `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
                  })(),
                  '--active-text': styleSettings.textColor === '#FFFFFF' ? '#FFFFFF' : styleSettings.textColor
                } as React.CSSProperties & { '--active-bg': string; '--active-text': string }}
              >
                공감
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 게시물 표시 영역 */}
        {activeTab === 'card' ? (
          // 카드 그리드 뷰
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 px-2 md:px-0">
            {filteredEntries.length === 0 ? (
              <div className="col-span-full p-6 text-center backdrop-blur-sm rounded-lg" style={getCardStyle()}>
                <p style={{ color: styleSettings.textColor }}>아직 생성된 페르소나 엔트리가 없습니다.</p>
              </div>
            ) : (
              filteredEntries.map(entry => (
              <div
                key={entry.id}
                className="backdrop-blur-sm border border-[#358f80]/30 rounded-xl overflow-hidden shadow-lg transform transition-all hover:scale-[1.01] hover:shadow-xl cursor-pointer"
                style={getCardStyle()}
                onClick={() => handleCardClick(entry)}
              >
                {/* 날짜 */}
                <div className="p-4 text-sm border-b border-[#358f80]/20 flex justify-between items-center">
                  <span style={{ color: styleSettings.textColor }}>{format(new Date(entry.date), 'yy년 MM월 dd일', { locale: ko })}</span>
                  {entry.emotionAnalysis && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: entry.emotionAnalysis.color + '30', color: entry.emotionAnalysis.color }}>
                      {entry.emotionAnalysis.emotion}
                    </span>
                  )}
                </div>

                {/* 페르소나 이미지 (또는 업로드 이미지) */}
                <div className="relative w-full aspect-square bg-gray-800 flex items-center justify-center">
                  {entry.personaImageUrl ? (
                    <img 
                      src={entry.personaImageUrl} 
                      alt="Persona Image" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // 404 오류 시 uploadedImageUrl로 fallback하거나 기본 아이콘 표시
                        const target = e.target as HTMLImageElement;
                        if (entry.uploadedImageUrl && target.src !== entry.uploadedImageUrl) {
                          target.src = entry.uploadedImageUrl;
                          target.className = "w-full h-full object-cover opacity-60";
                        } else {
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="flex flex-col items-center gap-2"><svg class="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span class="text-xs text-gray-400">이미지 로드 실패</span></div>';
                          }
                        }
                      }}
                    />
                  ) : entry.uploadedImageUrl ? (
                    <img 
                      src={entry.uploadedImageUrl} 
                      alt="Uploaded Image" 
                      className="w-full h-full object-cover opacity-60"
                      onError={(e) => {
                        // 404 오류 시 기본 아이콘 표시
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="flex flex-col items-center gap-2"><svg class="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span class="text-xs text-gray-400">이미지 로드 실패</span></div>';
                        }
                      }}
                    />
                  ) : (
                    // 이미지가 없을 때 업로드 버튼 표시
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="w-12 h-12 text-gray-500" />
                      {userId === currentUser?.uid && !entry.personaImageUrl && (
                        <Button 
                          variant="outline"
                          className="bg-[#358f80]/20 hover:bg-[#358f80]/40 border-[#358f80]/30 text-white text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntryForUpload(entry);
                            setIsUploadDialogForPersonaOpen(true);
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          사진 업로드
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* 감정 분석 버튼 */}
                {userId === currentUser?.uid && !entry.emotionAnalysis && (
                  <div className="p-3 border-t border-[#358f80]/20 flex justify-center">
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyzeEmotion(entry);
                      }}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:from-purple-600 hover:to-blue-500 transition-all duration-300"
                      disabled={isAnalyzingEmotion[entry.id] || isUploadingImage[entry.id]}
                    >
                      {isAnalyzingEmotion[entry.id] ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 감정 분석 중...</>
                      ) : (
                        '감정 분석하기'
                      )}
                    </Button>
                  </div>
                )}

                {/* 감정 요약 및 키워드 */}
                {entry.emotionAnalysis && (
                  <div className="p-4 border-t border-[#358f80]/20">
                    <p className="text-sm mb-2 line-clamp-2" style={{ color: styleSettings.textColor }}>{entry.emotionAnalysis.summary}</p>
                    <div className="flex flex-wrap gap-1">
                      {entry.emotionAnalysis.keywords.map((keyword, idx) => (
                        <span key={idx} className="text-xs bg-[#358f80]/20 px-2 py-0.5 rounded-full" style={{ color: styleSettings.textColor }}>#{keyword}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 페르소나 이미지 생성 버튼 */}
                {userId === currentUser?.uid && entry.uploadedImageUrl && !entry.personaImageUrl && !entry.hasGeneratedPersonaImage && (
                  <div className="p-3 border-t border-[#358f80]/20 flex justify-center">
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGeneratePersonaImage(entry);
                      }}
                      className="w-full bg-gradient-to-r from-[#4CAF50] to-[#8BC34A] text-white font-bold py-2 px-4 rounded-lg shadow-md hover:from-[#8BC34A] hover:to-[#4CAF50] transition-all duration-300"
                      disabled={isGeneratingPersonaImage[entry.id] || isUploadingImage[entry.id]}
                    >
                      {isGeneratingPersonaImage[entry.id] ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 페르소나 이미지 생성 중...</>
                      ) : (
                        '페르소나 이미지 생성'
                      )}
                    </Button>
                  </div>
                )}

                {/* 좋아요 및 답글 버튼 */}
                <div className="flex justify-around p-3 border-t border-[#358f80]/20">
                  <Button 
                    variant="ghost" 
                    className={`flex items-center gap-1 ${likedEntries[entry.id] ? 'text-red-500' : 'hover:text-red-400'}`}
                    style={{ color: likedEntries[entry.id] ? '#EF4444' : styleSettings.textColor }} // 좋아요 상태에 따라 색상 변경
                    onClick={(e) => handleLike(e, entry)}
                  >
                    <Heart className="w-5 h-5" fill={likedEntries[entry.id] ? '#EF4444' : 'none'} />
                    <span>{entry.likesCount || 0}</span>
                  </Button>
                  <Button variant="ghost" className="flex items-center gap-1 hover:text-blue-400" style={{ color: styleSettings.textColor }}>
                    <MessageCircle className="w-5 h-5" />
                    <span>{entry.commentsCount || 0}</span>
                  </Button>
                </div>
              </div>
              ))
            )}
          </div>
        ) : activeTab === 'list' ? (
          // 리스트 뷰
          renderListView()
        ) : (
          // 공감 탭
          renderPopularView()
        )}
      </div>

      {/* 페르소나 엔트리 상세 다이얼로그 */}
      {renderPersonaDialog()}
      {renderEditDialog()}
      {renderPersonaUploadDialog()} {/* Add this line */}
    </div>
  );
}
