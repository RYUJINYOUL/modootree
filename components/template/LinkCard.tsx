'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Image from 'next/image';
import { useSelector } from 'react-redux';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { uploadLinkImage, deleteImageFromStorage } from '@/hooks/useUploadImage';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface LinkItem {
  image: string | null;
  title: string;
  url: string;
  bgColor?: string;
  textColor?: string;
  opacity?: number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';  // 둥근 모서리 옵션 추가
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'retro' | 'float' | 'glow' | 'inner' | 'sharp' | 'soft' | 'stripe' | 'cross' | 'diagonal';           // 그림자 옵션 추가
  shadowColor?: string;  // 그림자 색상 추가
  shadowOpacity?: number;  // 그림자 투명도 추가
}

type LogoProps = {
  username?: string;
  uid?: string;
};

const COLOR_PALETTE = [
  'transparent',
  '#000000', '#FFFFFF', '#F87171', '#FBBF24',
  '#34D399', '#60A5FA', '#A78BFA', '#F472B6',
];

const floatingAnimation = `
@keyframes floating {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.animate-floating {
  animation: floating 5s ease-in-out infinite;
}
`;

// SNS 로고 목록 추가
const SNS_LOGOS = [
  { name: 'Instagram', url: '/Image/sns/instagram.png' },
  { name: 'Facebook', url: '/Image/sns/facebook.png' },
  { name: 'YouTube', url: '/Image/sns/youtube.png' },
  { name: 'TikTok', url: '/Image/sns/tiktok.png' },
  { name: 'Discord', url: '/Image/sns/discord.png' },
  { name: 'Telegram', url: '/Image/sns/telegram.png' },
  { name: 'WhatsApp', url: '/Image/sns/whatsapp.png' },
  { name: 'Line', url: '/Image/sns/line.png' },
  { name: 'KakaoTalk', url: '/Image/sns/kakaotalk.png' },
  { name: 'Naver Blog', url: '/Image/sns/naver.png' },
  { name: 'apple', url: '/Image/sns/apple.png' },
  { name: 'gmail', url: '/Image/sns/gmail.png' },
  { name: 'xxx', url: '/Image/sns/xxx.png' },
  { name: 'map', url: '/Image/sns/maps.png' },
  { name: 'map', url: '/Image/sns/modoo.png' },
  { name: 'school', url: '/Image/sns/schoolLogo.png' },
  { name: 'Custom', url: '/Image/defaultLogo.png' },
];

export default function LinkCards({ username, uid }: LogoProps) {
  const pathname = usePathname();
  const isEditable = pathname ? pathname.startsWith('/editor') : false;
  
  // Redux 상태 안전하게 처리
  const currentUser = useSelector((state: any) => state.user?.currentUser) ?? null;

  const finalUid = uid ?? currentUser?.uid;
  const finalUsername = username ?? currentUser?.username ?? "사이트";

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [openSettingsIndex, setOpenSettingsIndex] = useState<number | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string>('');
  const [currentEditingIndex, setCurrentEditingIndex] = useState<number>(-1);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 100,
    height: 100,
    x: 0,
    y: 0
  });
  const imgRef = useRef<HTMLImageElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [showLogoDialog, setShowLogoDialog] = useState(false);
  const [selectedLogoIndex, setSelectedLogoIndex] = useState<number>(-1);


  useEffect(() => {
    const fetchLinks = async () => {
      if (!finalUid) return;
      try {
        const docRef = doc(db, 'users', finalUid, 'info', 'main');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (!data.links || data.links.length === 0) {
            // 기본 링크 2개 설정
            const defaultLinks: LinkItem[] = [
              {
                image: '/Image/sns/modoo.png',
                title: '모두트리',
                url: 'https://modootree.com',
                bgColor: '#60A5FA',
                textColor: '#FFFFFF',
                opacity: 1,
                rounded: 'md',
                shadow: 'none',
                shadowColor: '#000000',
                shadowOpacity: 0.2,
              },
              {
                image: '/Image/sns/instagram.png',
                title: '인스타그램',
                url: 'https://instagram.com',
                bgColor: '#60A5FA',
                textColor: '#FFFFFF',
                opacity: 1,
                rounded: 'md',
                shadow: 'none',
                shadowColor: '#000000',
                shadowOpacity: 0.2,
              }
            ];
            await setDoc(docRef, { links: defaultLinks }, { merge: true });
            setLinks(defaultLinks);
          } else {
            setLinks(data.links);
          }
        } else {
          // 문서가 없는 경우에도 기본 링크 2개 설정
          const defaultLinks: LinkItem[] = [
            {
              image: '/Image/sns/modoo.png',
              title: '모두트리',
              url: 'https://modootree.com',
              bgColor: '#ffffff',
              textColor: '#000000',
              opacity: 1,
              rounded: 'md',
              shadow: 'none',
              shadowColor: '#000000',
              shadowOpacity: 0.2,
            },
            {
              image: '/Image/sns/instagram.png',
              title: '인스타그램',
              url: 'https://instagram.com',
              bgColor: '#ffffff',
              textColor: '#000000',
              opacity: 1,
              rounded: 'md',
              shadow: 'none',
              shadowColor: '#000000',
              shadowOpacity: 0.2,
            }
          ];
          await setDoc(docRef, { links: defaultLinks }, { merge: true });
          setLinks(defaultLinks);
        }
      } catch (err) {
        console.error('링크 불러오기 실패:', err);
      }
    };
    fetchLinks();
  }, [finalUid]);

  const saveLinks = async (updatedLinks: LinkItem[]) => {
    if (!finalUid) return;
    try {
      const docRef = doc(db, 'users', finalUid, 'info', 'main');
      await setDoc(docRef, { links: updatedLinks }, { merge: true });
      setLinks(updatedLinks);
    } catch (err) {
      console.error('링크 저장 실패:', err);
    }
  };

  const handleImageChange = async (index: number, file: File) => {
    try {
      const linkToDelete = links[index];
      // 정적 이미지(/Image/ 또는 /image/)는 삭제 시도하지 않음
      if (linkToDelete.image && 
          !linkToDelete.image.startsWith('/Image/') && 
          !linkToDelete.image.startsWith('/image/')) {
        await deleteImageFromStorage(linkToDelete.image);
      }
      const url = await uploadLinkImage(file, finalUid);
      if (url) {
        const updated = [...links];
        updated[index].image = url;
        await saveLinks(updated);
      } else {
        console.error('이미지 업로드 실패');
      }
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
    }
  };

  const handleImageSelect = (index: number, file: File) => {
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

    // 임시 URL 생성
    const reader = new FileReader();
    reader.onload = () => {
      setTempImageUrl(reader.result as string);
      setCurrentEditingIndex(index);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const cropImage = async () => {
    if (!imgRef.current || currentEditingIndex === -1) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 크기 설정 (정사각형으로)
    canvas.width = 400;
    canvas.height = 400;

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
        const croppedFile = new File([blob], 'cropped_link_image.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve(croppedFile);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleCropComplete = async () => {
    try {
      const croppedFile = await cropImage();
      if (!croppedFile) return;
      
      await handleImageChange(currentEditingIndex, croppedFile);
      setCropDialogOpen(false);
      setTempImageUrl('');
      setCurrentEditingIndex(-1);
    } catch (error) {
      console.error('Error cropping image:', error);
      alert('이미지 크롭 중 오류가 발생했습니다.');
    }
  };

  const addNewLink = async () => {
    const newLink: LinkItem = {
      image: '/Image/defaultLogo.png',  // 기본 이미지 경로
      title: '제목,링크 등록',
      url: '',
      bgColor: '#ffffff',
      textColor: '#000000',
      opacity: 1,
      rounded: 'md',
      shadow: 'none',
      shadowColor: '#000000',
      shadowOpacity: 0.2,
    };
    const updated = [...links, newLink];
    await saveLinks(updated);
  };

  const handleEdit = (index: number) => {
    if (!isEditable) return;
    setEditingIndex(index);
    setEditTitle(links[index].title);
    setEditUrl(links[index].url);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (editingIndex === -1) return;
    if (!editTitle || !editUrl) {
      alert('제목과 링크 주소를 모두 입력해주세요.');
      return;
    }

    const updated = [...links];
    updated[editingIndex].title = editTitle;
    updated[editingIndex].url = editUrl;
    await saveLinks(updated);
    
    setEditDialogOpen(false);
    setEditingIndex(-1);
    setEditTitle('');
    setEditUrl('');
  };

  const onDeleteLink = async (index: number) => {
    if (window.confirm('정말로 이 링크를 삭제하시겠습니까?')) {
      const linkToDelete = links[index];

      try {
      // 정적 이미지(/Image/ 또는 /image/)는 삭제 시도하지 않음
      if (linkToDelete.image && 
          !linkToDelete.image.startsWith('/Image/') && 
          !linkToDelete.image.startsWith('/image/')) {
        await deleteImageFromStorage(linkToDelete.image);
        }

        const updatedLinks = [...links];
        updatedLinks.splice(index, 1);
        await saveLinks(updatedLinks);

        if (openSettingsIndex === index) {
          setOpenSettingsIndex(null);
        } else if (openSettingsIndex !== null && openSettingsIndex > index) {
          setOpenSettingsIndex(openSettingsIndex - 1);
        }
      } catch (error) {
        console.error('링크 삭제 중 오류 발생:', error);
        alert('링크 삭제에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  const moveLink = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= links.length) return;
    const updated = [...links];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    await saveLinks(updated);
    if (openSettingsIndex === fromIndex) {
      setOpenSettingsIndex(toIndex);
    }
  };

  // 이미지 클릭 핸들러 수정
  const handleImageClick = (index: number) => {
    if (!isEditable) return;
    setSelectedLogoIndex(index);
    setShowLogoDialog(true);
  };

  // SNS 로고 선택 핸들러
  const handleSelectLogo = async (logoUrl: string) => {
    if (selectedLogoIndex === -1) return;

    const updated = [...links];
    updated[selectedLogoIndex].image = logoUrl;
    await saveLinks(updated);
    setShowLogoDialog(false);
    setSelectedLogoIndex(-1);
  };

  return (
    <>
    <div className='flex items-center justify-center w-full'>
      <section className="space-y-4 pt-3 p-2 md:w-[1100px] w-full">
        {links.map((link, index) => (
          <div className='flex flex-col' key={index}>
            <div
              className={cn(
                  "flex flex-row items-center justify-center p-2 md:p-3 gap-3 md:gap-6 transition-all duration-300 ease-in-out hover:-translate-y-1 animate-floating",
                isEditable && "flex flex-row",
                // 둥근 모서리 스타일
                link.rounded === 'none' && 'rounded-none',
                link.rounded === 'sm' && 'rounded',
                link.rounded === 'md' && 'rounded-lg',
                link.rounded === 'lg' && 'rounded-xl',
                link.rounded === 'full' && 'rounded-full',
              )}
              style={{
                backgroundColor: link.bgColor ? `rgba(${parseInt(link.bgColor.slice(1, 3), 16)}, ${parseInt(link.bgColor.slice(3, 5), 16)}, ${parseInt(link.bgColor.slice(5, 7), 16)}, ${link.opacity ?? 1})` : `rgba(255, 255, 255, ${link.opacity ?? 1})`,
                color: link.textColor || '#000000',
                boxShadow: (() => {
                  const shadowColor = link.shadowColor 
                    ? `rgba(${parseInt(link.shadowColor.slice(1, 3), 16)}, ${parseInt(link.shadowColor.slice(3, 5), 16)}, ${parseInt(link.shadowColor.slice(5, 7), 16)}, ${link.shadowOpacity ?? 0.2})`
                    : 'rgba(0, 0, 0, 0.2)';
                  
                  switch (link.shadow) {
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
                borderColor: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(link.shadow || '') ? link.shadowColor || '#000000' : undefined,
                borderWidth: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(link.shadow || '') ? '2px' : undefined,
                borderStyle: ['retro', 'sharp', 'stripe', 'cross', 'diagonal'].includes(link.shadow || '') ? 'solid' : undefined,
              }}
            >
              <input
                type="file"
                accept="image/*"
                ref={(el: HTMLInputElement | null) => {
                  if (fileInputRefs.current) {
                    fileInputRefs.current[index] = el;
                  }
                }}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                    if (file) handleImageSelect(index, file);
                }}
              />

              {/* 이미지 */}
              <div className="flex-shrink-0">
                <Image
                  src={link.image || '/Image/defaultLogo.png'}
                  width={50}
                  height={50}
                  alt="link"
                  className={cn(
                      'rounded-xl object-cover w-[40px] h-[40px] md:w-[50px] md:h-[50px]',
                    isEditable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                  )}
                    onClick={() => isEditable && handleImageClick(index)}
                />
              </div>

              {/* 제목 링크 - 중앙에서 살짝 왼쪽으로 */}
                <div className="flex-grow text-center pr-8 md:pr-12"> {/* padding-right 추가 */}
                {isEditable ? (
                    <span className="text-[14px] md:text-[16px] font-semibold">{link.title}</span>
                ) : (
                  <a
                    href={link.url.startsWith('http://') || link.url.startsWith('https://') ? link.url : `https://${link.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                      className="text-[14px] md:text-[16px] font-semibold hover:underline"
                    style={{ color: link.textColor || '#000000' }}
                  >
                    {link.title}
                  </a>
                )}
              </div>

              {/* 편집 버튼들 */}
              {isEditable && (
                <div className="flex flex-wrap gap-1 ml-auto">
                  <Button
                    onClick={() => setOpenSettingsIndex(openSettingsIndex === index ? null : index)}
                      className='bg-white text-black min-w-[28px] h-[28px] md:min-w-[32px] md:h-[32px] p-0' 
                    size="sm"
                  >
                    C
                  </Button>
                  <Button
                    onClick={() => handleEdit(index)}
                      className='bg-white text-black min-w-[28px] h-[28px] md:min-w-[32px] md:h-[32px] p-0'
                    size="sm"
                  >
                    ✎
                  </Button>
                  <Button
                    onClick={() => moveLink(index, index - 1)}
                      className='bg-white text-black min-w-[28px] h-[28px] md:min-w-[32px] md:h-[32px] p-0'
                    size="sm"
                  >
                    ↑
                  </Button>
                  <Button
                    onClick={() => moveLink(index, index + 1)}
                      className='bg-white text-black min-w-[28px] h-[28px] md:min-w-[32px] md:h-[32px] p-0'
                    size="sm"
                  >
                    ↓
                  </Button>
                  <Button
                    onClick={() => onDeleteLink(index)}
                      className='bg-white text-black min-w-[28px] h-[28px] md:min-w-[32px] md:h-[32px] p-0'
                    size="sm"
                  >
                    X
                  </Button>
                </div>
              )}
            </div>

            {isEditable && openSettingsIndex === index && (
              <div className='flex flex-col gap-4 bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 mt-2 shadow-lg border border-gray-700'>
                {/* 1. 배경색 설정 */}
                <div className="flex flex-col gap-2 bg-gray-700/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-100 w-24">배경색</span>
                    <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                      {COLOR_PALETTE.map((color) => (
                        <button
                          key={color}
                          className={cn(
                            "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                            link.bgColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            const updated = [...links];
                            updated[index].bgColor = color;
                            saveLinks(updated);
                          }}
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
                      value={link.opacity ?? 1}
                      onChange={(e) => {
                        const updated = [...links];
                        updated[index].opacity = parseFloat(e.target.value);
                        saveLinks(updated);
                      }}
                      className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm text-gray-100 w-12 text-right">
                      {(link.opacity ?? 1).toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* 2. 텍스트 색상 설정 */}
                <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
                  <span className="text-sm font-medium text-gray-100 w-24">텍스트</span>
                  <div className="flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
                    {COLOR_PALETTE.map((color) => (
                      <button
                        key={color + '-text'}
                        className={cn(
                          "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                          link.textColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          const updated = [...links];
                          updated[index].textColor = color;
                          saveLinks(updated);
                        }}
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
                          key={color + '-shadow'}
                          className={cn(
                            "w-6 h-6 rounded-full border border-gray-600 transition-transform hover:scale-110",
                            link.shadowColor === color && "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            const updated = [...links];
                            updated[index].shadowColor = color;
                            saveLinks(updated);
                          }}
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
                      value={link.shadowOpacity ?? 0.2}
                      onChange={(e) => {
                        const updated = [...links];
                        updated[index].shadowOpacity = parseFloat(e.target.value);
                        saveLinks(updated);
                      }}
                      className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm text-gray-100 w-12 text-right">
                      {(link.shadowOpacity ?? 0.2).toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* 4. 모서리와 그림자 스타일 설정 */}
                <div className="flex flex-col gap-4 bg-gray-700/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-100 w-24">모서리</span>
                    <select
                      value={link.rounded || 'md'}
                      onChange={(e) => {
                        const updated = [...links];
                        updated[index].rounded = e.target.value as LinkItem['rounded'];
                        saveLinks(updated);
                      }}
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
                      value={link.shadow || 'none'}
                      onChange={(e) => {
                        const updated = [...links];
                        updated[index].shadow = e.target.value as LinkItem['shadow'];
                        saveLinks(updated);
                      }}
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
        ))}

        {isEditable && (
          <button
            onClick={addNewLink}
              className="w-full mt-4 p-2 md:p-3 bg-blue-500 text-white text-sm md:text-base rounded-xl hover:bg-blue-600 mb-3"
          >
            새 링크 추가
          </button>
        )}
      </section>
    </div>

      {/* 이미지 크롭 다이얼로그 */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>로고 이미지 크롭</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {tempImageUrl && (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                aspect={1}
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
                setCurrentEditingIndex(-1);
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

      {/* 편집 다이얼로그 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>링크 수정</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="제목을 입력하세요 (이모지 사용 가능 😊)"
                className="h-12"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="url">링크 주소</Label>
              <Input
                id="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://example.com"
                className="h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setEditingIndex(-1);
                setEditTitle('');
                setEditUrl('');
              }}
            >
              취소
            </Button>
            <Button onClick={handleEditSubmit}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SNS 로고 선택 다이얼로그 */}
      <Dialog open={showLogoDialog} onOpenChange={setShowLogoDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>로고 선택</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="sns" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sns">SNS 로고</TabsTrigger>
              <TabsTrigger value="upload">이미지 업로드</TabsTrigger>
            </TabsList>
            <TabsContent value="sns" className="py-4">
              <div className="grid grid-cols-4 md:grid-cols-5 gap-4">
                {SNS_LOGOS.map((logo, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectLogo(logo.url)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex flex-col items-center gap-2"
                  >
                    <Image
                      src={logo.url}
                      alt={logo.name}
                      width={40}
                      height={40}
                      className="rounded-lg"
                    />
                    <span className="text-xs text-gray-600">{logo.name}</span>
                  </button>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="upload" className="py-4">
              <div className="flex flex-col items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  ref={(el) => {
                    if (fileInputRefs.current && selectedLogoIndex !== -1) {
                      fileInputRefs.current[selectedLogoIndex] = el;
                    }
                  }}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageChange(selectedLogoIndex, file);
                    setShowLogoDialog(false);
                  }}
                />
                <Button
                  onClick={() => fileInputRefs.current[selectedLogoIndex]?.click()}
                  className="w-full"
                >
                  이미지 선택
                </Button>
                <p className="text-sm text-gray-500 text-center">
                  또는 이미지를 이곳에 드래그 앤 드롭하세요
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}