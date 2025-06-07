'use client';

import { useState } from 'react';
import ComponentPalette from '@/components/edit/ComponentPalette';
import EditorCanvas from '@/components/edit/EditorCanvas';
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export default function EditPage() {
  const [components, setComponents] = useState<string[]>([]);

  const handleAddComponent = (type: string) => {
    setComponents(prev => [...prev, type]);
  };
    
  return (
    <div className="p-6 flex gap-10 mt-10 bg-black">
      <div className="w-1/4 md:block hidden ">
        <h1 className="font-bold mb-4 text-white">컴포넌트</h1>
        <ComponentPalette onAdd={handleAddComponent} />
      </div>
   
      <div className="md:w-3/4 w-full">
      <h1 className="font-bold mb-4 text-white">드래그로 위치 변경하세요</h1>
            <EditorCanvas components={components} />
            <div className='md:hidden fixed bottom-6 right-6'>
            <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className='text-white bg-blue-600 border-blue-600 text-[25px]'>+</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
            
                <ComponentPalette onAdd={handleAddComponent} />
        
            </PopoverContent>
            </Popover>
            </div>
      </div>
        
    </div>
  );
}