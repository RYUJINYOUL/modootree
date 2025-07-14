'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useState } from 'react'

const cases = [
  {
    title: "매일 일기장",
    icon: "diary.svg",
    description: "함께 쓰는 일기장 \n 커플, 가족, 모임"
  },
  {
    title: "공동 일정표",
    icon: "schedule.svg",
    description: "쉬운 공유 오픈일정표 \n 교회, 아파트, 학원 등"
  },
  {
    title: "포트폴리오",
    icon: "portfolio.svg",
    description: "홈페이지 같은 내 포트폴리오 \n 이력서 제출 시 링크 첨부"
  },
  {
    title: "링크 모음",
    icon: "Link.svg",
    description: "내 영상 내 사진 배경 링크모음 \n 느낌 있는 링크모음 활용"
  },
  {
    title: "응원 방명록",
    icon: "guest.svg",
    description: "SNS에 연결된 응원방명록 \n 내 지인들께 은근 받는 응원메세지"
  }
];

// 렌더링 시
{cases.map((item, index) => (
  <div key={index}>
      <img src={item.icon} alt={item.title} className="w-6 h-6" />
      <span>{item.title}</span>
  </div>
))}

export default function UseCaseCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true
  })

  const [selectedIndex, setSelectedIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
  }, [emblaApi, onSelect])

  return (
    <>
      <div className="w-full md:w-[1100px] mx-auto px-4 mb-8">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4 touch-pan-y">
            {cases.map((item, index) => (
              <div 
                key={index}
                className="flex-[0_0_240px]"
              >
                <div className="aspect-square bg-blue-600/20 hover:bg-blue-600/10 rounded-3xl border border-blue-400/20 backdrop-blur-sm p-6 flex flex-col items-center justify-center gap-4 transition-all duration-300 cursor-pointer group">
                  <img 
                    src={`/${item.icon}`} 
                    alt="" 
                    className="w-15 h-15 opacity-70 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="text-center space-y-2">
                    <p className="text-xl font-bold text-white/80 leading-relaxed whitespace-pre-line tracking-tight [text-shadow:_0_1px_2px_rgba(0,0,0,0.3)] transition-all group-hover:scale-105 group-hover:text-white">
                      {item.title}
                    </p>
                    <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line transition-all group-hover:text-white/90">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-center">
        {cases.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === selectedIndex 
                ? 'bg-blue-400/90 w-6 shadow-[0_0_12px_rgba(96,165,250,0.3)]' 
                : 'bg-blue-400/30 hover:bg-blue-400/50'
            }`}
            onClick={() => emblaApi?.scrollTo(index)}
          />
        ))}
      </div>
    </>
  )
} 