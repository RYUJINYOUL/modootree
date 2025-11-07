'use client';

import { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProsMenu() {
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();

  if (!isOpen) return null;

  const handleNavigateToLinkLetter = () => {
    router.push('/link-letter');
  };

  return (
    <div className="fixed inset-0 bg-[#EF3340] z-50 overflow-hidden">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
      <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:opacity-80 transition flex items-center gap-2"
          >
            <span className="font-bold">모두트리</span>
            <X className="w-6 h-6" />
          </button>
        <div className="flex items-center gap-8">
          <p className="text-white text-sm">
            퀴즈를 풀어야 볼 수 있는{' '}
            <span className="font-bold">링크편지</span>
          </p>
        </div>
      </header>


      {/* Main Menu Container */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Organic Blob Shape - More Distorted */}
        <svg
          className="absolute w-[90%] sm:w-[80%] md:w-[70%] h-[80%]"
          viewBox="0 0 800 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
           d="M400 50C550 50 700 150 750 300C800 450 750 600 700 700C650 800 500 850 400 850C300 850 150 800 100 700C50 600 0 450 50 300C100 150 250 50 400 50Z"
            fill="#F5F5F0"
          />
        </svg>

         {/* Speech Bubbles - Top */}
         <div className="absolute top-[20%] left-[5%] sm:left-[10%] md:left-[25%] z-10">
           <SpeechBubble 
             title="고백" 
             description="마음 먼저 링크편지" 
             position="top-left" 
           />
         </div>
         <div className="absolute top-[10%] right-[5%] sm:right-[10%] md:right-[30%] z-10">
           <SpeechBubble 
             title="감사" 
             description="퀴즈로 만든 감사표현" 
             position="top-right" 
           />
         </div>

         {/* Menu Items */}
         <nav className="relative z-10 text-center">
         <p className="text-black text-lg mb-3">
             퀴즈를 풀어야 볼 수 있는{' '}
             <span className="font-bold">링크편지</span>
           </p>
           <ul className="space-y-4">
             <MenuItem text="모두트리" active={false} />
             <MenuItem text="링크편지" active={true} />
           </ul>
         </nav>

         {/* Speech Bubbles - Bottom */}
         <div className="absolute bottom-[15%] left-[5%] sm:left-[15%] md:left-[28%] z-10">
           <SpeechBubble 
             title="가족" 
             description="부담없는 사랑 퀴즈" 
             position="bottom-left" 
           />
         </div>
         <div className="absolute bottom-[25%] right-[5%] sm:right-[15%] md:right-[25%] z-10">
           <SpeechBubble 
             title="우정" 
             description="퀴즈로 만든 친구 동행" 
             position="bottom-right" 
           />
         </div>
        

        {/* Penc Logo */}
        <div className="absolute bottom-[15%] right-[20%] z-10">
          <PencLogo />
        </div>
      </div>
    </div>
  );
}

function MenuItem({ text, active }: { text: string; active: boolean }) {
  return (
    <li>
      <a
        href="#"
        className={`
          inline-block text-7xl sm:text-8xl md:text-9xl font-bold tracking-tight
          transition-all duration-300 hover:scale-110
          ${
            active
              ? 'text-[#EF3340]'
              : 'text-gray-900 hover:text-[#EF3340]'
          }
        `}
        style={{
          fontFamily: '"Noto Sans KR", system-ui, -apple-system, sans-serif',
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        {text}
      </a>
    </li>
  );
}

function SpeechBubble({ title, description, position }: { title: string; description: string; position: string }) {
  const getTailPosition = () => {
    switch (position) {
      case 'top-left':
        return 'after:left-4 after:top-full after:border-t-white';
      case 'top-right':
        return 'after:right-4 after:top-full after:border-t-white';
      case 'bottom-left':
        return 'after:left-4 after:bottom-full after:border-b-white';
      case 'bottom-right':
        return 'after:right-4 after:bottom-full after:border-b-white';
      default:
        return 'after:left-4 after:top-full after:border-t-white';
    }
  };

  return (
    <div className="animate-float" style={{ animationDelay: `${Math.random() * 2}s` }}>
      <div
        className={`
          relative bg-white rounded-2xl px-3 py-3 shadow-lg
          after:content-[''] after:absolute after:w-0 after:h-0
          after:border-l-[8px] after:border-r-[8px] after:border-l-transparent after:border-r-transparent
          after:border-[8px]
          ${getTailPosition()}
          hover:scale-105 transition-transform duration-300 cursor-pointer
          max-w-[200px] sm:max-w-[250px] md:max-w-[300px]
        `}
      >
        <div className="space-y-2">
          <h3 className="text-sm sm:text-base font-bold text-[#EF3340]" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed" style={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function PencLogo() {
  return (
    <div className="animate-float">
      <img
        src="/logos/penc.png"
        alt="Penc Logo"
        width={100}
        height={100}
        className="w-20 h-20 object-contain"
      />
    </div>
  );
}
