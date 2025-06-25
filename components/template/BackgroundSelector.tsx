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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useEffect, useState } from 'react';

interface BackgroundSelectorProps {
  onBackgroundChange: (type: string, value: string) => void;
  username?: string;
}

const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({ onBackgroundChange, username }) => {
  const { currentUser } = useSelector((state: any) => state.user);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const checkOwnership = async () => {
      if (!currentUser?.uid || !username) return;
      
      const usernameDoc = await getDoc(doc(db, 'usernames', username));
      if (usernameDoc.exists()) {
        setIsOwner(usernameDoc.data().uid === currentUser.uid);
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

  const handleImageChange = (imageUrl: string) => {
    if (imageUrl.trim()) {
      onBackgroundChange('image', imageUrl);
    }
  };

  const handleVideoChange = (videoUrl: string) => {
    if (videoUrl.trim()) {
      try {
        // URL 정리
        let finalUrl = videoUrl.trim();
        
        // @ 문자로 시작하면 제거
        if (finalUrl.startsWith('@')) {
          finalUrl = finalUrl.substring(1);
        }
        
        // URL 유효성 검사
        if (!finalUrl.startsWith('http')) {
          finalUrl = 'https://' + finalUrl;
        }

        onBackgroundChange('video', finalUrl);
      } catch (error) {
        console.error('Video URL processing error:', error);
        alert('올바른 비디오 URL을 입력해주세요.');
      }
    }
  };

  const handleReset = async () => {
    if (window.confirm('배경 설정을 초기화하시겠습니까?')) {
      onBackgroundChange('color', '#ffffff');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">배경 설정</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>배경 설정</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="color">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="color">단색</TabsTrigger>
            <TabsTrigger value="gradient">그라데이션</TabsTrigger>
            <TabsTrigger value="image">이미지</TabsTrigger>
            <TabsTrigger value="video">동영상</TabsTrigger>
          </TabsList>
          
          <TabsContent value="color">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="color">색상</Label>
                <Input
                  id="color"
                  type="color"
                  defaultValue="#ffffff"
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

          <TabsContent value="image">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="image-url">이미지 URL</Label>
                <Input
                  id="image-url"
                  type="text"
                  className="col-span-3"
                  placeholder="https://example.com/image.jpg"
                  onBlur={(e) => handleImageChange(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="video">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="video-url">동영상 URL</Label>
                <Input
                  id="video-url"
                  type="text"
                  className="col-span-3"
                  placeholder="YouTube 또는 Pixabay 비디오 URL"
                  onBlur={(e) => handleVideoChange(e.target.value)}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                YouTube와 Pixabay 동영상을 지원합니다.
              </p>
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={handleReset}>
            초기화
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BackgroundSelector; 