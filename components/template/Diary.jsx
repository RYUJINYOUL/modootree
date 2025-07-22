'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import app from '@/firebase';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import { usePathname, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { Lock, Unlock, Pencil, Trash2, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { cn } from '@/lib/utils';

const db = getFirestore(app);
const storage = getStorage(app);

// 이메일 마스킹 함수 추가
const maskEmail = (email) => {
  if (!email) return '';
  if (!email.includes('@')) return email;
  
  const [username, domain] = email.split('@');
  const domainParts = domain.split('.');
  const lastPart = domainParts[domainParts.length - 1];
  
  if (lastPart.length >= 2) {
    domainParts[domainParts.length - 1] = lastPart.slice(0, -2) + '**';
  }
  
  return `${username}@${domainParts.join('.')}`;
};

const HeaderDrawer = ({ children, drawerContentClassName, uid, ...props }) => {
  const { currentUser } = useSelector((state) => state.user);
  const finalUid = uid ?? currentUser?.uid;

  return (
    <Drawer>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className={`w-full h-full flex flex-col bg-gray-50 ${drawerContentClassName}`}>
        <DrawerHeader>
          <DrawerTitle>오늘 기록</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4">
          {/* 일기 작성 폼이 여기에 들어갈 수 있습니다 */}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

const CATEGORIES = ['일상', '감정', '관계', '목표/취미', '특별한 날', '기타/자유'];

const COLOR_PALETTE = [
  "#000000", "#FFFFFF", "#F87171", "#FBBF24",
  "#34D399", "#60A5FA", "#A78BFA", "#F472B6",
];

const Diary = ({ username, uid, isEditable, isAllowed }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [diaries, setDiaries] = useState([]);
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [newDiary, setNewDiary] = useState({
    title: '',
    content: '',
    isPrivate: false,
    images: [],
  });
  const [isWriting, setIsWriting] = useState(false);
  const [editingDiary, setEditingDiary] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [likeModalOpen, setLikeModalOpen] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLiking, setIsLiking] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(dayjs());
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [croppingImage, setCroppingImage] = useState(null);
  const [croppingImageUrl, setCroppingImageUrl] = useState('');
  const imgRef = useRef(null);
  const [selectedDateDiaries, setSelectedDateDiaries] = useState([]);
  const [showDiaryPopup, setShowDiaryPopup] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [styleSettings, setStyleSettings] = useState({
    bgColor: '#60A5FA',
    textColor: '#FFFFFF',
    bgOpacity: 0.2,
    shadow: 'none'  // 그림자 설정 추가
  });
  
  const { currentUser } = useSelector((state) => state.user);
  const finalUid = uid ?? currentUser?.uid;
  const isEditMode = pathname ? pathname.startsWith('/editor') : false;
  // 현재 사용자가 작성자인지 확인하는 함수 추가
  const isAuthor = (diary) => {
    if (!currentUser) return false;
    return diary.authorUid === currentUser.uid;
  };

  // canEdit 로직 수정
  const canEdit = useMemo(() => {
    if (!currentUser) return false;
    if (pathname?.startsWith('/editor')) return true;
    return currentUser.uid === finalUid;
    if (currentUser.uid === finalUid) return true;
    return isAllowed; // 허용된 사용자도 수정/삭제 가능하도록 추가
  }, [currentUser, pathname, finalUid, isAllowed]);

  // 현재 사용자 정보를 메모이제이션
  const currentUserInfo = useMemo(() => {
    return {
      email: currentUser?.email || '',
      displayName: username || currentUser?.displayName || '',  // username을 우선 사용
      uid: currentUser?.uid || '',
      username: username || ''  // username 추가
    };
  }, [currentUser, username]);

  // 권한 체크 함수 수정
  const canWrite = useMemo(() => {
    if (!currentUser) return false;
    if (isEditable || currentUser.uid === uid) return true;
    return isAllowed;  // isAllowed prop 사용
  }, [currentUser, isEditable, uid, isAllowed]);

  // 허용된 사용자 목록 가져오기
  useEffect(() => {
    if (!finalUid) return;
    
    const unsubscribe = onSnapshot(
      doc(db, 'users', finalUid, 'settings', 'permissions'),
      (doc) => {
        if (doc.exists()) {
          setAllowedUsers(doc.data().allowedUsers || []);
        }
      }
    );

    return () => unsubscribe();
  }, [finalUid]);

  const days = ['일', '월', '화', '수', '목', '금', '토'];
  
  const startOfMonth = currentDate.startOf('month');
  const endOfMonth = currentDate.endOf('month');
  const startDate = startOfMonth.startOf('week');
  const endDate = endOfMonth.endOf('week');

  const dates = [];
  let current = startDate;

  while (current.isBefore(endDate) || current.isSame(endDate)) {
    dates.push(current);
    current = current.add(1, 'day');
  }

  const handlePrevMonth = () => setCurrentDate(prev => prev.subtract(1, 'month'));
  const handleNextMonth = () => setCurrentDate(prev => prev.add(1, 'month'));

  // 주간 날짜 계산
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    return currentWeek.startOf('week').add(i, 'day');
  });

  const handlePrevWeek = () => setCurrentWeek(prev => prev.subtract(1, 'week'));
  const handleNextWeek = () => setCurrentWeek(prev => prev.add(1, 'week'));

  useEffect(() => {
    if (!finalUid) return;

    const q = query(
      collection(db, 'users', finalUid, 'diary'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const diaryList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      // 비공개 일기는 작성자만 볼 수 있도록 필터링
      .filter(diary => !diary.isPrivate || canEdit);
      setDiaries(diaryList);
    });

    return () => unsubscribe();
  }, [finalUid, canEdit]);

  // 이미지 크롭 관련 함수들
  function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    );
  }

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 16 / 9));
  };

  const handleImageUpload = async (files) => {
    const file = files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCroppingImageUrl(reader.result);
        setCroppingImage(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImg = async (image, crop) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(new File([blob], croppingImage.name, { type: 'image/jpeg' }));
      }, 'image/jpeg');
    });
  };

  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current) return;

    try {
      const croppedImage = await getCroppedImg(imgRef.current, completedCrop);
      setSelectedImages(prev => [...prev, croppedImage]);
      setCroppingImage(null);
      setCroppingImageUrl('');
      setCrop(undefined);
      setCompletedCrop(undefined);
    } catch (error) {
      console.error('이미지 크롭 실패:', error);
    }
  };

  const handleRemoveImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImagesToStorage = async () => {
    if (selectedImages.length === 0) return [];
    
    setUploadingImages(true);
    try {
      const uploadPromises = selectedImages.map(async (file) => {
        const imageRef = ref(storage, `diary/${finalUid}/${Date.now()}_${file.name}`);
        await uploadBytes(imageRef, file);
        return getDownloadURL(imageRef);
      });

      const imageUrls = await Promise.all(uploadPromises);
      return imageUrls;
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      throw error;
    } finally {
      setUploadingImages(false);
    }
  };

  // 사용자 이름을 가져오는 함수
  const fetchUsername = async (uid) => {
    if (!uid) return null;
    
    try {
      // 이미 캐시된 username이 있다면 반환
      if (usernames[uid]) return usernames[uid];

      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const username = userDoc.data().username;
        // 캐시에 저장
        setUsernames(prev => ({ ...prev, [uid]: username }));
        return username;
      }
      return null;
    } catch (error) {
      console.error('사용자 이름 가져오기 실패:', error);
      return null;
    }
  };

  // 작성자 정보 표시 함수 수정
  const renderAuthorInfo = (diary) => {
    if (!diary.authorUid) return '사용자';
    return usernames[diary.authorUid] || diary.authorName || maskEmail(diary.authorEmail) || '사용자';
  };

  // 일기 작성 시 username도 함께 저장
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDiary.title || !newDiary.content || !currentUser) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    try {
      const imageUrls = await uploadImagesToStorage();
      const now = new Date().toISOString();
      const user = currentUser;

      // 현재 사용자의 username 가져오기
      const username = await fetchUsername(user.uid);
      
      const diaryData = {
        ...newDiary,
        images: imageUrls,
        createdAt: now,
        updatedAt: now,
        authorUid: user.uid,
        authorEmail: user.email || '',
        authorName: username || user.displayName || user.email?.split('@')[0] || '사용자',
      };

      await addDoc(collection(db, 'users', finalUid, 'diary'), diaryData);

      setNewDiary({ title: '', content: '', isPrivate: false, images: [] });
      setSelectedImages([]);
      setIsWriting(false);
      alert('일기가 저장되었습니다.');
    } catch (error) {
      console.error('일기 저장 실패:', error);
      alert('일기 저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id, images = []) => {
    if (!canEdit) return;
    if (!window.confirm('정말로 삭제하시겠습니까?')) return;

    try {
      const deletePromises = images.map(async (imageUrl) => {
        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        } catch (error) {
          console.error('이미지 삭제 실패:', error);
        }
      });

      await Promise.all(deletePromises);
      await deleteDoc(doc(db, 'users', finalUid, 'diary', id));
      alert('일기가 삭제되었습니다.');
    } catch (error) {
      console.error('일기 삭제 실패:', error);
      alert('일기 삭제에 실패했습니다.');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingDiary || !editingDiary.title || !editingDiary.content) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    try {
      const diaryRef = doc(db, 'users', finalUid, 'diary', editingDiary.id);
      await updateDoc(diaryRef, {
        title: editingDiary.title,
        content: editingDiary.content,
        isPrivate: editingDiary.isPrivate,
        updatedAt: new Date().toISOString(),
      });

      setEditingDiary(null);
      alert('일기가 수정되었습니다.');
    } catch (error) {
      console.error('일기 수정 실패:', error);
      alert('일기 수정에 실패했습니다.');
    }
  };

  const handleDiaryClick = (diary) => {
    if (diary.isPrivate && !canEdit) {
      alert('비공개 일기입니다.');
      return;
    }
    setSelectedDiary(diary);
    setModalOpen(true);
  };

  const handleLike = async () => {
    if (!selectedDiary || !selectedCategory) {
      alert('카테고리를 선택해주세요.');
      return;
    }

    setIsLiking(true);
    try {
      await addDoc(collection(db, 'likes'), {
        content: selectedDiary.content,
        category: selectedCategory,
        createdAt: new Date(),
        diaryId: selectedDiary.id,
        images: selectedDiary.images || [],
        userId: currentUser.uid
      });

      setLikeModalOpen(false);
      setSelectedCategory('');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('공감 저장 실패:', error);
      alert('공감 저장에 실패했습니다.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleLikeClick = (e, diary) => {
    e.stopPropagation();
    setSelectedDiary(diary);
    setLikeModalOpen(true);
  };

  // 선택된 날짜의 일기들을 필터링하는 함수
  const getDiariesForDate = (date) => {
    return diaries.filter(diary => 
      dayjs(diary.createdAt).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
    );
  };

  // 날짜 클릭 핸들러 수정
  const handleDateClick = (date) => {
    setSelectedDate(date);
    const filteredDiaries = getDiariesForDate(date);
    if (filteredDiaries.length > 0) {
      setSelectedDateDiaries(filteredDiaries);
      setShowDiaryPopup(true);
    }
  };

  // 페이지네이션된 일기 목록을 반환하는 함수
  const getPaginatedDiaries = () => {
    return diaries.slice(0, currentPage * itemsPerPage);
  };

  // 더보기 버튼 표시 여부
  const hasMoreDiaries = diaries.length > currentPage * itemsPerPage;

  // 더보기 버튼 클릭 핸들러
  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  // 스타일 설정 저장 함수
  const saveStyleSettings = async (newSettings) => {
    if (!finalUid) return;
    try {
      await setDoc(doc(db, 'users', finalUid, 'settings', 'diary'), newSettings, { merge: true });
      setStyleSettings(newSettings);
    } catch (error) {
      console.error('스타일 설정 저장 실패:', error);
    }
  };

  // 스타일 설정 불러오기
  useEffect(() => {
    const loadStyleSettings = async () => {
      if (!finalUid) return;
      try {
        const docRef = doc(db, 'users', finalUid, 'settings', 'diary');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStyleSettings(docSnap.data());
        }
      } catch (error) {
        console.error('스타일 설정 불러오기 실패:', error);
      }
    };
    loadStyleSettings();
  }, [finalUid]);

  // 스타일 설정 렌더링 함수 수정
  const renderColorSettings = () => {
    if (!pathname?.startsWith('/editor')) return null;  // 에디터 페이지에서만 표시

    const SHADOW_OPTIONS = [
      { value: 'none', label: '없음' },
      { value: 'sm', label: '약하게' },
      { value: 'md', label: '보통' },
      { value: 'lg', label: '강하게' },
      { value: 'retro', label: '레트로' },
      { value: 'retro-black', label: '레트로-블랙' },
      { value: 'retro-sky', label: '레트로-하늘' },
      { value: 'retro-gray', label: '레트로-회색' },
      { value: 'retro-white', label: '레트로-하얀' },
    ];

    return (
      <div className="w-full max-w-[1100px] mb-4">
        <button
          onClick={() => setShowColorSettings(!showColorSettings)}
          className="w-full p-2 rounded-lg mb-2 hover:bg-opacity-30 transition-all"
          style={{ 
            backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
            color: styleSettings.textColor 
          }}
        >
          다이어리 스타일 설정 {showColorSettings ? '닫기' : '열기'}
        </button>

        {showColorSettings && (
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
            <div>
              <label className="text-white text-sm mb-2 block">배경색</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={`bg-${color}`}
                    onClick={() => saveStyleSettings({ ...styleSettings, bgColor: color })}
                    className="w-8 h-8 rounded-full border border-white/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">텍스트 색상</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={`text-${color}`}
                    onClick={() => saveStyleSettings({ ...styleSettings, textColor: color })}
                    className="w-8 h-8 rounded-full border border-white/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">배경 투명도</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={styleSettings.bgOpacity ?? 0.2}
                onChange={(e) => saveStyleSettings({ ...styleSettings, bgOpacity: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">그림자 효과</label>
              <select
                value={styleSettings.shadow}
                onChange={(e) => saveStyleSettings({ ...styleSettings, shadow: e.target.value })}
                className="w-full p-2 rounded-lg bg-gray-700 text-white border border-gray-600"
              >
                {SHADOW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 일기 목록 표시 부분 수정
  const renderDiaryList = () => {
    return getPaginatedDiaries().map((diary) => (
      <div
        key={diary.id}
        onClick={() => handleDiaryClick(diary)}
        className={cn(
          "flex flex-col rounded-2xl overflow-hidden backdrop-blur-sm",
          styleSettings.shadow === 'none' && 'shadow-none',
          styleSettings.shadow === 'sm' && 'shadow-sm',
          styleSettings.shadow === 'md' && 'shadow',
          styleSettings.shadow === 'lg' && 'shadow-lg',
          styleSettings.shadow === 'retro' && 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
          styleSettings.shadow === 'retro-black' && 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
          styleSettings.shadow === 'retro-sky' && 'shadow-[8px_8px_0px_0px_rgba(2,132,199,1)]',
          styleSettings.shadow === 'retro-gray' && 'shadow-[8px_8px_0px_0px_rgba(107,114,128,1)]',
          styleSettings.shadow === 'retro-white' && 'shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]'
        )}
        style={{ 
          backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
          color: styleSettings.textColor,
          ...(styleSettings.shadow?.includes('retro') && { 
            border: styleSettings.shadow === 'retro-sky' ? '2px solid rgb(2 132 199)' :
                    styleSettings.shadow === 'retro-gray' ? '2px solid rgb(107 114 128)' :
                    styleSettings.shadow === 'retro-white' ? '2px solid rgb(255 255 255)' :
                    '2px solid rgb(0 0 0)'
          })
        }}
      >
        {/* 1번 row: 제목과 버튼들 */}
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold flex items-center gap-1" style={{ color: styleSettings.textColor }}>
              {diary.isPrivate && <Lock className="w-4 h-4" />}
              {diary.title}
            </h3>
            <span className="text-sm opacity-70" style={{ color: styleSettings.textColor }}>
              {renderAuthorInfo(diary)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(canEdit || isAuthor(diary)) && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingDiary(diary);
                  }}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(diary.id, diary.images);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleLikeClick(e, diary)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="w-4 h-4" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 2번 row: 내용 */}
        <div className="p-4 border-b border-white/10">
          <p className="opacity-80 line-clamp-3 whitespace-pre-wrap" style={{ color: styleSettings.textColor }}>
            {diary.content}
          </p>
        </div>

        {/* 3번 row: 이미지 */}
        {diary.images && diary.images.length > 0 && (
          <div className="p-4 border-b border-white/10">
            <div className="grid grid-cols-3 gap-2">
              {diary.images.slice(0, 3).map((imageUrl, index) => (
                <img
                  key={index}
                  src={imageUrl}
                  alt={`일기 이미지 ${index + 1}`}
                  className="w-full h-24 md:h-40 lg:h-48 object-cover rounded-lg"
                />
              ))}
              {diary.images.length > 3 && (
                <div className="relative h-24 md:h-40 lg:h-48">
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center" style={{ color: styleSettings.textColor }}>
                    +{diary.images.length - 3}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4번 row: 날짜 */}
        <div className="p-4 text-sm opacity-70" style={{ color: styleSettings.textColor }}>
          {dayjs(diary.createdAt).locale('ko').format('YY년 MM월 DD일 HH:mm')}
        </div>
      </div>
    ));
  };

  // 일기 목록이 변경될 때마다 username 가져오기
  useEffect(() => {
    const loadUsernames = async () => {
      if (!diaries.length) return;

      const uniqueUids = [...new Set(diaries.map(diary => diary.authorUid).filter(Boolean))];
      
      // 모든 UID에 대해 동시에 username 가져오기
      const promises = uniqueUids.map(uid => fetchUsername(uid));
      await Promise.all(promises);
    };

    loadUsernames();
  }, [diaries]);

  return (
    <div className='pt-5 md:flex md:flex-col md:items-center md:justify-center md:w-full px-2'>
      {renderColorSettings()}
      {/* 일기장 제목 */}
      <div className="w-full max-w-[1100px] space-y-6 mt-8">
        <div 
          className={cn(
            "relative flex items-center justify-center text-[21px] font-bold w-full rounded-2xl p-4 backdrop-blur-sm tracking-tight",
            styleSettings.shadow === 'none' && 'shadow-none',
            styleSettings.shadow === 'sm' && 'shadow-sm',
            styleSettings.shadow === 'md' && 'shadow',
            styleSettings.shadow === 'lg' && 'shadow-lg',
            styleSettings.shadow === 'retro' && 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
            styleSettings.shadow === 'retro-black' && 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
            styleSettings.shadow === 'retro-sky' && 'shadow-[8px_8px_0px_0px_rgba(2,132,199,1)]',
            styleSettings.shadow === 'retro-gray' && 'shadow-[8px_8px_0px_0px_rgba(107,114,128,1)]',
            styleSettings.shadow === 'retro-white' && 'shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]'
          )}
          style={{ 
            backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
            color: styleSettings.textColor,
            ...(styleSettings.shadow?.includes('retro') && { 
              border: styleSettings.shadow === 'retro-sky' ? '2px solid rgb(2 132 199)' :
                      styleSettings.shadow === 'retro-gray' ? '2px solid rgb(107 114 128)' :
                      styleSettings.shadow === 'retro-white' ? '2px solid rgb(255 255 255)' :
                      '2px solid rgb(0 0 0)'
            })
          }}
        >
          <HeaderDrawer uid={finalUid}>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (canWrite) {
                  setIsWriting(true);
                }
              }}
              className="absolute left-4 p-2 rounded-lg hover:bg-opacity-30 transition-all"
              style={{ 
                backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                color: styleSettings.textColor 
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </HeaderDrawer>
          일기장
          <HeaderDrawer uid={finalUid}>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (canWrite) {
                  setIsWriting(true);
                }
              }}
              className="absolute right-4 p-2 rounded-lg hover:bg-opacity-30 transition-all"
              style={{ 
                backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                color: styleSettings.textColor 
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </HeaderDrawer>
        </div>

        {/* 달력 섹션 - 주간 뷰로 변경 */}
        <div className="w-full max-w-[1200px] mb-4">
          <div 
            className={cn(
              "rounded-3xl p-4 shadow-lg backdrop-blur-sm",
              styleSettings.shadow === 'none' && 'shadow-none',
              styleSettings.shadow === 'sm' && 'shadow-sm',
              styleSettings.shadow === 'md' && 'shadow',
              styleSettings.shadow === 'lg' && 'shadow-lg',
              styleSettings.shadow === 'retro' && 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
              styleSettings.shadow === 'retro-black' && 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
              styleSettings.shadow === 'retro-sky' && 'shadow-[8px_8px_0px_0px_rgba(2,132,199,1)]',
              styleSettings.shadow === 'retro-gray' && 'shadow-[8px_8px_0px_0px_rgba(107,114,128,1)]',
              styleSettings.shadow === 'retro-white' && 'shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]'
            )}
            style={{ 
              backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
              color: styleSettings.textColor,
              ...(styleSettings.shadow?.includes('retro') && { 
                border: styleSettings.shadow === 'retro-sky' ? '2px solid rgb(2 132 199)' :
                        styleSettings.shadow === 'retro-gray' ? '2px solid rgb(107 114 128)' :
                        styleSettings.shadow === 'retro-white' ? '2px solid rgb(255 255 255)' :
                        '2px solid rgb(0 0 0)'
              })
            }}
          >
            {/* 주 선택 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={handlePrevWeek} 
                className="p-2 rounded-xl hover:bg-opacity-30 transition-all"
                style={{ 
                  backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
                  color: styleSettings.textColor 
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-bold" style={{ color: styleSettings.textColor }}>
                {currentWeek.format('YY년 MM월')}
              </h2>
              <button 
                onClick={handleNextWeek} 
                className="p-2 rounded-xl hover:bg-opacity-30 transition-all"
                style={{ 
                  backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
                  color: styleSettings.textColor 
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* 주간 달력 그리드 */}
            <div className="grid grid-cols-7 gap-1">
              {weekDates.map((date, idx) => {
                const isToday = date.isSame(dayjs(), 'day');
                const isSelected = date.isSame(selectedDate, 'day');
                const dayDiaries = diaries.filter(diary => 
                  dayjs(diary.createdAt).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
                );
                const hasDiary = dayDiaries.length > 0;
                const isSunday = idx === 0;
                const isSaturday = idx === 6;

                return (
                  <button
                    key={date.format('YYYY-MM-DD')}
                    onClick={() => handleDateClick(date)}
                    className={`
                      relative aspect-square p-1 rounded-lg flex flex-col items-center justify-center
                      hover:bg-opacity-40 transition-all text-lg
                      ${isSelected ? 'ring-2' : ''}
                      ${isToday ? 'font-bold' : ''}
                    `}
                    style={{
                      backgroundColor: isSunday ? 'rgba(239, 68, 68, 0.3)' :
                                    isSaturday ? 'rgba(96, 165, 250, 0.4)' :
                                    `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
                      color: styleSettings.textColor,
                      ringColor: styleSettings.textColor
                    }}
                  >
                    <span>
                      {date.date()}
                    </span>
                    {hasDiary && (
                      <span className="text-sm px-2 py-1 rounded-full mt-1"
                        style={{
                          backgroundColor: 'rgba(234, 179, 8, 0.7)',
                          color: '#FFFFFF'
                        }}>
                        {dayDiaries.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 일기 작성 폼 */}
        {isWriting && (
          <form onSubmit={handleSubmit} className="space-y-4 bg-blue-500/20 p-6 rounded-2xl shadow-lg backdrop-blur-sm">
            <div className="flex justify-between items-center">
              <input
                type="text"
                value={newDiary.title}
                onChange={(e) => setNewDiary(prev => ({ ...prev, title: e.target.value }))}
                placeholder="제목"
                className="flex-1 p-3 bg-blue-500/20 rounded-xl focus:ring-2 focus:ring-blue-400 border-none text-white placeholder-white/50"
              />
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setNewDiary(prev => ({ ...prev, isPrivate: !prev.isPrivate }));
                }}
                className={`ml-4 p-3 rounded-xl transition-all ${
                  newDiary.isPrivate 
                  ? 'bg-red-500/20 text-white hover:bg-red-500/30' 
                  : 'bg-green-500/20 text-white hover:bg-green-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {newDiary.isPrivate ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                  <span className="text-sm font-medium">
                    {newDiary.isPrivate ? '비공개' : '공개'}
                  </span>
                </div>
              </Button>
            </div>
            <textarea
              value={newDiary.content}
              onChange={(e) => setNewDiary(prev => ({ ...prev, content: e.target.value }))}
              placeholder="내용을 입력하세요..."
              className="w-full h-48 p-3 bg-blue-500/20 rounded-xl focus:ring-2 focus:ring-blue-400 border-none resize-none text-white placeholder-white/50"
            />
            
            {/* 이미지 업로드 섹션 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <div className="px-4 py-2 bg-blue-500/20 text-white rounded-xl hover:bg-blue-500/30 transition-all flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    사진 첨부
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                  />
                </label>
                {uploadingImages && <span className="text-white">업로드 중...</span>}
              </div>
              
              {/* 선택된 이미지 미리보기 */}
              {selectedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {selectedImages.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`미리보기 ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => {
                  setNewDiary({ title: '', content: '', isPrivate: false, images: [] });
                  setSelectedImages([]);
                  setIsWriting(false);
                }}
                className="px-6 py-2 bg-blue-500/20 text-white rounded-xl hover:bg-blue-500/30"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={uploadingImages}
                className="px-6 py-2 bg-blue-500/30 text-white rounded-xl hover:bg-blue-500/40 disabled:opacity-50"
              >
                저장
              </Button>
            </div>
          </form>
        )}

        {/* 일기 수정 폼 */}
        {editingDiary && (
          <form onSubmit={handleEdit} className="space-y-4 bg-blue-500/20 p-6 rounded-2xl shadow-lg backdrop-blur-sm">
            <div className="flex justify-between items-center">
              <input
                type="text"
                value={editingDiary.title}
                onChange={(e) => setEditingDiary(prev => ({ ...prev, title: e.target.value }))}
                placeholder="제목"
                className="flex-1 p-3 bg-blue-500/20 rounded-xl focus:ring-2 focus:ring-blue-400 border-none text-white placeholder-white/50"
              />
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setEditingDiary(prev => ({ ...prev, isPrivate: !prev.isPrivate }));
                }}
                className={`ml-4 p-3 rounded-xl transition-all ${
                  editingDiary.isPrivate 
                  ? 'bg-red-500/20 text-white hover:bg-red-500/30' 
                  : 'bg-green-500/20 text-white hover:bg-green-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {editingDiary.isPrivate ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                  <span className="text-sm font-medium">
                    {editingDiary.isPrivate ? '비공개' : '공개'}
                  </span>
                </div>
              </Button>
            </div>
            <textarea
              value={editingDiary.content}
              onChange={(e) => setEditingDiary(prev => ({ ...prev, content: e.target.value }))}
              placeholder="내용을 입력하세요..."
              className="w-full h-48 p-3 bg-blue-500/20 rounded-xl focus:ring-2 focus:ring-blue-400 border-none resize-none text-white placeholder-white/50"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => setEditingDiary(null)}
                className="px-6 py-2 bg-blue-500/20 text-white rounded-xl hover:bg-blue-500/30"
              >
                취소
              </Button>
              <Button
                type="submit"
                className="px-6 py-2 bg-blue-500/30 text-white rounded-xl hover:bg-blue-500/40"
              >
                수정
              </Button>
            </div>
          </form>
        )}

        {/* 일기 목록 */}
        <div className="space-y-4 max-w-[1200px]">
          {diaries.length === 0 ? (
            <div className="p-6 bg-blue-500/20 rounded-2xl shadow-md text-center text-white backdrop-blur-sm">
              등록된 일기가 없습니다.
            </div>
          ) : (
            <>
              {renderDiaryList()}

              {/* 더보기 버튼 */}
              {hasMoreDiaries && (
                <div className="flex justify-center mt-6">
                  <Button
                    onClick={handleLoadMore}
                    className="px-6 py-2 bg-blue-500/30 text-white rounded-xl hover:bg-blue-500/40"
                  >
                    더보기
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 일기 상세 보기 모달 */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span>{selectedDiary?.title}</span>
                  <span className="text-sm text-gray-500">
                    작성자: {selectedDiary ? renderAuthorInfo(selectedDiary) : ''}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {selectedDiary?.createdAt && dayjs(selectedDiary.createdAt).locale('ko').format('YYYY년 MM월 DD일')}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <p className="text-gray-700 whitespace-pre-wrap">
                {selectedDiary?.content}
              </p>
              
              {/* 이미지 갤러리 */}
              {selectedDiary?.images && selectedDiary.images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {selectedDiary.images.map((imageUrl, index) => (
                    <img
                      key={index}
                      src={imageUrl}
                      alt={`일기 이미지 ${index + 1}`}
                      className="w-full rounded-lg"
                    />
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* 공감하기 모달 */}
        <Dialog open={likeModalOpen} onOpenChange={setLikeModalOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>공감하기</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <p className="text-gray-700 whitespace-pre-wrap mb-6">
                {selectedDiary?.content}
              </p>
              {selectedDiary?.images && selectedDiary.images.length > 0 && (
                <div className="mb-6 grid grid-cols-2 gap-2">
                  {selectedDiary.images.map((imageUrl, index) => (
                    <img
                      key={index}
                      src={imageUrl}
                      alt={`일기 이미지 ${index + 1}`}
                      className="w-full rounded-lg"
                    />
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4">
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleLike}
                  disabled={isLiking || !selectedCategory}
                  className="flex-1 bg-violet-500 hover:bg-violet-600 text-white"
                >
                  {isLiking ? '저장 중...' : '공감하기'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 공감 완료 모달 */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="sm:max-w-[400px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>공감이 저장되었습니다</DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <p className="text-gray-600">
                공감 한 조각 페이지에서 확인하시겠습니까?
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowSuccessModal(false)}
                >
                  닫기
                </Button>
                <Button
                  className="bg-violet-500 hover:bg-violet-600 text-white"
                  onClick={() => {
                    setShowSuccessModal(false);
                    router.push('/likes/all');
                  }}
                >
                  공감 한 조각으로 이동
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 이미지 크롭 모달 */}
        <Dialog open={!!croppingImage} onOpenChange={() => {
          setCroppingImage(null);
          setCroppingImageUrl('');
          setCrop(undefined);
          setCompletedCrop(undefined);
        }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>이미지 자르기</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {croppingImageUrl && (
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={16 / 9}
                >
                  <img
                    ref={imgRef}
                    alt="크롭할 이미지"
                    src={croppingImageUrl}
                    onLoad={onImageLoad}
                  />
                </ReactCrop>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setCroppingImage(null);
                  setCroppingImageUrl('');
                  setCrop(undefined);
                  setCompletedCrop(undefined);
                }}
                className="bg-blue-500/20 text-white hover:bg-blue-500/30"
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleCropComplete}
                className="bg-blue-500/30 text-white hover:bg-blue-500/40"
                disabled={!completedCrop}
              >
                적용
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 일기 팝업 모달 */}
        <Dialog open={showDiaryPopup} onOpenChange={setShowDiaryPopup}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto bg-gray-300">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {selectedDate?.format('YYYY년 MM월 DD일')}의 일기
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedDateDiaries.map((diary) => (
                <div
                  key={diary.id}
                  className="bg-blue-500/30 p-4 rounded-xl backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      {diary.isPrivate && <Lock className="w-4 h-4" />}
                      {diary.title}
                    </h3>
                    <span className="text-sm text-white/70">
                      {dayjs(diary.createdAt).format('HH:mm')}
                    </span>
                  </div>
                  <p className="text-white/90 whitespace-pre-wrap">{diary.content}</p>
                  
                  {/* 이미지가 있는 경우 표시 */}
                  {diary.images && diary.images.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {diary.images.map((imageUrl, index) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt={`일기 이미지 ${index + 1}`}
                          className="w-full rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                  {/* 수정/삭제 버튼 */}
                  {(canEdit || isAuthor(diary)) && (
                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        onClick={() => {
                          setEditingDiary(diary);
                          setShowDiaryPopup(false);
                        }}
                        className="p-2 bg-blue-500/30 text-white rounded-lg hover:bg-blue-500/40"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          handleDelete(diary.id, diary.images);
                          setShowDiaryPopup(false);
                        }}
                        className="p-2 bg-red-500/30 text-white rounded-lg hover:bg-red-500/40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Diary; 