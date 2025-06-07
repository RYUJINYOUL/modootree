import ComponentPalette from '@/components/edit/ComponentPalette';
import EditorCanvas from '@/components/edit/EditorCanvas';
import Link from 'next/link';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export default function EditPage() {
  return (
    <div className="p-6 flex gap-10 mt-10 bg-black">
      <div className="w-1/4 md:block hidden ">
        <h1 className="font-bold mb-4 text-white">컴포넌트</h1>
        <ComponentPalette />
      </div>
   
      <div className="md:w-3/4 w-full">
      <h1 className="font-bold mb-4 text-white">드래그로 위치 변경하세요</h1>
            <EditorCanvas />
            <div className='md:hidden fixed bottom-6 right-6'>
            <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className='text-white bg-blue-600 border-blue-600 text-[25px]'>+</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
            
                <ComponentPalette />
        
            </PopoverContent>
            </Popover>
            </div>
      </div>
        
    </div>
  );
}