'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import app from '@/firebase';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Plus, X, Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { cn } from '@/lib/utils';

const db = getFirestore(app);
const storage = getStorage(app);

const COLOR_PALETTE = [
  'transparent',
  '#000000', '#FFFFFF', '#F87171', '#FBBF24',
  '#34D399', '#60A5FA', '#A78BFA', '#F472B6',
];

const ImageCarousel = ({ username, uid }) => {
  const pathname = usePathname();
  const isEditable = pathname ? pathname.startsWith('/editor') : false;
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [caption, setCaption] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [carouselTitle, setCarouselTitle] = useState('미디어');
  const [editingCarouselTitle, setEditingCarouselTitle] = useState(false);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [styleSettings, setStyleSettings] = useState({
    bgColor: '#60A5FA',
    textColor: '#FFFFFF',
    bgOpacity: 0.2,
    shadow: 'none',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    rounded: 'md'
  });

  const { currentUser } = useSelector((state) => state.user);
  const finalUid = uid ?? currentUser?.uid;
  const userRole = currentUser?.uid;
  const canEdit = isEditable && finalUid === userRole;

  useEffect(() => {
    if (!finalUid) return;

    const q = query(
      collection(db, 'users', finalUid, 'carousel'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const imageList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setImages(imageList);
    });

    return () => unsubscribe();
  }, [finalUid]);

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  // 이미지 크롭을 위한 캔버스 업데이트 함수
  const updateCanvasPreview = (crop, completedCrop, imgRef, previewCanvasRef) => {
    if (!completedCrop || !previewCanvasRef.current || !imgRef.current) return;

    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );
  };

  useEffect(() => {
    if (completedCrop) {
      updateCanvasPreview(crop, completedCrop, imgRef, previewCanvasRef);
    }
  }, [completedCrop]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !canEdit) return;

    if (images.length >= 10) {
      alert('최대 10장까지만 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 체크 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    // 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async () => {
    if (!completedCrop || !previewCanvasRef.current) return;

    try {
      setUploading(true);

      // 캔버스를 Blob으로 변환
      const canvas = previewCanvasRef.current;
      const blob = await new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
      });

      if (!blob) throw new Error('캔버스를 이미지로 변환하는데 실패했습니다.');

      // 파일명 생성
      const fileName = selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const storageRef = ref(storage, `carousel/${finalUid}/${Date.now()}_${fileName}`);

      // Storage에 업로드
      const snapshot = await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(snapshot.ref);

      // Firestore에 문서 추가
      await addDoc(collection(db, 'users', finalUid, 'carousel'), {
        url,
        caption: '',
        title: '',
        description: '',
        link: '',
        createdAt: new Date(),
        storagePath: snapshot.ref.fullPath,
      });

      // 상태 초기화
      setIsCropping(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCrop(undefined);
      setCompletedCrop(null);
      setUploading(false);
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
      setUploading(false);
    }
  };

  const handleDelete = async (image, e) => {
    if (!canEdit) return;
    e?.preventDefault();
    e?.stopPropagation();

    if (!window.confirm('삭제하시겠습니까?')) return;

    try {
      // Firestore에서 문서 삭제
      await deleteDoc(doc(db, 'users', finalUid, 'carousel', image.id));
      
      // 일반 이미지인 경우에만 Storage에서 파일 삭제
      if (image.storagePath && (!image.type || image.type === 'image')) {
        try {
      const imageRef = ref(storage, image.storagePath);
      await deleteObject(imageRef);
        } catch (storageError) {
          console.warn('Storage 파일 삭제 실패:', storageError);
        }
      }

      // 현재 인덱스 조정
      if (currentIndex >= images.length - 1) {
        setCurrentIndex(Math.max(0, images.length - 2));
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
    setCaption(image.caption || '');
    setTitle(image.title || '');
    setDescription(image.description || '');
    setLink(image.link || '');
    setModalOpen(true);
  };

  const handleCaptionSave = () => {
    setSaveDialogOpen(true);
  };

  const confirmSave = async () => {
    if (!selectedImage || !canEdit) return;

    try {
      await updateDoc(doc(db, 'users', finalUid, 'carousel', selectedImage.id), {
        caption: caption,
        title: title,
        description: description,
        link: link
      });
      setEditingCaption(false);
      setSaveDialogOpen(false);
      setModalOpen(false);
    } catch (error) {
      console.error('정보 수정 실패:', error);
      alert('정보 수정에 실패했습니다.');
      setSaveDialogOpen(false);
    }
  };

  // 대표사진 문구 저장 함수
  const handleCarouselTitleSave = async () => {
    if (!canEdit) return;
    try {
      const docRef = doc(db, 'users', finalUid, 'settings', 'carousel');
      await setDoc(docRef, { carouselTitle }, { merge: true });
      setEditingCarouselTitle(false);
    } catch (error) {
      console.error('제목 저장 실패:', error);
      alert('제목 저장에 실패했습니다.');
    }
  };

  // 대표사진 문구 불러오기
  useEffect(() => {
    const fetchCarouselTitle = async () => {
      if (!finalUid) return;
      try {
        const docRef = doc(db, 'users', finalUid, 'settings', 'carousel');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().carouselTitle) {
          setCarouselTitle(docSnap.data().carouselTitle);
        }
      } catch (error) {
        console.error('제목 불러오기 실패:', error);
      }
    };
    fetchCarouselTitle();
  }, [finalUid]);

  // 스타일 설정 저장 함수
  const saveStyleSettings = async (newSettings) => {
    if (!finalUid) return;
    try {
      await setDoc(doc(db, 'users', finalUid, 'settings', 'carousel'), newSettings, { merge: true });
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
        const docRef = doc(db, 'users', finalUid, 'settings', 'carousel');
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

  const handleYoutubeUpload = async () => {
    if (!youtubeUrl || !canEdit) return;

    try {
      setUploading(true);

      // YouTube URL 정규화 및 videoId 추출
      let videoId = '';
      const url = youtubeUrl.trim();

      // 다양한 YouTube URL 형식 처리
      if (url.includes('youtu.be/')) {
        // 단축 URL (예: https://youtu.be/VIDEO_ID)
        videoId = url.split('youtu.be/')[1]?.split(/[#?]/)[0];
      } else if (url.includes('youtube.com/watch')) {
        // 일반 URL (예: https://www.youtube.com/watch?v=VIDEO_ID)
        videoId = url.split('v=')[1]?.split('&')[0];
      } else if (url.includes('youtube.com/embed/')) {
        // 임베드 URL (예: https://www.youtube.com/embed/VIDEO_ID)
        videoId = url.split('embed/')[1]?.split(/[#?]/)[0];
      } else if (url.includes('youtube.com/shorts/')) {
        // Shorts URL (예: https://www.youtube.com/shorts/VIDEO_ID)
        videoId = url.split('shorts/')[1]?.split(/[#?]/)[0];
      }
      
      if (!videoId) {
        alert('올바른 YouTube URL을 입력해주세요.');
        setUploading(false);
        return;
      }

      // 기본 썸네일 URL 사용
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      // 영상 제목 추출 시도
      let videoTitle = '';
      try {
        const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        const data = await response.json();
        videoTitle = data.title || '';
      } catch (error) {
        console.warn('영상 제목을 가져오는데 실패했습니다:', error);
      }

      // Firestore에 문서 추가
      await addDoc(collection(db, 'users', finalUid, 'carousel'), {
        url: thumbnailUrl,
        youtubeId: videoId,
        type: 'youtube',
        title: videoTitle || '유튜브 영상',
        description: '',
        link: `https://www.youtube.com/watch?v=${videoId}`,
        createdAt: new Date(),
      });

      // 상태 초기화
      setYoutubeUrl('');
      setShowYoutubeInput(false);
      setUploading(false);
    } catch (error) {
      console.error('YouTube 영상 업로드 실패:', error);
      alert('YouTube 영상 업로드에 실패했습니다.');
      setUploading(false);
    }
  };

  const renderColorSettings = () => {
    if (!pathname?.startsWith('/editor')) return null;

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
          캐러셀 스타일 설정 {showColorSettings ? '닫기' : '열기'}
        </button>

        {showColorSettings && (
          <div className="flex flex-col gap-4 bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-700">
            {/* 1. 배경색 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">배경색</span>
                <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      onClick={() => saveStyleSettings({ ...styleSettings, bgColor: color })}
                      className={cn(
                        "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                        styleSettings.bgColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">투명도</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={styleSettings.bgOpacity ?? 0.2}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, bgOpacity: parseFloat(e.target.value) })}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-100 w-12 text-right">
                  {(styleSettings.bgOpacity ?? 0.2).toFixed(1)}
                </span>
              </div>
            </div>

            {/* 2. 텍스트 색상 설정 */}
            <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-100 w-24">텍스트</span>
              <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={`text-${color}`}
                    onClick={() => saveStyleSettings({ ...styleSettings, textColor: color })}
                    className={cn(
                      "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                      styleSettings.textColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* 3. 그림자 색상 설정 */}
            <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">그림자</span>
                <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={`shadow-${color}`}
                      onClick={() => saveStyleSettings({ ...styleSettings, shadowColor: color })}
                      className={cn(
                        "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                        styleSettings.shadowColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">투명도</span>
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

            {/* 4. 모서리와 그림자 스타일 설정 */}
            <div className="flex flex-col gap-4 bg-gray-700/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100 w-24">모서리</span>
                <select
                  value={styleSettings.rounded || 'md'}
                  onChange={(e) => saveStyleSettings({ ...styleSettings, rounded: e.target.value })}
                  className="px-3 py-1.5 bg-gray-800 text-gray-100 rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
                >
                  <option value="none">각진</option>
                  <option value="sm">약간 둥근</option>
                  <option value="md">둥근</option>
                  <option value="lg">많이 둥근</option>
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
                  <option value="retro">레트로</option>
                  <option value="float">플로팅</option>
                  <option value="glow">글로우</option>
                  <option value="inner">이너</option>
                  <option value="sharp">샤프</option>
                  <option value="soft">소프트</option>
                  <option value="stripe">스트라이프</option>
                  <option value="cross">크로스</option>
                  <option value="diagonal">대각선</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center justify-center px-2">
      <div className="w-full max-w-[1100px] mx-auto space-y-4 mt-8">
        {renderColorSettings()}
        <div 
          className={cn(
            "w-full p-6 space-y-6 rounded-2xl backdrop-blur-sm mt-8",
            styleSettings.rounded === 'none' && 'rounded-none',
            styleSettings.rounded === 'sm' && 'rounded',
            styleSettings.rounded === 'md' && 'rounded-lg',
            styleSettings.rounded === 'lg' && 'rounded-xl',
            styleSettings.rounded === 'full' && 'rounded-full',
          )}
          style={{ 
            backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.2) * 255).toString(16).padStart(2, '0')}`,
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
                case 'retro':
                  return `8px 8px 0px 0px ${shadowColor}`;
                case 'float':
                  return `0 10px 20px -5px ${shadowColor}`;
                case 'glow':
                  return `0 0 20px ${shadowColor}`;
                case 'inner':
                  return `inset 0 2px 4px ${shadowColor}`;
                case 'sharp':
                  return `-10px 10px 0px ${shadowColor}`;
                case 'soft':
                  return `0 5px 15px ${shadowColor}`;
                case 'stripe':
                  return `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}`;
                case 'cross':
                  return `4px 4px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, 4px -4px 0 ${shadowColor}, -4px 4px 0 ${shadowColor}`;
                case 'diagonal':
                  return `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, -8px -8px 0 ${shadowColor}, -12px -12px 0 ${shadowColor}`;
                default:
                  return 'none';
              }
            })(),
            borderColor: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? styleSettings.shadowColor || '#000000' : undefined,
            borderWidth: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? '2px' : undefined,
            borderStyle: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(styleSettings.shadow || '') ? 'solid' : undefined,
          }}
        >
          {/* 상단 컨트롤 */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              {editingCarouselTitle ? (
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={carouselTitle}
                    onChange={(e) => setCarouselTitle(e.target.value)}
                    className="text-xl font-semibold rounded-xl px-4 py-2"
                    style={{ 
                      backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                      color: styleSettings.textColor 
                    }}
                    onBlur={handleCarouselTitleSave}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCarouselTitleSave();
                      }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleCarouselTitleSave}
                    className="p-2 rounded-xl hover:bg-opacity-30 transition-all"
                    style={{ 
                      backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                      color: styleSettings.textColor 
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div 
                    className="px-4 py-2 rounded-xl hover:bg-opacity-30 transition-all"
                    style={{ 
                      backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                      color: styleSettings.textColor 
                    }}
                  >
                    <h2 className="text-xl font-semibold">
                      {carouselTitle}
                    </h2>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => setEditingCarouselTitle(true)}
                      className="p-2 rounded-xl hover:bg-opacity-30 transition-all"
                      style={{ 
                        backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                        color: styleSettings.textColor 
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {canEdit && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="p-2 rounded-xl hover:bg-opacity-30 transition-all cursor-pointer"
                    style={{ 
                      backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                      color: styleSettings.textColor 
                    }}
                  >
                    <Plus className="w-5 h-5" />
                  </label>
                  <button
                    onClick={() => setShowYoutubeInput(!showYoutubeInput)}
                    className="p-2 rounded-xl hover:bg-opacity-30 transition-all"
                    style={{ 
                      backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                      color: styleSettings.textColor 
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                    </svg>
                  </button>
                </>
              )}
              <button
                onClick={handlePrevious}
                className="p-2 rounded-xl hover:bg-opacity-30 transition-all"
                style={{ 
                  backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                  color: styleSettings.textColor 
                }}
                disabled={images.length < 2}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="p-2 rounded-xl hover:bg-opacity-30 transition-all"
                style={{ 
                  backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                  color: styleSettings.textColor 
                }}
                disabled={images.length < 2}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 메인 캐러셀 */}
          <div className="w-full mb-8">
            {/* 모바일 뷰 - 한 장씩 */}
            <div className="md:hidden w-full space-y-6">
              {images.length > 0 ? (
                <div className="space-y-6">
                  <div 
                    className="relative rounded-xl overflow-hidden shadow-lg aspect-video cursor-pointer group"
                    style={{ 
                      backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                      color: styleSettings.textColor 
                    }}
                    onClick={() => handleImageClick(images[currentIndex])}
                  >
                    {images[currentIndex]?.type === 'youtube' && (
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                        <div className="w-16 h-16 md:w-20 md:h-20 relative">
                          <div className="absolute inset-0 bg-red-600 rounded-full opacity-90"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-0 h-0 border-y-[12px] border-y-transparent border-l-[20px] border-l-white ml-2"></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <Image
                      src={images[currentIndex]?.url}
                      alt={images[currentIndex]?.title || '이미지'}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                      priority
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                      <h3 className="text-lg font-semibold text-white">
                        {images[currentIndex]?.title || '제목 없음'}
                      </h3>
                      <p className="text-sm text-white/80">
                        {images[currentIndex]?.description || '설명 없음'}
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={(e) => handleDelete(images[currentIndex], e)}
                        className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-all z-20"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div 
                  className="relative rounded-xl overflow-hidden shadow-lg aspect-[4/3]"
                  style={{ 
                    backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                    color: styleSettings.textColor 
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-60">
                    이미지를 추가해주세요
                  </div>
                </div>
              )}
            </div>

            {/* 데스크톱 뷰 - 3장씩 */}
            <div className="hidden md:grid md:grid-cols-3 gap-6">
              {[0, 1, 2].map((offset) => {
                const imageIndex = (currentIndex + offset) % images.length;
                const image = images[imageIndex];
                
                return (
                  <div 
                    key={offset} 
                    className="relative rounded-xl overflow-hidden shadow-lg aspect-video group cursor-pointer"
                    style={{ 
                      backgroundColor: `${styleSettings.bgColor}${Math.round((styleSettings.bgOpacity || 0.3) * 255).toString(16).padStart(2, '0')}`,
                      color: styleSettings.textColor 
                    }}
                    onClick={() => handleImageClick(image)}
                  >
                    {image ? (
                      <>
                        {image.type === 'youtube' && (
                          <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                            <div className="w-16 h-16 relative">
                              <div className="absolute inset-0 bg-red-600 rounded-full opacity-90"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-0 h-0 border-y-[12px] border-y-transparent border-l-[20px] border-l-white ml-2"></div>
                              </div>
                            </div>
                          </div>
                        )}
                        <Image
                          src={image.url}
                          alt={image.title || '이미지'}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover"
                          priority
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <h3 className="text-sm font-semibold text-white truncate">
                            {image.title || '제목 없음'}
                          </h3>
                          <p className="text-xs text-white/80 line-clamp-2">
                            {image.description || '설명 없음'}
                          </p>
                        </div>
                        {canEdit && (
                          <button
                            onClick={(e) => handleDelete(image, e)}
                            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100 z-20"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-60">
                        이미지를 추가해주세요
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 크롭 모달 */}
          {isCropping && (
            <Dialog open={isCropping} onOpenChange={setIsCropping}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>이미지 자르기</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={4/3}
                  >
                    <img
                      ref={imgRef}
                      src={previewUrl}
                      alt="크롭할 이미지"
                      style={{ maxWidth: '100%' }}
                    />
                  </ReactCrop>
                  <canvas
                    ref={previewCanvasRef}
                    style={{ display: 'none' }}
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCropping(false);
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      onClick={handleCropComplete}
                      disabled={!completedCrop || uploading}
                    >
                      {uploading ? '업로드 중...' : '확인'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* 이미지/영상 상세 모달 */}
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedImage?.type === 'youtube' ? '유튜브 영상' : '이미지 상세'}</DialogTitle>
              </DialogHeader>
              {selectedImage && (
                <div className="space-y-4">
                  {selectedImage.type === 'youtube' ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                      <iframe
                        src={`https://www.youtube.com/embed/${selectedImage.youtubeId}?autoplay=1`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="relative aspect-video rounded-lg overflow-hidden">
                    <Image
                      src={selectedImage.url}
                        alt={selectedImage.title || '이미지'}
                      fill
                      className="object-cover"
                    />
                  </div>
                  )}
                  {canEdit ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full p-2 rounded border"
                          placeholder="대표 문구를 입력하세요"
                        />
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full p-2 rounded border"
                          placeholder="설명을 입력하세요"
                          rows={3}
                        />
                        {!selectedImage.type && (
                        <input
                          type="url"
                          value={link}
                          onChange={(e) => setLink(e.target.value)}
                          className="w-full p-2 rounded border"
                          placeholder="링크를 입력하세요"
                        />
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button onClick={handleCaptionSave}>저장</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">{selectedImage.title || '제목 없음'}</h3>
                      <p className="text-sm text-gray-600">{selectedImage.description || '설명 없음'}</p>
                      {selectedImage.link && !selectedImage.type && (
                        <a
                          href={selectedImage.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:text-blue-600"
                        >
                          자세히 보기
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* 저장 확인 다이얼로그 */}
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogContent 
              className="sm:max-w-[425px]"
              aria-describedby="save-dialog-description"
            >
              <DialogHeader>
                <DialogTitle>이미지 설명 저장</DialogTitle>
                <DialogDescription id="save-dialog-description">
                  변경된 이미지 설명을 저장하시겠습니까?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSaveDialogOpen(false)}
                >
                  취소
                </Button>
                <Button
                  onClick={confirmSave}
                >
                  저장
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* YouTube URL 입력 모달 */}
          <Dialog open={showYoutubeInput} onOpenChange={setShowYoutubeInput}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>YouTube 영상 추가</DialogTitle>
                <DialogDescription>
                  YouTube 영상 URL을 입력해주세요.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full p-2 rounded border"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowYoutubeInput(false);
                      setYoutubeUrl('');
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    onClick={handleYoutubeUpload}
                    disabled={!youtubeUrl || uploading}
                  >
                    {uploading ? '업로드 중...' : '추가'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default ImageCarousel; 