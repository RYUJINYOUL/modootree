'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useState } from 'react'

const cases = [
  {
    title: "SNS 연결된\n나를 위한 응원방명록"
  },
  {
    title: "교민들과 함께\n우리 교회 일정표"
  },
  {
    title: "학부모님과 함께\n우리 학원 일정표"
  },
  {
    title: "우리 회사 일정\n공유 작은 공지사항"
  },
  {
    title: "우리 아파트 일정\n공유하는 월별 일정표"
  },
  {
    title: "내 상점 이용 고객님의\n소중한 한줄 방명록"
  },
  {
    title: "농산물 고객 님의\n 이용 후기 모음집"
  }
]

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
                <div className="aspect-square bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm p-6 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
                  <p className="text-lg font-bold text-white/90 leading-relaxed text-center whitespace-pre-line tracking-tight [text-shadow:_0_1px_2px_rgba(0,0,0,0.3)] transition-all hover:scale-105">
                    {item.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-1 justify-center">
        {cases.map((_, index) => (
          <button
            key={index}
            className={`w-0.5 h-0.5 rounded-full transition-colors ${
              index === selectedIndex ? 'bg-white' : 'bg-black/40'
            }`}
            onClick={() => emblaApi?.scrollTo(index)}
          />
        ))}
      </div>
    </>
  )
} 