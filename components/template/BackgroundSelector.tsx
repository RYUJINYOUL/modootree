'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db, storage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface BackgroundSelectorProps {
  onBackgroundChange: (type: string, value: string) => void;
  username?: string;
}

const DEFAULT_BACKGROUND = {
  type: 'image',
  value: '/defaults/backgrounds/default-background1.jpg'
};

const RESET_BACKGROUND = {
  type: 'image',
  value: '/defaults/backgrounds/default-background1.jpg'  // 초기화 시 사용할 이미지 경로
};

const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({ onBackgroundChange, username }) => {
  const { currentUser } = useSelector((state: any) => state.user);
  const [isOwner, setIsOwner] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [currentImageRef, setCurrentImageRef] = useState<string | null>(null);

  useEffect(() => {
    const checkOwnership = async () => {
      if (!currentUser?.uid || !username) return;
      
      const usernameDoc = await getDoc(doc(db, 'usernames', username));
      if (usernameDoc.exists()) {
        setIsOwner(usernameDoc.data().uid === currentUser.uid);
        
        // 현재 배경 이미지 참조 가져오기
        const userDoc = await getDoc(doc(db, 'users', usernameDoc.data().uid));
        if (userDoc.exists() && userDoc.data().backgroundImage) {
          setCurrentImageRef(userDoc.data().backgroundImage);
        }
      }
    };

    checkOwnership();
  }, [currentUser?.uid, username]);

  // 로그인하지 않았거나, 현재 사용자의 페이지가 아니면 렌더링하지 않음
  if (!currentUser?.uid || !isOwner) {
    return null;
  }

  const handleColorChange = (color: string) => {
    onBackgroundChange('color', color);
  };

  const handleGradientChange = (gradient: string) => {
    onBackgroundChange('gradient', gradient);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    try {
      setIsUploading(true);

      // 이전 이미지 삭제
      if (currentImageRef) {
        try {
          const oldImageRef = ref(storage, currentImageRef);
          await deleteObject(oldImageRef);
        } catch (error) {
          console.error('이전 이미지 삭제 실패:', error);
        }
      }

      // 새 이미지 업로드
      const imageRef = ref(storage, `backgrounds/${currentUser.uid}_${Date.now()}.jpg`);
      await uploadBytes(imageRef, file);
      const imageUrl = await getDownloadURL(imageRef);

      // 스토리지 참조 저장
      const userDoc = doc(db, 'users', currentUser.uid);
      await updateDoc(userDoc, {
        backgroundImage: imageRef.fullPath
      });

      setCurrentImageRef(imageRef.fullPath);
      onBackgroundChange('image', imageUrl);

      // 프리뷰 업데이트
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlChange = async (url: string) => {
    if (!url.trim()) return;

    try {
      // YouTube URL 체크
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        // 이전 이미지 삭제
        if (currentImageRef) {
          try {
            const oldImageRef = ref(storage, currentImageRef);
            await deleteObject(oldImageRef);
          } catch (error) {
            console.error('이전 이미지 삭제 실패:', error);
          }
        }

        // 스토리지 참조 초기화
        const userDoc = doc(db, 'users', currentUser.uid);
        await updateDoc(userDoc, {
          backgroundImage: null
        });

        setCurrentImageRef(null);
        onBackgroundChange('video', url);
      } 
      // Pixabay 비디오 URL 체크
      else if (url.includes('pixabay.com') || url.endsWith('.mp4')) {
        // 이전 이미지 삭제
        if (currentImageRef) {
          try {
            const oldImageRef = ref(storage, currentImageRef);
            await deleteObject(oldImageRef);
          } catch (error) {
            console.error('이전 이미지 삭제 실패:', error);
          }
        }

        // 스토리지 참조 초기화
        const userDoc = doc(db, 'users', currentUser.uid);
        await updateDoc(userDoc, {
          backgroundImage: null
        });

        setCurrentImageRef(null);
        onBackgroundChange('video', url);
      }
      else {
        // 이미지 URL로 처리
        // 이전 이미지 삭제
        if (currentImageRef) {
          try {
            const oldImageRef = ref(storage, currentImageRef);
            await deleteObject(oldImageRef);
          } catch (error) {
            console.error('이전 이미지 삭제 실패:', error);
          }
        }

        // 스토리지 참조 초기화
        const userDoc = doc(db, 'users', currentUser.uid);
        await updateDoc(userDoc, {
          backgroundImage: null
        });

        setCurrentImageRef(null);
        onBackgroundChange('image', url);
      }
    } catch (error) {
      console.error('URL 설정 실패:', error);
      alert('URL 설정에 실패했습니다.');
    }
  };

  const handleReset = async () => {
    if (window.confirm('배경 설정을 초기화하시겠습니까?')) {
      try {
        // 저장된 이미지가 있다면 삭제
        if (currentImageRef) {
          try {
            const oldImageRef = ref(storage, currentImageRef);
            await deleteObject(oldImageRef);
          } catch (error) {
            console.error('이전 이미지 삭제 실패:', error);
          }
        }

        // 초기화용 이미지 URL 가져오기
        const resetImageRef = ref(storage, RESET_BACKGROUND.value);
        const resetImageUrl = await getDownloadURL(resetImageRef);

        // 스토리지 참조 초기화 및 기본 배경 설정 저장
        const userDoc = doc(db, 'users', currentUser.uid);
        const settingsDocRef = doc(db, 'users', currentUser.uid, 'settings', 'background');
        
        await Promise.all([
          updateDoc(userDoc, {
            backgroundImage: null
          }),
          setDoc(settingsDocRef, {
            type: 'image',
            value: resetImageUrl
          }, { merge: true })
        ]);

        setCurrentImageRef(null);
        setUploadPreview(null);
        onBackgroundChange('image', resetImageUrl);
      } catch (error) {
        console.error('배경 초기화 실패:', error);
        alert('배경 초기화에 실패했습니다.');
      }
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-black/10 hover:bg-black/20 text-white border-none backdrop-blur-sm transition-all duration-200">배경 설정</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>배경 설정</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="color">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="color">단색</TabsTrigger>
            <TabsTrigger value="gradient">그라데이션</TabsTrigger>
            <TabsTrigger value="media">미디어</TabsTrigger>
          </TabsList>
          
          <TabsContent value="color">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="color">색상</Label>
                <Input
                  id="color"
                  type="color"
                  defaultValue={DEFAULT_BACKGROUND.value}
                  className="col-span-3"
                  onChange={(e) => handleColorChange(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gradient">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="gradient-start">시작 색상</Label>
                <Input
                  id="gradient-start"
                  type="color"
                  defaultValue="#ffffff"
                  className="col-span-3"
                  onChange={(e) => handleGradientChange(`linear-gradient(${e.target.value}, #ffffff)`)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="gradient-end">종료 색상</Label>
                <Input
                  id="gradient-end"
                  type="color"
                  defaultValue="#ffffff"
                  className="col-span-3"
                  onChange={(e) => handleGradientChange(`linear-gradient(#ffffff, ${e.target.value})`)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="media">
            <div className="grid gap-4 py-4">
              {/* 이미지 업로드 */}
              <div className="space-y-4">
                <Label className="block">
                  <div className="bg-blue-900/50 border-2 border-dashed border-blue-400/40 rounded-xl p-8 text-center cursor-pointer hover:bg-blue-900/60 transition-colors">
                    <div className="text-white font-medium mb-2">
                      이미지 파일을 선택하세요
                    </div>
                    <div className="text-blue-200 text-sm">
                      (최대 5MB)
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </div>
                </Label>

                {/* 업로드 프리뷰 */}
                {uploadPreview && (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black/50">
                    <Image
                      src={uploadPreview}
                      alt="미리보기"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-400 mt-2">또는</div>

              {/* URL 입력 */}
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="media-url">URL</Label>
                  <Input
                    id="media-url"
                    type="text"
                    className="col-span-3"
                    placeholder="이미지 URL 또는 YouTube URL"
                    onBlur={(e) => handleUrlChange(e.target.value)}
                  />
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>• 이미지 URL 또는 YouTube URL을 입력하세요</p>
                  <p>• YouTube URL: youtube.com 또는 youtu.be 링크</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex justify-end mt-4">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={isUploading}
          >
            초기화
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BackgroundSelector; 