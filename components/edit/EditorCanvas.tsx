'use client';
import { ComponentLibrary } from './ComponentLibrary';
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface EditorCanvasProps {
  components: string[];
  onComponentsUpdate: (components: string[]) => void;
}

export default function EditorCanvas({ components, onComponentsUpdate }: EditorCanvasProps) {
  // 🔹 컴포넌트 추가
  const handleAdd = (type: string) => {
    onComponentsUpdate([...components, type]);
  };

  // 🔹 삭제
  const handleRemove = (index: number) => {
    onComponentsUpdate(components.filter((_, i) => i !== index));
  };

  // 🔹 위로 이동
  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...components];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onComponentsUpdate(updated);
  };

  // 🔹 아래로 이동
  const moveDown = (index: number) => {
    if (index === components.length - 1) return;
    const updated = [...components];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onComponentsUpdate(updated);
  };

  return (
    <div className="md:hidden space-y-2">
      {/* 🔹 현재 추가된 컴포넌트 목록 */}
      {components.map((type, idx) => (
        <div key={idx} className="p-3 bg-blue-500/70 text-white rounded-xl font-semibold text-center shadow cursor-grab transition hover:bg-blue-600/90 hover:scale-105 active:bg-blue-800/90 select-none flex items-center justify-between gap-2">
          <span className='text-[15px] flex-1'>{type}</span>
          <div className="flex items-center gap-1">
            <Button className='bg-white/20 text-white border-white/30 hover:bg-white/30' onClick={() => moveUp(idx)} size="sm">↑</Button>
            <Button className='bg-white/20 text-white border-white/30 hover:bg-white/30' onClick={() => moveDown(idx)} size="sm">↓</Button>
            <Button className='bg-red-500/70 text-white border-red-500/30 hover:bg-red-600/90' onClick={() => handleRemove(idx)} variant="destructive" size="sm">X</Button>
          </div>
        </div>
      ))}

      {/* 🔹 미리보기 영역 */}
      <div className="min-h-[400px] border-2 border-dashed border-blue-300 pt-6 bg-gray-500 rounded-2xl mt-10 shadow-lg text-white">
        <h2 className="font-bold text-center mb-6 text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-wide">미리보기</h2>
        {components.map((type, idx) => {
          const Comp = ComponentLibrary[type];
          return Comp ? <Comp key={idx} /> : null;
        })}
      </div>

      {/* 🔹 모바일에서 컴포넌트 추가 */}
      <div className='md:hidden fixed bottom-6 right-6'>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className='text-white bg-blue-600 border-blue-600 text-[25px] hover:bg-blue-700'>+</Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              {Object.keys(ComponentLibrary).map(type => (
                <div
                  key={type}
                  onClick={() => handleAdd(type)}
                  className="p-3 bg-blue-500/70 text-white rounded-xl font-semibold text-center shadow cursor-pointer hover:bg-blue-600/90 hover:scale-105 active:bg-blue-800/90 transition"
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
