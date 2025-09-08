'use client';

import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { db } from '@/firebase';
import { storage } from '@/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Copy, Lock, Image as ImageIcon, X } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';
import { Inter, Noto_Sans_KR } from 'next/font/google';
import { cn } from '@/lib/utils';

interface VoteOption {
  id: string;
  text: string;
  votes: number;
  images: string[];
}

const CATEGORIES = [
  '한입냠냠', 
  '함께활동', 
  '반짝순간', 
  '취향원픽', 
  '소확행', 
  '여행휴가', 
  '셀렘만남', 
  '자유시간', 
  '기타'
];

interface VoteData {
  id?: string;
  title: string;
  description: string;
  category: string;
  options: VoteOption[];
  password: string;
  createdAt: any;
  createdBy: string;
  isPasswordProtected: boolean;
}

interface VoteComponentProps {
  username?: string;
  uid?: string;
  voteData?: VoteData | null;
}

export const useImageCompression = () => {
  const compressImage = async (file: File) => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.8,
    };
    
    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error('Image compression failed:', error);
      return file;
    }
  };
  
  return { compressImage };
};

export default function VoteComponent({ username, uid, voteData: initialVoteData }: VoteComponentProps) {
  const { currentUser } = useSelector((state: any) => state.user);
  const finalUid = uid ?? currentUser?.uid;
  const toast = useToast();
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement }>({});

  const showToast = (title: string, description?: string, variant?: "default" | "destructive") => {
    toast.showToast({ title, description });
  };

  // 생성자 여부 확인
  const isCreator = currentUser?.uid === initialVoteData?.createdBy;
  const [isCreating, setIsCreating] = useState(!initialVoteData);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [voteUrl, setVoteUrl] = useState(initialVoteData ? `${window.location.origin}/vote/${initialVoteData.id}` : '');
  const [uploading, setUploading] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [voteData, setVoteData] = useState<VoteData>(initialVoteData || {
    title: '',
    description: '',
    category: '',
    options: [
      { id: '1', text: '', votes: 0, images: [] },
      { id: '2', text: '', votes: 0, images: [] },
    ],
    password: '',
    createdAt: null,
    createdBy: '',
    isPasswordProtected: false,
  });

  const handleAddOption = () => {
    setVoteData(prev => ({
      ...prev,
      options: [
        ...prev.options,
        {
          id: (prev.options.length + 1).toString(),
          text: '',
          votes: 0,
          images: [],
        },
      ],
    }));
  };

  const handleRemoveOption = (id: string) => {
    if (voteData.options.length <= 2) {
      showToast("최소 2개의 옵션이 필요합니다", undefined, "destructive");
      return;
    }
    setVoteData(prev => ({
      ...prev,
      options: prev.options.filter(option => option.id !== id),
    }));
  };

  const handleOptionChange = (id: string, value: string) => {
    setVoteData(prev => ({
      ...prev,
      options: prev.options.map(option =>
        option.id === id ? { ...option, text: value } : option
      ),
    }));
  };

  const handleImageUpload = async (optionId: string, files: FileList) => {
    if (!currentUser?.uid) {
      showToast("로그인이 필요합니다", "이미지를 업로드하려면 로그인해주세요.", "destructive");
      return;
    }

    if (files.length === 0) return;
    
    const option = voteData.options.find(opt => opt.id === optionId);
    if (!option) return;

    if (option.images.length + files.length > 10) {
      showToast("이미지는 최대 10장까지 업로드할 수 있습니다", undefined, "destructive");
      return;
    }

    setUploading(true);
    const newImages: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // 파일 크기 체크 (5MB)
        if (file.size > 5 * 1024 * 1024) {
          showToast("파일 크기는 5MB를 초과할 수 없습니다", undefined, "destructive");
          continue;
        }

        // 이미지 파일 타입 체크
        if (!file.type.startsWith('image/')) {
          showToast("이미지 파일만 업로드할 수 있습니다", undefined, "destructive");
          continue;
        }

        const timestamp = Date.now();
        const fileRef = ref(storage, `votes/${currentUser.uid}/${optionId}/${timestamp}_${file.name}`);
        const snapshot = await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        newImages.push(downloadUrl);
      }

      if (newImages.length > 0) {
        setVoteData(prev => ({
          ...prev,
          options: prev.options.map(option =>
            option.id === optionId
              ? { ...option, images: [...option.images, ...newImages] }
              : option
          ),
        }));

        showToast(`${newImages.length}개의 이미지가 업로드되었습니다`);
      }
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      showToast("이미지 업로드에 실패했습니다", undefined, "destructive");
    } finally {
      setUploading(false);
      // 파일 입력 초기화
      if (fileInputRefs.current[optionId]) {
        fileInputRefs.current[optionId].value = '';
      }
    }
  };

  const handleRemoveImage = async (optionId: string, imageUrl: string) => {
    try {
      // Firebase Storage에서 이미지 삭제
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);

      // 상태에서 이미지 제거
      setVoteData(prev => ({
        ...prev,
        options: prev.options.map(option =>
          option.id === optionId
            ? { ...option, images: option.images.filter(img => img !== imageUrl) }
            : option
        ),
      }));

      showToast("이미지가 삭제되었습니다");
    } catch (error) {
      console.error('이미지 삭제 실패:', error);
      showToast("이미지 삭제에 실패했습니다", undefined, "destructive");
    }
  };

  const handleCreateVote = async () => {
    if (!currentUser?.uid) {
      showToast("로그인이 필요합니다", "투표를 생성하려면 로그인해주세요.", "destructive");
      return;
    }

    if (!voteData.title.trim()) {
      showToast("투표 제목을 입력해주세요", undefined, "destructive");
      return;
    }

    if (!voteData.category) {
      showToast("카테고리를 선택해주세요", undefined, "destructive");
      return;
    }

    if (voteData.options.some(option => !option.text.trim())) {
      showToast("모든 투표 옵션을 입력해주세요", undefined, "destructive");
      return;
    }

    if (voteData.isPasswordProtected && !voteData.password) {
      showToast("비밀번호를 설정해주세요", undefined, "destructive");
      return;
    }

    try {
      const voteRef = doc(collection(db, 'votes'));
      const newVoteData = {
        ...voteData,
        id: voteRef.id,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      };

      await setDoc(voteRef, newVoteData);
      setVoteUrl(`${window.location.origin}/vote/${voteRef.id}`);
      setVoteData(newVoteData as VoteData);
      setIsCreating(false);

      showToast("투표가 생성되었습니다", "URL을 복사하여 공유해보세요!");
    } catch (error) {
      console.error('투표 생성 실패:', error);
      showToast("투표 생성에 실패했습니다", undefined, "destructive");
    }
  };

  const verifyPassword = () => {
    if (enteredPassword === voteData.password) {
      setPasswordVerified(true);
      showToast("비밀번호가 확인되었습니다");
    } else {
      showToast("비밀번호가 일치하지 않습니다", undefined, "destructive");
    }
  };

  const handleVote = async (optionId: string) => {
    if (!initialVoteData?.id) {
      showToast("투표 ID를 찾을 수 없습니다", undefined, "destructive");
      return;
    }

    if (voteData.isPasswordProtected && !passwordVerified) {
      showToast("비밀번호를 먼저 확인해주세요", undefined, "destructive");
      return;
    }

    try {
      const voteRef = doc(db, 'votes', initialVoteData.id);
      
      // 현재 투표 데이터를 가져옵니다
      const currentVoteSnap = await getDoc(voteRef);
      if (!currentVoteSnap.exists()) {
        showToast("투표를 찾을 수 없습니다", undefined, "destructive");
        return;
      }

      const currentVoteData = currentVoteSnap.data();
      
      // 투표 옵션만 업데이트
      const updatedOptions = currentVoteData.options.map((option: VoteOption) =>
        option.id === optionId
          ? { ...option, votes: (option.votes || 0) + 1 }
          : option
      );

      // 다른 필드는 변경하지 않고 options만 업데이트
      await updateDoc(voteRef, {
        options: updatedOptions
      });

      // 로컬 상태 업데이트
      setVoteData(prev => ({
        ...prev,
        options: prev.options.map(option =>
          option.id === optionId
            ? { ...option, votes: (option.votes || 0) + 1 }
            : option
        )
      }));

      showToast("투표가 완료되었습니다");
    } catch (error: any) {
      console.error('투표 실패:', error);
      if (error.code === 'permission-denied') {
        showToast("투표 권한이 없습니다", "비밀번호를 확인해주세요", "destructive");
      } else {
        showToast("투표에 실패했습니다", error.message, "destructive");
      }
    }
  };

  const copyToClipboard = async () => {
    if (!voteUrl) {
      showToast("복사할 URL이 없습니다", undefined, "destructive");
      return;
    }

    try {
      await navigator.clipboard.writeText(voteUrl);
      showToast("URL이 복사되었습니다");
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      // 대체 복사 방법 시도
      const textarea = document.createElement('textarea');
      textarea.value = voteUrl;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showToast("URL이 복사되었습니다");
      } catch (err) {
        showToast("URL 복사에 실패했습니다", undefined, "destructive");
      }
      document.body.removeChild(textarea);
    }
  };

  const handleDeleteVote = async () => {
    if (!isCreator || !initialVoteData?.id) return;

    try {
      setIsDeleting(true);

      // 먼저 모든 이미지 삭제
      for (const option of voteData.options) {
        for (const imageUrl of option.images) {
          try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
          } catch (error) {
            console.error('이미지 삭제 실패:', error);
          }
        }
      }

      // 투표 문서 삭제
      const voteRef = doc(db, 'votes', initialVoteData.id);
      await deleteDoc(voteRef);

      showToast("투표가 삭제되었습니다");
      
      // 메인 페이지로 리다이렉트
      window.location.href = '/votes/all';
    } catch (error) {
      console.error('투표 삭제 실패:', error);
      showToast("투표 삭제에 실패했습니다", undefined, "destructive");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDelete = () => {
    if (window.confirm('정말로 이 투표를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      handleDeleteVote();
    }
  };

  return (
    <div className="w-full p-6 space-y-6 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
      {isCreating ? (
        <>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="투표 제목"
              value={voteData.title}
              onChange={(e) => setVoteData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full"
            />
            <Input
              type="text"
              placeholder="투표 설명 (선택사항)"
              value={voteData.description}
              onChange={(e) => setVoteData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full"
            />
            <select
              value={voteData.category}
              onChange={(e) => setVoteData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full p-2 rounded-lg bg-transparent border border-white/20 text-white/90"
            >
              <option value="" className="bg-blue-900">카테고리 선택</option>
              {CATEGORIES.map(category => (
                <option key={category} value={category} className="bg-blue-900">
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-6">
            {voteData.options.map((option) => (
              <div key={option.id} className="bg-white/5 rounded-xl p-4 space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder={`투표 옵션 ${option.id}`}
                    value={option.text}
                    onChange={(e) => handleOptionChange(option.id, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="destructive"
                    onClick={() => handleRemoveOption(option.id)}
                    className="px-3"
                  >
                    X
                  </Button>
                </div>

                {/* 이미지 업로드 영역 */}
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    ref={el => {
                      if (el) fileInputRefs.current[option.id] = el;
                    }}
                    onChange={(e) => e.target.files && handleImageUpload(option.id, e.target.files)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={uploading || option.images.length >= 10}
                    onClick={() => fileInputRefs.current[option.id]?.click()}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {uploading ? '업로드 중...' : '이미지 추가'}
                    {option.images.length > 0 && ` (${option.images.length}/10)`}
                  </Button>

                  {/* 이미지 미리보기 */}
                  {option.images.length > 0 && (
                    <div className="grid grid-cols-5 gap-2">
                      {option.images.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <Image
                            src={imageUrl}
                            alt={`옵션 ${option.id} 이미지 ${index + 1}`}
                            width={100}
                            height={100}
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => handleRemoveImage(option.id, imageUrl)}
                            className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <Button onClick={handleAddOption} className="w-full">
              옵션 추가
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="passwordProtection"
                checked={voteData.isPasswordProtected}
                onChange={(e) => setVoteData(prev => ({ ...prev, isPasswordProtected: e.target.checked }))}
              />
              <label htmlFor="passwordProtection" className="text-white/80">비밀번호 보호</label>
            </div>

            {voteData.isPasswordProtected && (
              <Input
                type="password"
                placeholder="투표 비밀번호 설정"
                value={voteData.password}
                onChange={(e) => setVoteData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full"
              />
            )}
          </div>

          <Button onClick={handleCreateVote} className="w-full">
            투표 생성하기
          </Button>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white/90 mb-2">{voteData.title}</h2>
              {voteData.description && (
                <p className="text-white/70">{voteData.description}</p>
              )}
            </div>
            {isCreator && (
              <Button
                onClick={handleConfirmDelete}
                variant="destructive"
                disabled={isDeleting}
                className="px-4"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </Button>
            )}
          </div>

          {voteData.isPasswordProtected && !isCreator && !passwordVerified && (
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <Lock className="w-4 h-4 text-white/60" />
                <Input
                  type="password"
                  placeholder="투표 비밀번호 입력"
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                  className="flex-1"
                />
              </div>
              <Button 
                onClick={verifyPassword}
                className="w-full"
                variant="outline"
              >
                비밀번호 확인
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {voteData.options.map((option) => (
              <div key={option.id} className="bg-white/5 rounded-xl p-4 space-y-4">
                {isCreator || (voteData.isPasswordProtected && !passwordVerified) ? (
                  <div className="flex items-center justify-between w-full p-4 bg-white/5 rounded-lg">
                    <span>{option.text}</span>
                    <span>{option.votes || 0}표</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleVote(option.id)}
                    className="w-full justify-between"
                    variant="outline"
                  >
                    <span>{option.text}</span>
                    <span>{option.votes || 0}표</span>
                  </Button>
                )}

                {/* 이미지 표시 */}
                {option.images?.length > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {option.images.map((imageUrl, index) => (
                      <div key={index} className="relative">
                        <Image
                          loading="lazy"
                          src={imageUrl}
                          alt={`옵션 ${option.id} 이미지 ${index + 1}`}
                          width={100}
                          height={100}
                          className="w-full h-20 object-cover rounded-lg"
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 items-center bg-white/5 p-3 rounded-lg">
            <Input
              type="text"
              value={voteUrl}
              readOnly
              className="flex-1"
            />
            <Button onClick={copyToClipboard} className="whitespace-nowrap">
              <Copy className="w-4 h-4 mr-2" />
              URL 복사
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 