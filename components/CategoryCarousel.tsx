'use client';

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface Category {
  id: string;
  label: string;
}

interface CategoryCarouselProps {
  categories: Category[];
  selectedCategory: string;
  onSelect: (id: string) => void;
}

export default function CategoryCarousel({
  categories,
  selectedCategory,
  onSelect
}: CategoryCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 선택된 카테고리로 스크롤
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const selectedButton = container.querySelector(`[data-category="${selectedCategory}"]`);
      
      if (selectedButton) {
        const containerWidth = container.offsetWidth;
        const buttonLeft = (selectedButton as HTMLElement).offsetLeft;
        const buttonWidth = (selectedButton as HTMLElement).offsetWidth;
        
        // 버튼을 중앙에 위치시키기 위한 스크롤 위치 계산
        const scrollPosition = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
        
        container.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [selectedCategory]);

  return (
    <div 
      ref={scrollContainerRef}
      className="flex overflow-x-auto md:justify-center gap-2 pb-2 scrollbar-hide snap-x snap-mandatory"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {categories.map(category => (
        <Button
          key={category.id}
          data-category={category.id}
          variant={selectedCategory === category.id ? "default" : "outline"}
          onClick={() => onSelect(category.id)}
          className={`flex-shrink-0 snap-center whitespace-nowrap px-4 md:px-6 py-2 text-sm md:text-base transition-all border ${
            selectedCategory === category.id 
              ? 'bg-blue-500 hover:bg-blue-600 text-white border-transparent' 
              : 'bg-blue-500/10 hover:bg-blue-500/30 text-white/90 hover:text-white border-blue-500/30'
          }`}
        >
          {category.label}
        </Button>
      ))}
    </div>
  );
}
