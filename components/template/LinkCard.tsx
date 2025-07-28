'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Image from 'next/image';
import { useSelector } from 'react-redux';
import { Button } from "@/components/ui/button"
import { cn } from '@/lib/utils';
import { uploadLinkImage, deleteImageFromStorage } from '@/hooks/useUploadImage';


interface LinkItem {
  image: string;
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

// CSS 애니메이션 키프레임 추가
const floatingAnimation = `
  @keyframes floating {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }
`;

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

  useEffect(() => {
    const fetchLinks = async () => {
      if (!finalUid) return;
      try {
        const docRef = doc(db, 'users', finalUid, 'info', 'main');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setLinks(data.links || []);
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
      if (linkToDelete.image && !linkToDelete.image.startsWith('/new/defaultLogo.png')) {
        await deleteImageFromStorage(linkToDelete.image);
      }
      const url = await uploadLinkImage(file, finalUid);
      const updated = [...links];
      updated[index].image = url;
      await saveLinks(updated);
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
    }
  };

  const addNewLink = async () => {
    const newLink: LinkItem = {
      image: '/new/defaultLogo.png',
      title: '제목,링크 등록',
      url: '',
      bgColor: '#ffffff',
      textColor: '#000000',
      opacity: 1,
      rounded: 'md',    // 기본값 설정
      shadow: 'none',    // 기본값 설정
      shadowColor: '#000000',  // 기본 그림자 색상
      shadowOpacity: 0.2,  // 기본 그림자 투명도
    };
    const updated = [...links, newLink];
    await saveLinks(updated);
  };

  const handleEdit = async (index: number) => {
    if (!isEditable) return;
    const newTitle = prompt('제목을 입력하세요', links[index].title);
    const newUrl = prompt('링크 주소를 입력하세요', links[index].url);
    if (!newTitle || !newUrl) return;

    const updated = [...links];
    updated[index].title = newTitle;
    updated[index].url = newUrl;
    await saveLinks(updated);
  };

  const onDeleteLink = async (index: number) => {
    if (window.confirm('정말로 이 링크를 삭제하시겠습니까?')) {
      const linkToDelete = links[index];

      try {
        if (linkToDelete.image && !linkToDelete.image.startsWith('/new/defaultLogo.png')) {
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

  const getStyleObject = (link: LinkItem) => {
    const shadowColor = link.shadowColor 
      ? `rgba(${parseInt(link.shadowColor.slice(1, 3), 16)}, ${parseInt(link.shadowColor.slice(3, 5), 16)}, ${parseInt(link.shadowColor.slice(5, 7), 16)}, ${link.shadowOpacity ?? 0.2})`
      : 'rgba(0, 0, 0, 0.2)';
    
    switch (link.shadow) {
      case 'none':
        return { boxShadow: 'none' };
      case 'sm':
        return { boxShadow: `0 1px 2px ${shadowColor}` };
      case 'md':
        return { boxShadow: `0 4px 6px ${shadowColor}` };
      case 'lg':
        return { boxShadow: `0 10px 15px ${shadowColor}` };
      case 'retro':
        return { boxShadow: `8px 8px 0px 0px ${shadowColor}` };
      case 'float':
        return { boxShadow: `0 10px 20px -5px ${shadowColor}` };
      case 'glow':
        return { boxShadow: `0 0 20px ${shadowColor}` };
      case 'inner':
        return { boxShadow: `inset 0 2px 4px ${shadowColor}` };
      case 'sharp':
        return { boxShadow: `-10px 10px 0px ${shadowColor}` };
      case 'soft':
        return { boxShadow: `0 5px 15px ${shadowColor}` };
      case 'stripe':
        return { boxShadow: `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}` };
      case 'cross':
        return { boxShadow: `4px 4px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, 4px -4px 0 ${shadowColor}, -4px 4px 0 ${shadowColor}` };
      case 'diagonal':
        return { boxShadow: `4px 4px 0 ${shadowColor}, 8px 8px 0 ${shadowColor}, 12px 12px 0 ${shadowColor}, -4px -4px 0 ${shadowColor}, -8px -8px 0 ${shadowColor}, -12px -12px 0 ${shadowColor}` };
      default:
        return { boxShadow: 'none' };
    }
  };

  return (
    <div className='flex items-center justify-center w-full'>
      <style jsx global>{`
        @keyframes floating {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .floating-animation {
          animation: floating 5s ease-in-out infinite;
        }
      `}</style>
      <section className="space-y-4 pt-3 p-2 md:w-[1100px] w-full">
        {links.map((link, index) => (
          <div className='flex flex-col' key={index}>
            <div
              className={cn(
                "flex flex-row items-center justify-center p-2 gap-6",
                "transition-all duration-300 ease-in-out",
                "hover:-translate-y-1 active:-translate-y-1",
                "touch-manipulation",
                "floating-animation",
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
                  if (file) handleImageChange(index, file);
                }}
              />

              {/* 이미지 */}
              <div className="flex-shrink-0">
                <Image
                  src={link.image}
                  width={50}
                  height={50}
                  alt="link"
                  className={cn(
                    'rounded-xl object-cover w-[50px] h-[50px] transition-opacity duration-200',
                    isEditable ? 'cursor-pointer hover:opacity-80 active:opacity-80' : 'cursor-default'
                  )}
                  onClick={() => isEditable && fileInputRefs.current[index]?.click()}
                />
              </div>

              {/* 제목 링크 - 중앙에서 살짝 왼쪽으로 */}
              <div className="flex-grow text-center pr-12"> {/* padding-right 추가 */}
                {isEditable ? (
                  <span className="text-[16px] font-semibold">{link.title}</span>
                ) : (
                  <a
                    href={link.url.startsWith('http://') || link.url.startsWith('https://') ? link.url : `https://${link.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[16px] font-semibold hover:underline"
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
                    className='bg-white text-black' 
                    size="sm"
                  >
                    C
                  </Button>
                  <Button
                    onClick={() => handleEdit(index)}
                    className='bg-white text-black'
                    size="sm"
                  >
                    ✎
                  </Button>
                  <Button
                    onClick={() => moveLink(index, index - 1)}
                    className='bg-white text-black'
                    size="sm"
                  >
                    ↑
                  </Button>
                  <Button
                    onClick={() => moveLink(index, index + 1)}
                    className='bg-white text-black'
                    size="sm"
                  >
                    ↓
                  </Button>
                  <Button
                    onClick={() => onDeleteLink(index)}
                    className='bg-white text-black'
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
            className="w-full mt-4 p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 mb-3"
          >
            새 링크 추가
          </button>
        )}
      </section>
    </div>
  );
}