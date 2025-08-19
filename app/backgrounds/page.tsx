'use client';

import { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, setDoc, deleteField, addDoc } from 'firebase/firestore';
import { storage } from '@/lib/firebase'; // storage 추가
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // ref, uploadBytes, getDownloadURL 추가
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Header from '@/components/Header';
import { useSelector } from 'react-redux';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Background {
  id: string;
  type: 'image' | 'youtube' | 'pixabay';
  url: string;
  title: string;
}

interface UserBackground {
  type: 'image' | 'youtube' | 'pixabay' | 'custom' | 'color' | 'gradient' | 'video' | 'none';
  url?: string;
  color?: string;
  gradient?: {
    color1: string;
    color2: string;
    direction: string;
  };
}

interface NewBackground {
  title: string;
  type: 'image' | 'youtube' | 'pixabay';
  url: string;
  isActive: boolean;
  file?: File | null;
}

interface MetaData {
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
}

export default function BackgroundGallery() {
  const router = useRouter();
  const toast = useToast();
  const { currentUser } = useSelector((state: any) => state.user);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'all' | 'image' | 'video' | 'color'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // 현재 배경 설정 관련 상태
  const [currentBackground, setCurrentBackground] = useState<UserBackground | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [gradientColor1, setGradientColor1] = useState('#ffffff');
  const [gradientColor2, setGradientColor2] = useState('#000000');
  const [gradientDirection, setGradientDirection] = useState('to bottom');
  const [backgroundType, setBackgroundType] = useState<'url' | 'color' | 'gradient'>('url');
  const [saving, setSaving] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  
  // 관리자 관련 상태
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newBackground, setNewBackground] = useState<NewBackground>({
    title: '',
    type: 'image',
    url: '',
    isActive: true,
    file: null
  });

  const [metadata, setMetadata] = useState<MetaData>({
    title: '',
    description: '',
    keywords: [],
    ogImage: ''
  });
  
  const [ogImageFile, setOgImageFile] = useState<File | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string>('');
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 100,
    height: 100,
    x: 0,
    y: 0
  });
  const imgRef = useRef<HTMLImageElement>(null);

  const gradientDirections = [
    { value: 'to right', label: '→ 왼쪽에서 오른쪽' },
    { value: 'to left', label: '← 오른쪽에서 왼쪽' },
    { value: 'to bottom', label: '↓ 위에서 아래' },
    { value: 'to top', label: '↑ 아래서 위' },
    { value: 'to bottom right', label: '↘ 대각선 (좌상단 → 우하단)' },
    { value: 'to bottom left', label: '↙ 대각선 (우상단 → 좌하단)' },
    { value: 'to top right', label: '↗ 대각선 (좌하단 → 우상단)' },
    { value: 'to top left', label: '↖ 대각선 (우하단 → 좌상단)' },
  ];

  // 애니메이션 상태 추가
  const [isAnimationEnabled, setIsAnimationEnabled] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }

    const q = query(
      collection(db, 'backgrounds'),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const backgroundsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Background[];
      setBackgrounds(backgroundsData);
      setLoading(false);
    });

    // 현재 배경 설정 가져오기
    const fetchCurrentBackground = async () => {
      try {
        const settingsDocRef = doc(db, 'users', currentUser.uid, 'settings', 'background');
        const settingsDoc = await getDoc(settingsDocRef);
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          if (data.type === 'color') {
            setBackgroundType('color');
            setBackgroundColor(data.value);
            setCurrentBackground({
              type: 'color',
              color: data.value
            });
          } else if (data.type === 'gradient') {
            setBackgroundType('gradient');
            const match = data.value.match(/linear-gradient\((.*?), (.*?), (.*?)\)/);
            if (match) {
              setGradientDirection(match[1]);
              setGradientColor1(match[2]);
              setGradientColor2(match[3]);
              setCurrentBackground({
                type: 'gradient',
                gradient: {
                  direction: match[1],
                  color1: match[2],
                  color2: match[3]
                }
              });
            }
          } else if (data.type === 'video') {
            setBackgroundType('url');
            setCustomUrl(data.value);
            setCurrentBackground({
              type: data.value.includes('youtube.com') || data.value.includes('youtu.be') ? 'youtube' : 'pixabay',
              url: data.value
            });
          } else {
            setBackgroundType('url');
            setCustomUrl(data.value);
            setCurrentBackground({
              type: 'image',
              url: data.value
            });
          }
        }
      } catch (error) {
        console.error('Error fetching current background:', error);
      }
    };

    fetchCurrentBackground();
    return () => unsubscribe();
  }, [currentUser?.uid]);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!currentUser?.uid) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUsername(userDoc.data().username);
        }
      } catch (error) {
        console.error('Error fetching username:', error);
      }
    };

    fetchUsername();
  }, [currentUser?.uid]);

  const copyUrl = async (background: Background) => {
    try {
      await navigator.clipboard.writeText(background.url);
      setCopiedId(background.id);
      setTimeout(() => setCopiedId(null), 2000);
      alert('URL 복사, 배경타입 미디어 url을 입력하세요');
    } catch (error) {
      console.error('Error copying URL:', error);
      alert('URL 복사 중 오류가 발생했습니다.');
    }
  };

  const saveBackground = async () => {
    if (!currentUser?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }

    setSaving(true);
    try {
      const settingsDocRef = doc(db, 'users', currentUser.uid, 'settings', 'background');
      const currentSettings = await getDoc(settingsDocRef);
      let backgroundData: any = {};

      if (backgroundType === 'color') {
        backgroundData = {
          type: 'color',
          value: backgroundColor,
          animation: isAnimationEnabled
        };
      } else if (backgroundType === 'gradient') {
        backgroundData = {
          type: 'gradient',
          value: `linear-gradient(${gradientDirection}, ${gradientColor1}, ${gradientColor2})`,
          animation: isAnimationEnabled
        };
      } else {
        if (!customUrl.trim()) {
          alert('URL을 입력해주세요.');
          setSaving(false);
          return;
        }

        const url = customUrl.trim();
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          backgroundData = {
            type: 'video',
            value: url,
            animation: isAnimationEnabled
          };
        } else if (url.includes('pixabay.com') && url.includes('.mp4')) {
          backgroundData = {
            type: 'video',
            value: url,
            animation: isAnimationEnabled
          };
        } else {
          backgroundData = {
            type: 'image',
            value: url,
            animation: isAnimationEnabled
          };
        }
      }

      await setDoc(settingsDocRef, backgroundData);
      setCurrentBackground(backgroundData);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error saving background:', error);
      alert('배경 저장 중 오류가 발생했습니다.');
    }
    setSaving(false);
  };

  const handleViewPage = () => {
    setShowSuccessDialog(false);
    if (username) {
      router.push(`/${username}`);
    } else {
      alert('사용자 페이지를 찾을 수 없습니다.');
    }
  };

  const filteredBackgrounds = backgrounds.filter(bg => {
    if (selectedType === 'all') return true;
    if (selectedType === 'image') return bg.type === 'image';
    if (selectedType === 'video') return bg.type === 'youtube' || bg.type === 'pixabay';
    return false;
  });

  const renderPreview = (background: Background) => {
    if (background.type === 'image') {
      return (
        <div className="relative pt-[56.25%] group">
          <img
            src={background.url}
            alt={background.title}
            className="absolute inset-0 w-full h-full object-cover rounded"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button
              onClick={() => copyUrl(background)}
              className="bg-white text-gray-800 px-4 py-2 rounded shadow hover:bg-gray-100 transform hover:scale-105 transition-all duration-300"
            >
              URL 선택하기
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <div className="relative pt-[56.25%] bg-gray-100 rounded group">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="text-lg font-medium">
                {background.type === 'youtube' ? '유튜브 영상' : '픽사베이 영상'}
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => window.open(background.url, '_blank')}
                  className="block w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  미리보기
                </button>
                <button
                  onClick={() => copyUrl(background)}
                  className="block w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  URL 선택하기
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  const renderCurrentBackgroundPreview = () => {
    if (!currentBackground) return null;

    if (currentBackground.type === 'color') {
      return (
        <div 
          className="h-40 rounded"
          style={{ backgroundColor: currentBackground.color }}
        />
      );
    } else if (currentBackground.type === 'gradient') {
      return (
        <div 
          className="h-40 rounded"
          style={{ 
            background: `linear-gradient(${currentBackground.gradient?.direction}, ${currentBackground.gradient?.color1}, ${currentBackground.gradient?.color2})`
          }}
        />
      );
    } else if (currentBackground.type === 'image' || currentBackground.type === 'custom') {
      return (
        <div className="relative h-40 bg-gray-100 rounded overflow-hidden">
          {currentBackground.url && (
          <img
            src={currentBackground.url}
            alt="Current background"
            className="w-full h-full object-cover"
          />
          )}
          {!currentBackground.url && (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              이미지를 선택해주세요
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className="bg-gray-100 rounded p-4 text-center">
          {currentBackground.type === 'youtube' ? '유튜브 영상' : '픽사베이 영상'}
          <div className="mt-2">
            <button
              onClick={() => window.open(currentBackground.url, '_blank')}
              className="text-blue-500 hover:underline"
            >
              영상 보기
            </button>
          </div>
        </div>
      );
    }
  };

  // 관리자 권한 확인
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser?.uid) return;

      try {
        const adminRef = doc(db, 'admin', 'settings');
        const adminDoc = await getDoc(adminRef);
        
        // 이전 비밀번호 방식 제거
        if (adminDoc.exists() && adminDoc.data().password) {
          await updateDoc(adminRef, {
            password: deleteField()
          });
        }

        if (adminDoc.exists() && adminDoc.data().adminUid === currentUser.uid) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [currentUser?.uid]);

  // 새 배경 추가 함수
  const handleAddBackground = async () => {
    if (!newBackground.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (newBackground.type === 'image' && !newBackground.file && !newBackground.url) {
      alert('이미지를 업로드하거나 URL을 입력해주세요.');
      return;
    }

    if ((newBackground.type === 'youtube' || newBackground.type === 'pixabay') && !newBackground.url.trim()) {
      alert('영상 URL을 입력해주세요.');
      return;
    }

    try {
      let finalUrl = newBackground.url;
      
      // 이미지 파일이 있는 경우 스토리지에 업로드
      if (newBackground.type === 'image' && newBackground.file) {
        const storageRef = ref(storage, `backgrounds/${Date.now()}_${newBackground.file.name}`);
        const snapshot = await uploadBytes(storageRef, newBackground.file);
        finalUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, 'backgrounds'), {
        title: newBackground.title,
        type: newBackground.type,
        url: finalUrl,
        isActive: true,
        createdAt: new Date()
      });

      setShowAddDialog(false);
      setNewBackground({
        title: '',
        type: 'image',
        url: '',
        isActive: true,
        file: null
      });
      alert('배경이 추가되었습니다.');
    } catch (error) {
      console.error('Error adding background:', error);
      alert('배경 추가 중 오류가 발생했습니다.');
    }
  };

  // 배경 삭제 함수
  const handleDeleteBackground = async (backgroundId: string) => {
    if (!window.confirm('이 배경을 삭제하시겠습니까?')) return;

    try {
      await updateDoc(doc(db, 'backgrounds', backgroundId), {
        isActive: false
      });
      alert('배경이 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting background:', error);
      alert('배경 삭제 중 오류가 발생했습니다.');
    }
  };

  // 파일 업로드 핸들러 추가
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    // 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setNewBackground(prev => ({
      ...prev,
      file: file,
      url: '' // 파일이 선택되면 URL 초기화
    }));
  };

  // 메타데이터 로드
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!currentUser?.uid) return;
      
      try {
        const metadataDoc = await getDoc(doc(db, 'users', currentUser.uid, 'settings', 'metadata'));
        if (metadataDoc.exists()) {
          setMetadata(metadataDoc.data() as MetaData);
        }
      } catch (error) {
        console.error('메타데이터 로드 중 오류:', error);
      }
    };

    fetchMetadata();
  }, [currentUser?.uid]);

  // OG 이미지 파일 업로드 핸들러
  const handleOgImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('이미지 크기는 2MB 이하여야 합니다.');
      return;
    }

    // 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    // 임시 URL 생성
    const reader = new FileReader();
    reader.onload = () => {
      setTempImageUrl(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // 이미지 크롭 함수
  const cropImage = async () => {
    if (!imgRef.current) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 크기 설정 (실제 출력 크기)
    canvas.width = 1200;
    canvas.height = 630;

    // 크롭된 영역 계산
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCrop = {
      x: crop.x * scaleX,
      y: crop.y * scaleY,
      width: crop.width * scaleX,
      height: crop.height * scaleY,
    };

    // 이미지 그리기
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // 캔버스를 Blob으로 변환
    return new Promise<File>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], 'cropped_og_image.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve(croppedFile);
      }, 'image/jpeg', 0.95);
    });
  };

  // 크롭 완료 핸들러
  const handleCropComplete = async () => {
    try {
      const croppedFile = await cropImage();
      if (!croppedFile) return;
      
      setOgImageFile(croppedFile);
      setCropDialogOpen(false);
      setTempImageUrl('');
    } catch (error) {
      console.error('Error cropping image:', error);
      alert('이미지 크롭 중 오류가 발생했습니다.');
    }
  };

  // 메타데이터 저장 함수 수정
  const saveMetadata = async () => {
    if (!currentUser?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      setSaving(true);
      let ogImageUrl = metadata.ogImage;

      // 새로운 OG 이미지 파일이 있다면 업로드
      if (ogImageFile) {
        const storageRef = ref(storage, `metadata/${currentUser.uid}/og_image_${Date.now()}`);
        const snapshot = await uploadBytes(storageRef, ogImageFile);
        ogImageUrl = await getDownloadURL(snapshot.ref);
      }

      await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'metadata'), {
        ...metadata,
        ogImage: ogImageUrl
      });
      
      setMetadata(prev => ({
        ...prev,
        ogImage: ogImageUrl
      }));
      
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('메타데이터 저장 중 오류:', error);
      alert('메타데이터 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
      setOgImageFile(null);
    }
  };

  const handleResetBackground = async () => {
    if (!currentUser?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!window.confirm('배경을 초기화하시겠습니까?\n애니메이션 효과가 적용된 기본 상태로 돌아갑니다.')) {
      return;
    }

    try {
      setSaving(true);
      const settingsDocRef = doc(db, 'users', currentUser.uid, 'settings', 'background');
      
      // 배경을 초기화하고 애니메이션은 켜기
      await setDoc(settingsDocRef, {
        type: 'none',
        value: '',
        animation: true
      });

      // 현재 상태 업데이트
      setCurrentBackground(null);
      setCustomUrl('');
      setBackgroundType('url');
      setIsAnimationEnabled(true);
      
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('배경 초기화 중 오류:', error);
      alert('배경 초기화 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 애니메이션 설정 저장 함수 추가
  const handleAnimationToggle = async () => {
    if (!currentUser?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      setSaving(true);
      const settingsDocRef = doc(db, 'users', currentUser.uid, 'settings', 'background');
      const currentSettings = await getDoc(settingsDocRef);
      
      // 현재 배경 설정을 유지하면서 애니메이션만 토글
      const updatedSettings = {
        type: currentSettings.exists() ? currentSettings.data().type : 'none',
        value: currentSettings.exists() ? currentSettings.data().value : '',
        animation: !isAnimationEnabled
      };

      await setDoc(settingsDocRef, updatedSettings);
      setIsAnimationEnabled(!isAnimationEnabled);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('애니메이션 설정 저장 중 오류:', error);
      alert('애니메이션 설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 초기 애니메이션 설정 로드
  useEffect(() => {
    const fetchAnimationSetting = async () => {
      if (!currentUser?.uid) return;
      
      try {
        const settingsDocRef = doc(db, 'users', currentUser.uid, 'settings', 'background');
        const settingsDoc = await getDoc(settingsDocRef);
        if (settingsDoc.exists()) {
          setIsAnimationEnabled(settingsDoc.data().animation ?? true);
        }
      } catch (error) {
        console.error('애니메이션 설정 로드 중 오류:', error);
      }
    };

    fetchAnimationSetting();
  }, [currentUser?.uid]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#E8ECF2] flex items-center justify-center">
          <div className="text-gray-700">로딩중...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      {/* 전체 컨테이너의 패딩 수정 */}
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-gray-900 md:pt-[100px] pt-[70px] pb-[100px] md:p-4 p-0">
        {/* 페이지 제목 컨테이너 */}
        <div className="container mx-auto md:max-w-[1100px] w-full mb-12 px-4 md:px-0">
          <h1 className="text-3xl font-bold text-center text-white mb-2">
            배경 관리
          </h1>
          <p className="text-center text-gray-400">
            배경 이미지와 영상을 관리할 수 있습니다
          </p>
        </div>

        {/* 관리자 상태 컨테이너 */}
        <div className="container mx-auto md:max-w-[1100px] w-full mb-8 px-4 md:px-0">
          <div className="bg-[#2A2A2A] rounded-3xl shadow-lg p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-200">관리자 설정</h2>
              <div className="flex items-center gap-3">
                {isAdmin ? (
                  <>
                    <span className="text-green-400 text-sm">관리자 로그인</span>
                    <Button
                      onClick={() => setShowAddDialog(true)}
                      className="bg-blue-500 text-white hover:bg-blue-600"
                    >
                      배경 추가
                    </Button>
                  </>
                ) : (
                  <span className="text-gray-400 text-sm">관리자 권한이 없습니다</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 배경 설정 섹션 컨테이너 */}
        <div className="container mx-auto md:max-w-[1100px] w-full mb-8 px-4 md:px-0 mt-12">
          <div className="mt-8">
            <Tabs defaultValue="background" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#2A2A2A] p-1.5 rounded-xl h-[60px]">
                <TabsTrigger 
                  value="background" 
                  className="py-3.5 text-base data-[state=active]:bg-blue-500 data-[state=active]:text-white text-gray-400 rounded-lg transition-all h-full"
                >
                  배경 설정
                </TabsTrigger>
                <TabsTrigger 
                  value="metadata" 
                  className="py-3.5 text-base data-[state=active]:bg-blue-500 data-[state=active]:text-white text-gray-400 rounded-lg transition-all h-full"
                >
                  메타데이터 설정
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="background">
          <div className="bg-[#2A2A2A] rounded-3xl shadow-lg p-4 md:p-8">
            <h2 className="text-xl font-bold mb-6 text-gray-200">배경 설정</h2>
            <div className="space-y-6">
              {/* 배경 타입 선택 */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  배경 타입
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBackgroundType('url')}
                    className={`flex-1 py-2.5 px-4 rounded-xl ${
                      backgroundType === 'url'
                        ? 'bg-blue-500 text-white'
                              : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    미디어
                  </button>
                  <button
                    onClick={() => setBackgroundType('color')}
                    className={`flex-1 py-2.5 px-4 rounded-xl ${
                      backgroundType === 'color'
                        ? 'bg-blue-500 text-white'
                              : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    단색
                  </button>
                  <button
                    onClick={() => setBackgroundType('gradient')}
                    className={`flex-1 py-2.5 px-4 rounded-xl ${
                      backgroundType === 'gradient'
                        ? 'bg-blue-500 text-white'
                              : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    점층
                  </button>
                </div>
              </div>

              {/* URL 입력 필드 */}
              {backgroundType === 'url' && (
                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      배경 URL
                    </label>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="bgImageUpload"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const storageRef = ref(storage, `backgrounds/${currentUser.uid}/bg_${Date.now()}`);
                              const snapshot = await uploadBytes(storageRef, file);
                              const url = await getDownloadURL(snapshot.ref);
                              setCustomUrl(url);
                            } catch (error) {
                              console.error('이미지 업로드 실패:', error);
                    
                            }
                          }
                        }}
                      />
                      <Button
                        onClick={() => document.getElementById('bgImageUpload')?.click()}
                        className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 text-sm"
                      >
                        배경업로드
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="URL을 입력하세요"
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                      />
                    </div>
                    {customUrl && (
                      <div className="h-40 rounded-xl overflow-hidden">
                        <img src={customUrl} alt="배경 미리보기" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 단색 선택 */}
              {backgroundType === 'color' && (
                <div className="bg-gray-50 rounded-2xl p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    배경색
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="h-12 w-24 rounded-lg"
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                            className="flex-1 p-3 border border-gray-200 rounded-xl text-gray-700"
                      placeholder="#ffffff"
                    />
                  </div>
                  <div 
                    className="mt-4 h-24 rounded-xl border border-gray-200"
                    style={{ backgroundColor: backgroundColor }}
                  />
                </div>
              )}

              {/* 그라데이션 설정 */}
              {backgroundType === 'gradient' && (
                <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      시작 색상
                    </label>
                    <div className="flex gap-3 items-center">
                      <input
                        type="color"
                        value={gradientColor1}
                        onChange={(e) => setGradientColor1(e.target.value)}
                        className="h-12 w-24 rounded-lg"
                      />
                      <input
                        type="text"
                        value={gradientColor1}
                        onChange={(e) => setGradientColor1(e.target.value)}
                              className="flex-1 p-3 border border-gray-200 rounded-xl text-gray-700"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      끝 색상
                    </label>
                    <div className="flex gap-3 items-center">
                      <input
                        type="color"
                        value={gradientColor2}
                        onChange={(e) => setGradientColor2(e.target.value)}
                        className="h-12 w-24 rounded-lg"
                      />
                      <input
                        type="text"
                        value={gradientColor2}
                        onChange={(e) => setGradientColor2(e.target.value)}
                              className="flex-1 p-3 border border-gray-200 rounded-xl text-gray-700"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      방향
                    </label>
                    <select
                      value={gradientDirection}
                      onChange={(e) => setGradientDirection(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl"
                    >
                      {gradientDirections.map(dir => (
                        <option key={dir.value} value={dir.value}>
                          {dir.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div 
                    className="h-24 rounded-xl border border-gray-200"
                    style={{ 
                      background: `linear-gradient(${gradientDirection}, ${gradientColor1}, ${gradientColor2})`
                    }}
                  />
                </div>
              )}

              {/* 저장 버튼 */}
              <div>
                <button
                  onClick={saveBackground}
                  disabled={saving}
                  className="w-full bg-blue-500 text-white py-3 px-4 rounded-xl hover:bg-blue-600 disabled:bg-gray-400 font-medium"
                >
                  {saving ? '저장중...' : '저장'}
                </button>
              </div>

              {/* 현재 배경 미리보기 */}
              {currentBackground && (
                <div className="bg-gray-50 rounded-2xl p-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">현재 설정된 배경:</p>
                  {renderCurrentBackgroundPreview()}
                </div>
              )}
            </div>
          </div>
              </TabsContent>

              <TabsContent value="metadata">
                <div className="bg-[#2A2A2A] rounded-3xl shadow-lg p-4 md:p-8">
                  <h2 className="text-xl font-bold mb-6 text-gray-200">메타데이터 설정</h2>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-gray-200">페이지 제목</Label>
                      <Input
                        id="title"
                        value={metadata.title}
                        onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                        placeholder="페이지 제목을 입력하세요"
                        className="h-12"
                      />
        </div>

                    <div className="space-y-3">
                      <Label className="text-gray-200">페이지 설명</Label>
                      <textarea
                        id="description"
                        value={metadata.description}
                        onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                        placeholder="페이지 설명을 입력하세요"
                        className="w-full min-h-[120px] px-4 py-3 rounded-md border border-input bg-background"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-gray-200">키워드 (쉼표로 구분)</Label>
                      <Input
                        id="keywords"
                        value={metadata.keywords.join(', ')}
                        onChange={(e) => setMetadata({ 
                          ...metadata, 
                          keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                        })}
                        placeholder="키워드1, 키워드2, 키워드3"
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-gray-200">대표 이미지</Label>
                      <div className="space-y-4">
                        <div className="grid gap-3">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleOgImageSelect}
                            className="h-12"
                          />
                          <div className="text-sm text-gray-400">또는</div>
                          <Input
                            placeholder="이미지 URL을 입력하세요"
                            value={metadata.ogImage}
                            onChange={(e) => setMetadata({ ...metadata, ogImage: e.target.value })}
                            className="h-12"
                          />
                        </div>
                        
                        {metadata.ogImage && (
                          <div className="mt-4">
                            <Label className="text-gray-200">현재 대표 이미지:</Label>
                            <div className="mt-2 relative pt-[52.5%] bg-gray-100 rounded-lg overflow-hidden">
                              <img
                                src={metadata.ogImage}
                                alt="OG Image Preview"
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            </div>
                            <p className="mt-2 text-sm text-gray-400">
                              권장 크기: 1200 x 630 픽셀 (1.91:1 비율)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 pb-8">
                      <Button 
                        onClick={saveMetadata}
                        disabled={saving}
                        className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-base"
                      >
                        {saving ? '저장 중...' : '메타데이터 저장'}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

        {/* 초기화 버튼과 애니메이션 설정 섹션 */}
        <div className="container mx-auto md:max-w-[1100px] w-full px-0 md:px-0 mt-8">
          <div className="bg-[#2A2A2A] rounded-3xl shadow-lg p-4 md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-200">애니메이션</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleAnimationToggle}
                    variant="outline"
                    className={`${
                      isAnimationEnabled 
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 hover:bg-blue-500/30' 
                        : 'bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600'
                    }`}
                  >
                    {isAnimationEnabled ? '켜짐' : '꺼짐'}
                  </Button>
                </div>
                <Button
                  onClick={handleResetBackground}
                  variant="outline"
                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                >
                  초기화
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 배경 갤러리 섹션 */}
            <div className="container mx-auto md:max-w-[1100px] w-full px-0 md:px-0 mt-12">
          <div className="bg-[#2A2A2A] rounded-3xl shadow-lg p-4 md:p-8">
            <h2 className="text-xl font-bold mb-6 text-gray-200">배경 갤러리</h2>
            <div className="bg-[#333333] rounded-2xl p-4 md:p-6">
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setSelectedType('all')}
                  className={`flex-1 py-2.5 px-4 rounded-xl ${
                    selectedType === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-[#2A2A2A] text-gray-300 hover:bg-[#252525]'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setSelectedType('image')}
                  className={`flex-1 py-2.5 px-4 rounded-xl ${
                    selectedType === 'image'
                      ? 'bg-blue-500 text-white'
                      : 'bg-[#2A2A2A] text-gray-300 hover:bg-[#252525]'
                  }`}
                >
                  이미지
                </button>
                <button
                  onClick={() => setSelectedType('video')}
                  className={`flex-1 py-2.5 px-4 rounded-xl ${
                    selectedType === 'video'
                      ? 'bg-blue-500 text-white'
                      : 'bg-[#2A2A2A] text-gray-300 hover:bg-[#252525]'
                  }`}
                >
                  영상
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBackgrounds.map((background) => (
                  <div key={background.id} className="bg-[#2A2A2A] rounded-xl shadow-sm overflow-hidden border border-gray-800">
                    {renderPreview(background)}
                    <div className="p-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-gray-200">{background.title}</h3>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBackground(background.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            삭제
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredBackgrounds.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-400">
                    선택한 유형의 배경이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 배경 추가 다이얼로그 */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogContent className="sm:max-w-[425px] md:max-w-[425px] w-[95vw] max-w-[95vw] sm:w-full sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>새 배경 추가</DialogTitle>
              <DialogDescription>
                갤러리에 새로운 배경을 추가합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  value={newBackground.title}
                  onChange={(e) => setNewBackground({...newBackground, title: e.target.value})}
                  placeholder="배경 제목을 입력하세요"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">타입</Label>
                <select
                  id="type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newBackground.type}
                  onChange={(e) => setNewBackground({...newBackground, type: e.target.value as 'image' | 'youtube' | 'pixabay'})}
                >
                  <option value="image">이미지</option>
                  <option value="youtube">YouTube 영상</option>
                  <option value="pixabay">Pixabay 영상</option>
                </select>
              </div>
              
              {newBackground.type === 'image' ? (
                <div className="grid gap-2">
                  <Label>이미지 업로드</Label>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="mb-2"
                    />
                    <div className="text-sm text-gray-500">또는</div>
                    <Input
                      placeholder="이미지 URL을 입력하세요"
                      value={newBackground.url}
                      onChange={(e) => setNewBackground({...newBackground, url: e.target.value})}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="url">영상 URL</Label>
                  <Input
                    id="url"
                    value={newBackground.url}
                    onChange={(e) => setNewBackground({...newBackground, url: e.target.value})}
                    placeholder={`${newBackground.type === 'youtube' ? 'YouTube' : 'Pixabay'} 영상 URL을 입력하세요`}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setNewBackground({
                    title: '',
                    type: 'image',
                    url: '',
                    isActive: true,
                    file: null
                  });
                }}
              >
                취소
              </Button>
              <Button
                onClick={handleAddBackground}
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                추가
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 성공 다이얼로그 */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>배경 저장 완료</DialogTitle>
              <DialogDescription>
                배경이 성공적으로 저장되었습니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowSuccessDialog(false)}
              >
                계속 수정하기
              </Button>
              <Button
                onClick={handleViewPage}
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                내 사이트 보기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

            {/* 이미지 크롭 다이얼로그 */}
            <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
              <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                  <DialogTitle>대표 이미지 크롭</DialogTitle>
                  <DialogDescription>
                    이미지를 1200x630 비율로 크롭해주세요. (페이스북 권장 크기)
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  {tempImageUrl && (
                    <ReactCrop
                      crop={crop}
                      onChange={(c) => setCrop(c)}
                      aspect={1200/630}
                      className="max-h-[600px]"
                    >
                      <img
                        ref={imgRef}
                        src={tempImageUrl}
                        alt="Crop preview"
                        className="max-w-full h-auto"
                      />
                    </ReactCrop>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCropDialogOpen(false);
                      setTempImageUrl('');
                    }}
                  >
                    취소
                  </Button>
                  <Button onClick={handleCropComplete}>
                    크롭 완료
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </>
  );
} 