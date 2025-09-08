import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function ImageSlideshow({ images, interval = 2000 }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, interval);

    return () => clearInterval(timer);
  }, [images.length, interval]);

  return (
    <div className="relative w-full h-full">
      {images.map((image, index) => (
        <div
          key={image}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: index === currentIndex ? 1 : 0 }}
        >
          <Image
            src={image}
            alt={`Slide ${index + 1}`}
            fill
            className="object-cover rounded-lg"
            priority={index === 0}
          />
        </div>
      ))}
    </div>
  );
}
