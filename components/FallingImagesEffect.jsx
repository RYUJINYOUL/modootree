// components/FallingImagesEffect.jsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { gsap } from 'gsap';

const fallingImages = [
  '/face/sl.png',
  '/face/po.png',
  '/face/sp.png',
  '/face/hm.png',
  '/face/gb.png',
  '/face/ba.png',
  '/face/bn.png',
  '/face/gj.png',
  '/face/gr.png',
  '/face/jj.png',
  '/face/jl.png',
  '/face/mj.png',
  '/face/won.png',
];

export default function FallingImagesEffect() {
  const containerRef = useRef(null);
  const imageRefs = useRef([]);
  const [loaded, setLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // 반응형 크기 설정을 컴포넌트 레벨로 이동
  const imageSize = isMobile ? 60 : 90; // 모바일: 60px, PC: 90px (더 크고 균일하게)

  // 화면 크기 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    const container = containerRef.current;
    if (!container) return;

    // 반응형 크기 설정
    const bottomMargin = isMobile ? 5 : 5 // 하단 여백 (더 아래로 증가)
    const imagesPerRow = isMobile ? Math.floor(window.innerWidth / (imageSize + 10)) : fallingImages.length; // 모바일에서 한 줄에 들어갈 수 있는 이미지 수
    const totalRows = Math.ceil(fallingImages.length / imagesPerRow); // 총 줄 수

    imageRefs.current.forEach((image, index) => {
      if (!image) return;

      const startY = -Math.random() * 200 - 100; // 화면 위쪽에서 시작
      const startX = Math.random() * (window.innerWidth * 0.8) + (window.innerWidth * 0.1); // 랜덤 시작 위치
      
      // 모바일에서 여러 줄 배치를 위한 계산
      const rowIndex = Math.floor(index / imagesPerRow); // 현재 이미지가 속한 줄
      const colIndex = index % imagesPerRow; // 현재 줄에서의 위치
      
      // 각 줄의 시작 X 위치 계산 (중앙 정렬)
      const imagesInCurrentRow = Math.min(imagesPerRow, fallingImages.length - rowIndex * imagesPerRow);
      const rowStartX = (window.innerWidth / 2) - (imagesInCurrentRow * imageSize / 2);
      
      const finalX = rowStartX + (colIndex * imageSize);
      const finalY = window.innerHeight - bottomMargin - imageSize - (rowIndex * (imageSize + 10)); // 여러 줄로 배치
      
      const duration = Math.random() * 2 + 1; // 1초 ~ 3초 사이의 랜덤 지속 시간
      const delay = index * 0.2; // 순차적으로 떨어지도록 딜레이 (조금 더 빠르게)

      // 이미지 크기 설정
      gsap.set(image, {
        width: imageSize,
        height: imageSize,
      });

      gsap.fromTo(image, {
        y: startY,
        x: startX,
        rotation: Math.random() * 360,
        opacity: 0
      }, {
        x: finalX, // 일렬로 정렬되는 최종 X 위치
        y: finalY, // 하단에 일렬로 배치되는 Y 위치
        opacity: 1,
        rotation: Math.random() * 360 + 720, // 더 많은 회전
        duration: duration,
        delay: delay,
        ease: "power2.out",
        onComplete: () => {
          gsap.to(image, { // 쌓인 후 약간의 흔들림 효과
            y: finalY - 5,
            duration: 0.3,
            yoyo: true,
            repeat: 1,
            ease: "power1.inOut"
          });
        }
      });
    });
  }, [loaded, isMobile]);

  // 컴포넌트 마운트 후 애니메이션 시작
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaded(true);
    }, 100); // 100ms 후 애니메이션 시작

    return () => clearTimeout(timer);
  }, []);


  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none z-[50]">
      {fallingImages.map((src, index) => (
        <div
          key={index}
          className="absolute pointer-events-auto"
          style={{
            left: '-100px', // 초기 위치를 화면 밖으로 설정
            top: '-100px',
          }}
          ref={(el) => (imageRefs.current[index] = el)}
        >
           <Link href="/farmtoolceo">
             <div 
               className="relative p-1 rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 shadow-lg hover:scale-110 transition-transform duration-200"
               style={{ width: imageSize, height: imageSize }}
             >
               <Image
                 src={src}
                 alt={`Falling image ${index}`}
                 width={imageSize}
                 height={imageSize}
                 className="rounded-full object-cover border-2 border-white"
                 style={{
                   width: '100%',
                   height: '100%',
                   borderRadius: '50%',
                   objectFit: 'cover',
                 }}
               />
             </div>
           </Link>
        </div>
      ))}
    </div>
  );
}
