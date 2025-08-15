'use client';

import { useRef, useState, useEffect } from 'react';

export default function CategoryCarousel({ categories, selectedCategory, onSelect }) {
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const stopDragging = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('touchend', stopDragging);
    return () => {
      document.removeEventListener('mouseup', stopDragging);
      document.removeEventListener('touchend', stopDragging);
    };
  }, []);

  return (
    <div 
      ref={scrollRef}
      className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory touch-pan-x"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={stopDragging}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div className="flex gap-2 px-4">
        <button
          onClick={() => onSelect('전체')}
          className={`whitespace-nowrap px-4 py-2 rounded-lg transition-colors snap-start ${
            selectedCategory === '전체'
              ? 'bg-white/20 text-white'
              : 'bg-black/50 text-white/70'
          }`}
        >
          전체
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onSelect(category)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg transition-colors snap-start ${
              selectedCategory === category
                ? 'bg-white/20 text-white'
                : 'bg-black/50 text-white/70'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
} 