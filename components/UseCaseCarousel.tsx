'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useState } from 'react'

const features = [
  {
    title: "일상을 기록하다",
    icon: "diary.svg",
    description: "나만의 프라이빗 공간 \n 소중한 사람들과 함께 쓰는 교감의 일기장"
  },
  {
    title: "일정을 공유하다",
    icon: "schedule.svg",
    description: "손쉬운 일정 공유와 관리 \n 다국어 지원으로 더 넓은 세상과 소통하세요"
  },
  {
    title: "이력도 공유하다",
    icon: "portfolio.svg",
    description: "당신만의 특별한 이야기 \n 간편한 URL로 언제 어디서나 작품을 공유하세요"
  },
  {
    title: "모든 것을 연결하다",
    icon: "Link.svg",
    description: "디지털 발자취의 중심점 \n 당신의 모든 온라인 정보를 한 곳에서 관리하세요"
  },
  {
    title: "마음을 나누다",
    icon: "guest.svg",
    description: "소통하는 방명록 \n 매일 새로운 응원과 격려로 가득한 당신만의 공간"
  }
];

const testimonials = [
  {
    role: "대학생",
    age: 26,
    story: "시험도, 알바도, 연애도 다 버겁게 느껴지던 어느 날, 그냥 마음을 쏟아내고 싶었어요. 며칠 후, 낯선 사람의 ❤️ 12개와 '당신의 오늘이 나에게도 위로였어요'라는 메시지를 받고 덜 외로워졌죠."
  },
  {
    role: "학원 원장",
    age: 37,
    story: "학부모들에게 공지 문자를 매번 보내기도, 직원들과 스케줄 맞추기도 너무 번거로웠어요. 이제는 링크 하나로 모든 일정을 공유하고, 외국인 강사들도 번역 기능으로 쉽게 확인할 수 있죠."
  },
  {
    role: "디자이너",
    age: 29,
    story: "이력서엔 제 진짜 이야기를 담을 수 없었어요. 그래서 작업물, 프로젝트 설명, 그리고 그 과정의 감정까지 모두 담은 포트폴리오를 만들었죠. 이제는 링크 하나로 저의 모든 여정을 보여줄 수 있어요."
  },
  {
    role: "프리랜서 마케터",
    age: 31,
    story: "프로젝트마다 자기소개, 연락처, SNS 보내는 게 귀찮았어요. 이제는 이름, 연락처, 인스타그램, 캘린더 예약 링크까지 하나의 카드로 정리해서 간단히 공유해요."
  },
  {
    role: "크리에이터",
    age: 23,
    story: "매일 콘텐츠를 올리지만, 댓글은 가끔 독이 되곤 했어요. 이제는 'DM 대신 들어온 따뜻한 응원 메시지들이 쌓일수록 다시 콘텐츠를 만들 힘을 얻어요."
  }
];

export default function UseCaseCarousel() {
  const options = {
    align: 'start' as const,
    containScroll: 'trimSnaps' as const,
    dragFree: true,
    loop: true,
    breakpoints: {
      '(min-width: 768px)': {
        align: 'center' as const,
        containScroll: 'trimSnaps' as const,
        dragFree: true,
        loop: false
      }
    }
  }

  const [featureRef, featureApi] = useEmblaCarousel(options)
  const [testimonialRef, testimonialApi] = useEmblaCarousel(options)

  return (
    <div className="space-y-16 py-2">
      {/* 기능 소개 캐러셀 */}
      <section className="relative">
        <h2 className="text-2xl md:text-3xl font-bold text-white/90 text-center mb-10">
          모두트리, 이렇게 사용하세요
        </h2>
        <div className="w-full mx-auto">
          <div className="overflow-hidden" ref={featureRef}>
            <div className="flex backface-hidden">
              {features.map((item, index) => (
              <div 
                key={index}
                  className="flex-[0_0_85%] md:flex-[0_0_280px] min-w-0 pl-4 first:pl-4"
              >
                  <div className="aspect-square bg-blue-600/50 hover:bg-blue-600/20 rounded-3xl border border-blue-400/20 backdrop-blur-sm p-4 md:p-6 flex flex-col items-center justify-center gap-4 md:gap-5 transition-all duration-300">
                    <img 
                      src={`/${item.icon}`} 
                      alt="" 
                      className="w-12 h-12 md:w-16 md:h-16 opacity-70 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="text-center space-y-2.5 md:space-y-2">
                      <p className="text-lg md:text-xl font-bold text-white/80 leading-relaxed whitespace-pre-line tracking-tight [text-shadow:_0_1px_2px_rgba(0,0,0,0.3)]">
                    {item.title}
                      </p>
                      <p className="text-sm md:text-base text-white/60 leading-relaxed whitespace-pre-line">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
      </section>

      {/* 사용자 후기 캐러셀 */}
      <section className="relative mt-15">
        <h2 className="text-2xl md:text-3xl font-bold text-white/90 text-center mb-8">
        모두트리, 이럴 때 좋습니다
        </h2>
        <div className="w-full mx-auto">
          <div className="overflow-hidden" ref={testimonialRef}>
            <div className="flex backface-hidden">
              {testimonials.map((item, index) => (
                <div 
                  key={index}
                  className="flex-[0_0_85%] md:flex-[0_0_340px] min-w-0 pl-4 first:pl-4"
                >
                  <div className="bg-blue-600/50 hover:bg-blue-600/20 rounded-3xl border border-blue-400/20 backdrop-blur-sm p-4 md:p-7 transition-all duration-300">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3">
                      <span className="text-sm text-white/70">{item.role}</span>
                      <span className="text-sm text-white/50">({item.age}세)</span>
                    </div>
                    <p className="text-sm text-left md:text-base text-white/80 leading-relaxed">
                      {item.story}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-center mt-12">
          <a
            href="/farmtoolceo"
            className="inline-block px-6 py-2 rounded-full transition-all duration-300 shadow-md hover:shadow-lg border-2 border-white/30 text-white/80 hover:bg-white/10 hover:border-white/40"
          >
            문의하기
          </a>
        </div>
      </section>
      </div>
  )
} 