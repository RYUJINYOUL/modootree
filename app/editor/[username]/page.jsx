'use client';

import { useEffect, useState } from 'react';
import ComponentPalette from '@/components/edit/ComponentPalette';
import EditorCanvas from '@/components/edit/EditorCanvas';
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { db } from '../../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useSelector } from 'react-redux';

export default function EditPage() {
  const [components, setComponents] = useState([]);
  const { currentUser } = useSelector((state) => state.user);
  const uid = currentUser?.uid;

  // 🔽 Firebase에서 불러오기
  // useEffect(() => {
  //   if (!uid) return;
  //   const load = async () => {
  //     const docRef = doc(db, 'users', uid, 'links', 'page');
  //     const snapshot = await getDoc(docRef);
  //     if (snapshot.exists()) {
  //       setComponents(snapshot.data().components || []);
  //     }
  //   };
  //   load();
  // }, [uid]);

  // // 🔽 Firebase에 저장
  // useEffect(() => {
  //   console.log(components.length)
  //   if (!uid || components.length === 0) return;
  //   const save = async () => {
  //     const docRef = doc(db, 'users', uid, 'links', 'page');
  //     await setDoc(docRef, { components });
  //   };
  //   save();
  // }, [components, uid]);

  // const handleAddComponent = (type) => {
  //   setComponents(prev => [...prev, type]);
  // };

  return (
    <div className="p-6 flex gap-10 mt-10 bg-black">
      <div className="w-1/4 md:block hidden ">
        <h1 className="font-bold mb-4 text-white">컴포넌트</h1>
         <ComponentPalette/>
      </div>
   
      <div className="md:w-3/4 w-full">
        <h1 className="font-bold mb-4 text-white">드래그로 위치 변경하세요</h1>
        {/* 🔽 components와 setComponents 전달 */}
        <EditorCanvas />
        
        <div className='md:hidden fixed bottom-6 right-6'>
          {/* <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className='text-white bg-blue-600 border-blue-600 text-[25px]'>+</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <ComponentPalette onAdd={handleAddComponent} />
            </PopoverContent>
          </Popover> */}
        </div>
      </div>
    </div>
  );
}
