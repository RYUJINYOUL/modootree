"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from "next/image";
import useUIState from "@/hooks/useUIState";

const SisulNotice2 = () => {
   const { push } = useRouter();
       const [ widths, setWidths ] = useState(false);
       const { homeCategory, setHomeCategory, setHeaderImageSrc } = useUIState();
     
    
       const onClickCategory = (item ,src) => {
        if (homeCategory === item) {
          setHeaderImageSrc("");
          setHomeCategory(item);
        } else {
          setHeaderImageSrc(src);
          setHomeCategory(item);
          push(src)
        }
      };



      
  return (
    <div>
         <section className='flex flex-col justify-center items-center'>
    
      <div className='flex flex-col'>
      <div className='flex md:flex-row flex-col md:justify-between items-start lg:w-[1100px] w-screen'>
          <div className='lg:px-0 px-3 flex flex-col h-[40px] justify-end'>
          <div className='lg:text-start font-semibold text-center text-[20px]'>염색전문점 창업</div>
          <hr className="mt-1 h-0.5 md:block hidden border-t-0 bg-neutral-700 opacity-100 w-[130px] dark:opacity-50"/>
       </div>
          <div className='flex flex-col md:h-[40px] h-[20px] justify-end'>
          <div className='lg:text-end md:block hidden text-center text-[14px]' onClick={() => {onClickCategory("염색전문점 창업" ,"/so")}}>더보기 &nbsp;&gt;</div>
          <hr className="mt-1 h-0.5 hidden md:block border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-[970px]"/>
       </div>
       </div>
       </div>
      
       <div className='md:mt-7' />
       <div className='md:w-[1100px] w-full md:px-0 px-3 flex md:flex-row flex-col justify-start items-start gap-10'>
        <div className='relative md:w-[530px] w-full h-[353px]'>
       <Image
          alt="mediaItem"
          className="object-cover rounded-md"
          // width={530}
          // height={353}
          fill
          src={"/Image/mosaLIGRXV.jpeg"}
        />  
        </div>
        <div className='flex flex-col md:w-[530px] w-full'>
          <div className="">
  <div className="txt_box">
    <div className="txt_component align_l ">
      <p className="text-[15px] text-[#666666]">
      <div className="">
  <div className="txt_box">
    <div className="text-[20px] text-[#222222] font-semibold">
      <p className="">바른염색 창업컨설팅</p>
    </div>
    <div className='mt-2'/>
  </div>
  <div className="txt_box">
    <div className="txt_component align_l color1">
      <p className="_ellipsis">
        성공적인 창업의 첫걸음을 함께합니다! 창업의 꿈을 가지고 계신가요? 바른염색
        창업컨설팅과 함께라면 성공적인 미래가 보장됩니다. 왜 바른염색 창업컨설팅인가?
        1. 전문성 오랜 경험과 노하우: 바른염색은 다년간의 경험을 통해 축적된 전문성과
        노하우를 보유하고 있습니다. 성공적인 창업을 위해 필요한 모든 정보를
        제공합니다. 맞춤형 컨설팅:고객의 상황과 목표에 맞춘 맞춤형 컨설팅을 통해
        창업의 모든 과정을 세심하게 안내해 드립니다. 2. 종합적인 지원 -시장 분석:
        철저한 시장 분석을 통해 창업의 가능성을 극대화합니다. 경쟁 분석, 트렌드 파악
        등을 통해 성공적인 전략을 수립합니다. - 비즈니스 플랜 작성: 실현 가능한
        비즈니스 플랜을 작성하여 창업 초기의 불확실성을 최소화합니다. 자금 계획,
        마케팅 전략, 운영 계획 등 모든 부분을 꼼꼼하게 준비해 드립니다. - 실전 교육:
        현장에서 바로 적용 가능한 실전 교육을 제공합니다. 이론과 실습을 병행하…
      </p>

    </div>
  </div>
</div>
      </p>
    </div>
  </div>
  <div className='mt-3'></div>
 
</div>

          <div className='md:mt-10 mt-8' />
          <div className='md:hidden block flex flex-col h-[40px] justify-end'>
          <hr className="mt-1 h-0.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-full"/>
          <div className='md:mt-10 mt-3' />
          <div className='lg:text-end text-center text-[14px]' onClick={() => {onClickCategory("염색전문점 창업" ,"/so")}}>더보기 &nbsp;&gt;</div>
       </div>
        </div>  
        </div>
       </section>
    </div>
  )
}

export default SisulNotice2
