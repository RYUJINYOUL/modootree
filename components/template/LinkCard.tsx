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
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'retro' | 'retro-black' | 'retro-sky' | 'retro-gray' | 'retro-white';           // 그림자 옵션 추가
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
      shadow: 'none'    // 기본값 설정
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

  return (
    <div className='flex items-center justify-center w-full'>
      <section className="space-y-4 pt-3 p-2 md:w-[1100px] w-full">
        {links.map((link, index) => (
          <div className='flex flex-col' key={index}>
            <div
              className={cn(
                "flex flex-row items-center justify-center p-2 gap-6 transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl", // 호버 애니메이션 추가
                isEditable && "flex flex-row",
                // 둥근 모서리 스타일
                link.rounded === 'none' && 'rounded-none',
                link.rounded === 'sm' && 'rounded',
                link.rounded === 'md' && 'rounded-lg',
                link.rounded === 'lg' && 'rounded-xl',
                link.rounded === 'full' && 'rounded-full',
                // 그림자 스타일
                link.shadow === 'none' && 'shadow-none hover:shadow-xl',
                link.shadow === 'sm' && 'shadow-sm hover:shadow-xl',
                link.shadow === 'md' && 'shadow hover:shadow-xl',
                link.shadow === 'lg' && 'shadow-lg hover:shadow-xl',
                // 레트로 그림자 스타일 - 호버 시 그림자 크기 증가
                link.shadow === 'retro' && 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]',
                link.shadow === 'retro-black' && 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]',
                link.shadow === 'retro-sky' && 'shadow-[8px_8px_0px_0px_rgba(2,132,199,1)] hover:shadow-[10px_10px_0px_0px_rgba(2,132,199,1)]',
                link.shadow === 'retro-gray' && 'shadow-[8px_8px_0px_0px_rgba(107,114,128,1)] hover:shadow-[10px_10px_0px_0px_rgba(107,114,128,1)]',
                link.shadow === 'retro-white' && 'shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:shadow-[10px_10px_0px_0px_rgba(255,255,255,1)]'
              )}
              style={{
                backgroundColor: link.bgColor ? `rgba(${parseInt(link.bgColor.slice(1, 3), 16)}, ${parseInt(link.bgColor.slice(3, 5), 16)}, ${parseInt(link.bgColor.slice(5, 7), 16)}, ${link.opacity ?? 1})` : `rgba(255, 255, 255, ${link.opacity ?? 1})`,
                color: link.textColor || '#000000',
                ...(link.shadow?.includes('retro') && { 
                  border: link.shadow === 'retro-sky' ? '2px solid rgb(2 132 199)' :
                         link.shadow === 'retro-gray' ? '2px solid rgb(107 114 128)' :
                         link.shadow === 'retro-white' ? '2px solid rgb(255 255 255)' :
                         '2px solid rgb(0 0 0)'
                })
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
                    'rounded-xl object-cover w-[50px] h-[50px]',
                    isEditable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
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
              <div className='flex flex-col gap-2'>
                <div className="w-full flex flex-wrap items-center gap-2 mt-2 ml-4">
                  <label className="text-sm font-medium text-gray-500">배경색 :</label>
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      className="w-5 h-5 rounded-full border"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        const updated = [...links];
                        updated[index].bgColor = color;
                        saveLinks(updated);
                      }}
                    />
                  ))}
                  <label className="text-sm font-medium ml-4 text-gray-500">투명도:</label>
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
                    className="w-24"
                  />
                  <span className="text-sm">{(link.opacity ?? 1).toFixed(1)}</span>
                </div>

                {/* 새로운 스타일 설정 추가 */}
                <div className="w-full flex flex-wrap items-center gap-2 mt-2 ml-4">
                  <label className="text-sm font-medium text-gray-500">모서리:</label>
                  <select
                    value={link.rounded || 'md'}
                    onChange={(e) => {
                      const updated = [...links];
                      updated[index].rounded = e.target.value as LinkItem['rounded'];
                      saveLinks(updated);
                    }}
                    className="rounded border p-1"
                  >
                    <option value="none">각진</option>
                    <option value="sm">약간 둥근</option>
                    <option value="md">둥근</option>
                    <option value="lg">많이 둥근</option>
                    <option value="full">완전 둥근</option>
                  </select>

                  <label className="text-sm font-medium ml-4 text-gray-500">그림자:</label>
                  <select
                    value={link.shadow || 'none'}
                    onChange={(e) => {
                      const updated = [...links];
                      updated[index].shadow = e.target.value as LinkItem['shadow'];
                      saveLinks(updated);
                    }}
                    className="rounded border p-1"
                  >
                    <option value="none">없음</option>
                    <option value="sm">약한</option>
                    <option value="md">보통</option>
                    <option value="lg">강한</option>
                    <option value="retro">레트로</option>
                    <option value="retro-black">레트로-블랙</option>
                    <option value="retro-sky">레트로-하늘</option>
                    <option value="retro-gray">레트로-회색</option>
                    <option value="retro-white">레트로-하얀</option>
                  </select>
                </div>

                <div className='w-full flex flex-wrap items-center gap-2 mt-2 ml-4'>
                  <label className="text-sm font-medium text-gray-500">텍스트색 :</label>
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color + '-text'}
                      className="w-5 h-5 rounded-full border"
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