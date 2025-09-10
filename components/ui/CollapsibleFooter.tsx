'use client';

import { useState } from 'react';
import { ChevronUp } from 'lucide-react';

export default function CollapsibleFooter() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative w-full">
      {/* 접기/펼치기 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-all px-4 py-1 rounded-t-xl shadow-lg flex items-center gap-2"
      >
        <ChevronUp className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        <span className="text-sm">광고</span>
      </button>

      {/* 광고 컨테이너 */}
      <div 
        className={`bg-white/70 backdrop-blur-sm transition-all duration-300 shadow-lg ${
          isOpen ? 'h-[250px]' : 'h-0'
        } overflow-hidden`}
      >
        <div className="w-full max-w-[1000px] mx-auto h-full flex items-center justify-center">
          {/* 여기에 AdSense 코드가 들어갈 자리 */}
          <div className="w-full h-[250px] flex items-center justify-center">
            광고가 표시될 영역
          </div>
        </div>
      </div>
    </div>
  );
}
