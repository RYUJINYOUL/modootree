'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Image from 'next/image';
import { useSelector } from 'react-redux';
import { Button } from "@/components/ui/button"
import { cn } from '@/lib/utils';
import { uploadLinkImage } from '@/hooks/useUploadImage';


interface LinkItem {
  image: string;
  title: string;
  url: string;
  bgColor?: string;
  textColor?: string;
  opacity?: number;
}

const COLOR_PALETTE = [
  'transparent',
  '#000000', '#FFFFFF', '#F87171', '#FBBF24',
  '#34D399', '#60A5FA', '#A78BFA', '#F472B6',
];

export default function LinkCards() {
  const pathname = usePathname();
  const isEditable = pathname.startsWith('/editor');
  const { currentUser } = useSelector((state: any) => state.user);
  const uid = currentUser?.uid;
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [ widths, setWidths ] = useState(false);

  useEffect(() => {
    const fetchLinks = async () => {
      if (!uid) return;
      try {
        const docRef = doc(db, 'users', uid, 'info', 'main');
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
  }, [uid]);

  const saveLinks = async (updatedLinks: LinkItem[]) => {
    if (!uid) return;
    try {
      const docRef = doc(db, 'users', uid, 'info', 'main');
      await setDoc(docRef, { links: updatedLinks }, { merge: true });
      setLinks(updatedLinks);
    } catch (err) {
      console.error('링크 저장 실패:', err);
    }
  };

  const handleImageChange = async (index: number, file: File) => {
    try {
      const url = await uploadLinkImage(file);
      const updated = [...links];
      updated[index].image = url;
      await saveLinks(updated);
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
    }
  };

  const addNewLink = async () => {
    const newLink: LinkItem = {
      image: '/new/upload.png',
      title: '모두트리',
      url: '',
      bgColor: '#ffffff',
      textColor: '#000000',
      opacity: 1,
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
    const updated = [...links];
    updated.splice(index, 1);
    await saveLinks(updated);
  };

  const moveLink = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= links.length) return;
    const updated = [...links];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    await saveLinks(updated);
  };

  return (
    <section className={cn("space-y-4 p-2",isEditable&&"p-2")}>
      {links.map((link, index) => (
       <div className='flex flex-col'>
        <div
          key={index}
          className={cn("grid grid-cols-2 items-center p-2 rounded-2xl shadow gap-4 transition-all" ,isEditable&&"flex flex-row")}
          style={{
            backgroundColor: link.bgColor || '#ffffff',
            opacity: link.opacity ?? 1,
            color: link.textColor || '#000000',
          }}
        >
          {/* 이미지 업로드 input */}
          <input
            type="file"
            accept="image/*"
            ref={(el: HTMLInputElement | null) => {
              fileInputRefs.current[index] = el;
            }}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageChange(index, file);
            }}
          />

          {/* 이미지 */}
       
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

          {/* 제목 링크 */}
      <div className=''>
          {isEditable ? (
        <span className="text-[18px] font-semibold">{link.title}</span>
          ) : (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[18px] font-semibold hover:underline text-center"
              style={{ color: link.textColor || '#000000' }}
            >
              {link.title}
            </a>
          )}
      </div>

          {/* 편집/삭제/이동 버튼 */}
          {isEditable && (
            <div className="flex flex-wrap gap-1 ml-auto">
              <Button
                onClick={() => { widths ? setWidths(false) : setWidths(true)}}
                className='bg-white text-black' size="xm"
              >
                C
              </Button>
              <Button
                onClick={() => handleEdit(index)}
                className='bg-white text-black' size="xm"
              >
                ✎
              </Button>
              <Button
                onClick={() => moveLink(index, index - 1)}
                className='bg-white text-black' size="xm"
              >
                ↑
              </Button>
              <Button
                onClick={() => moveLink(index, index + 1)}
                className='bg-white text-black' size="xm"
              >
                ↓
              </Button>
              <Button
                onClick={() => onDeleteLink(index)}
                className='bg-white text-black' size="xm"
              >
                X
              </Button>
            </div>
            
          )}
          </div>

          {/* 색상 및 투명도 편집 */}    
          {isEditable && widths&& (     //0번째 열림 ?? 0번째 클릭을 어떻게 정의
            <div className='flex flex-col gap-2'>
            <div className="w-full flex flex-wrap items-center gap-2 mt-2 ml-4">
              <label className="text-sm font-medium">배경색 :</label>
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
               <label className="text-sm font-medium ml-4">투명도:</label>
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

              <div className='w-full flex flex-wrap items-center gap-2 mt-2 ml-4'>
              <label className="text-sm font-medium">텍스트색 :</label>
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
      


      {/* 새 링크 추가 버튼 */}
      {isEditable && (
        <button
          onClick={addNewLink}
          className="w-full mt-4 p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 mb-3"
        >
          새 링크 추가
        </button>
      )}
    </section>
  );
}
