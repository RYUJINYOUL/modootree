'use client';

import { useEffect, useState, Suspense } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";

interface Background {
  id: string;
  type: 'image' | 'youtube' | 'pixabay';
  url: string;
  title: string;
}

interface LinkLetterBackground {
  type: 'image' | 'youtube' | 'pixabay' | 'custom' | 'color' | 'gradient' | 'video' | 'none';
  url?: string;
  color?: string;
  gradient?: {
    color1: string;
    color2: string;
    direction: string;
  };
}

// useSearchParams를 사용하는 컴포넌트를 분리
function LinkLetterBackgroundContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { currentUser } = useSelector((state: any) => state.user);
  
  // 이전 페이지 정보 가져오기
  const returnUrl = searchParams.get('return') || '/link-letter';
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'all' | 'image' | 'video'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // 현재 배경 설정 관련 상태
  const [currentBackground, setCurrentBackground] = useState<LinkLetterBackground | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [gradientColor1, setGradientColor1] = useState('#ffffff');
  const [gradientColor2, setGradientColor2] = useState('#000000');
  const [gradientDirection, setGradientDirection] = useState('to bottom');
  const [backgroundType, setBackgroundType] = useState<'url' | 'color' | 'gradient'>('url');
  const [saving, setSaving] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // 애니메이션 상태
  const [isAnimationEnabled, setIsAnimationEnabled] = useState(true);

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

    // 현재 링크 편지 배경 설정 가져오기
    const fetchCurrentBackground = async () => {
      try {
        const settingsDocRef = doc(db, 'users', currentUser.uid, 'settings', 'linkLetterBackground');
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
          } else {
            setBackgroundType('url');
            setCustomUrl(data.value);
            setCurrentBackground({
              type: 'image',
              url: data.value
            });
          }
          setIsAnimationEnabled(data.animation ?? true);
        }
      } catch (error) {
        console.error('Error fetching current background:', error);
      }
    };

    fetchCurrentBackground();
    return () => unsubscribe();
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
      const settingsDocRef = doc(db, 'users', currentUser.uid, 'settings', 'linkLetterBackground');
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

        backgroundData = {
          type: 'image',
          value: customUrl.trim(),
          animation: isAnimationEnabled
        };
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

  const handleViewLinkLetter = () => {
    setShowSuccessDialog(false);
    router.push(returnUrl);
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
    } else {
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
    }
  };

  const handleResetBackground = async () => {
    if (!currentUser?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!window.confirm('링크 편지 배경을 초기화하시겠습니까?\n파티클 효과가 적용된 기본 상태로 돌아갑니다.')) {
      return;
    }

    try {
      setSaving(true);
      const settingsDocRef = doc(db, 'users', currentUser.uid, 'settings', 'linkLetterBackground');
      
      await setDoc(settingsDocRef, {
        type: 'none',
        value: '',
        animation: true
      });

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

  const handleAnimationToggle = async () => {
    if (!currentUser?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      setSaving(true);
      const settingsDocRef = doc(db, 'users', currentUser.uid, 'settings', 'linkLetterBackground');
      const currentSettings = await getDoc(settingsDocRef);
      
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
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex-1 overflow-y-auto md:pt-[100px] pt-[70px] pb-[100px] md:p-4 p-0">
        {/* 페이지 제목 */}
        <div className="container mx-auto md:max-w-[1100px] w-full mb-12 px-4 md:px-0">
          <h1 className="text-3xl font-bold text-center text-white mb-2">
            링크 편지 배경 설정
          </h1>
          <p className="text-center text-gray-400">
            링크 편지 페이지의 배경을 설정할 수 있습니다
          </p>
        </div>

        {/* 배경 설정 섹션 */}
        <div className="container mx-auto md:max-w-[1100px] w-full mb-8 px-4 md:px-0">
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
                              // 이미지 크기 체크
                              const img = new Image();
                              img.src = URL.createObjectURL(file);
                              await new Promise((resolve) => {
                                img.onload = () => {
                                  const aspectRatio = img.width / img.height;
                                  if (Math.abs(aspectRatio - 16/9) > 0.1) {
                                    if (!confirm('16:9 비율이 아닌 이미지입니다. 계속하시겠습니까?\n(이미지가 잘리거나 늘어날 수 있습니다)')) {
                                      resolve(false);
                                      return;
                                    }
                                  }
                                  resolve(true);
                                };
                              });

                              const storageRef = ref(storage, `link-letter-backgrounds/bg_${Date.now()}`);
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
        </div>

        {/* 애니메이션 설정 섹션 */}
        <div className="container mx-auto md:max-w-[1100px] w-full px-0 md:px-0 mt-8">
          <div className="bg-[#2A2A2A] rounded-3xl shadow-lg p-4 md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-200">파티클 애니메이션</h2>
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
                      <h3 className="font-medium text-gray-200">{background.title}</h3>
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

        {/* 성공 다이얼로그 */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>링크 편지 배경 저장 완료</DialogTitle>
              <DialogDescription>
                링크 편지 배경이 성공적으로 저장되었습니다.
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
                onClick={handleViewLinkLetter}
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                {returnUrl.includes('/link-letter/') && returnUrl !== '/link-letter' ? '편지로 돌아가기' : '링크 편지 보기'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Suspense boundary로 감싸는 메인 컴포넌트
export default function LinkLetterBackgroundSettings() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-lg">로딩 중...</div>
      </div>
    }>
      <LinkLetterBackgroundContent />
    </Suspense>
  );
}
