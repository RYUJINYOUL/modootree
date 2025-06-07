'use client';
import { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ComponentLibrary } from '@/components/edit/ComponentLibrary';
import { useSelector } from 'react-redux';
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export default function EditorCanvas() {
  const [components, setComponents] = useState<string[]>([]);
  const { currentUser } = useSelector((state: any) => state.user);
  const uid = currentUser?.uid;

  // 🔹 Firebase에서 로드
  useEffect(() => {
    const load = async () => {
      const docRef = doc(db, 'users', uid, 'links', 'page');
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setComponents(snapshot.data().components || []);
      }
    };
    if (uid) load();
  }, [uid]);

  // 🔹 Firebase에 저장
  useEffect(() => {
    const save = async () => {
      const docRef = doc(db, 'users', uid, 'links', 'page');
      await setDoc(docRef, { components });
    };
    if (uid) save();
  }, [components, uid]);

  // 🔹 컴포넌트 추가
  const handleAdd = (type: string) => {
    setComponents(prev => [...prev, type]);
  };

  // 🔹 삭제
  const handleRemove = (index: number) => {
    setComponents(prev => prev.filter((_, i) => i !== index));
  };

  // 🔹 위로 이동
  const moveUp = (index: number) => {
    if (index === 0) return;
    setComponents(prev => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated;
    });
  };

  // 🔹 아래로 이동
  const moveDown = (index: number) => {
    if (index === components.length - 1) return;
    setComponents(prev => {
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      return updated;
    });
  };

  return (
    <div className="space-y-2">

      {/* 🔹 현재 추가된 컴포넌트 목록 */}
      {components.map((type, idx) => (
        <div key={idx} className="p-2 bg-gray-200 rounded flex items-center justify-between gap-2">
          <span>{type}</span>
          <div className="flex items-center gap-1">
            <Button onClick={() => moveUp(idx)} size="sm">↑</Button>
            <Button onClick={() => moveDown(idx)} size="sm">↓</Button>
            <Button onClick={() => handleRemove(idx)} variant="destructive" size="sm">❌</Button>
          </div>
        </div>
      ))}

      {/* 🔹 미리보기 영역 */}
      <div className="min-h-[400px] border p-4 bg-white rounded mt-10">
        <h2 className="font-bold text-center mb-5">미리보기</h2>
        {components.map((type, idx) => {
          const Comp = ComponentLibrary[type];
          return Comp ? <Comp key={idx} /> : null;
        })}
      </div>

      {/* 🔹 모바일에서 컴포넌트 추가 */}
      <div className='md:hidden fixed bottom-6 right-6'>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className='text-white bg-blue-600 border-blue-600 text-[25px]'>+</Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              {Object.keys(ComponentLibrary).map(type => (
                <div
                  key={type}
                  onClick={() => handleAdd(type)}
                  className="p-2 bg-gray-200 rounded cursor-pointer hover:bg-gray-300"
                >
                  {type}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

    </div>
  );
}
