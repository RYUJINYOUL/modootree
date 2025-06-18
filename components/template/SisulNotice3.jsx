"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from "next/image";
import useUIState from "@/hooks/useUIState";
import Gallery2 from '@/components/Gallery2'

const SisulNotice3 = () => {
   const { push } = useRouter();
       const [ widths, setWidths ] = useState(false);
       const { homeCategory, setHomeCategory, setHeaderImageSrc } = useUIState();
         let slides = [
    '/Image/mosahxUYLJ.jpeg'
     ,
    "/Image/mosa14XYZX.jpeg"
    
   ]
     
    
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
          <div className='lg:text-start font-semibold text-center text-[20px]'>출장 요청전 필독 사항</div>
          <hr className="mt-1 h-0.5  border-t-0 md:bg-neutral-700 bg-white opacity-100 w-[180px] dark:opacity-50"/>
       </div>
       <div className='flex flex-col md:h-[40px] h-[20px] justify-end'>
          <div className='lg:text-end md:block hidden text-center text-[14px]' onClick={() => {onClickCategory("출장 요청전 필독 사항" ,"/map")}}>더보기 &nbsp;&gt;</div>
          <hr className="mt-1 h-0.5 hidden md:block border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-[920px]"/>
       </div>
       </div>
       </div>
      
       
       <div className='md:mt-7' />

       <div className='md:hidden w-full px-3 py-1 justify-start items-start rounded-md'>
       <Gallery2 images={slides} />
       </div>

      <div className='md:w-[1100px] w-full md:px-0 px-3 flex md:flex-row flex-col justify-start items-start gap-7 rounded-md'>

       <Image
          alt="mediaItem"
          className="w-[540px] h-[350px] hidden md:block rounded-md"
          width={540}
          height={350}
          src={"/Image/mosahxUYLJ.jpeg"}
        />
   

        <Image
          alt="mediaItem"
          className="w-[540px] h-[350px] hidden md:block rounded-md"
          width={540}
          height={350}
          src={"/Image/mosa14XYZX.jpeg"}
        />  

      
      </div>

      <div className='flex md:p-0 p-3 flex-col md:w-[1100px] w-full'>
        <div className='md:mt-10 mt-5' />
        <div class="txt_summary">
      <div class="txt_box">
        <div class="txt_component align_l color1">
          <p class="text-[15px] text-[#666666]">염색전문점의 비전</p>
        </div>
      </div>

      <div className='mt-3'/>

      <div class="txt_box">
        <div class="txt_component align_l ">
          <p class="text-[15px] text-[#666666]">
            염색 전문점은 미용업계에서 독특한 위치를 차지하며, 미래의 성장 가능성이 큰
            분야 중 하나입니다. 다음은 염색 전문점의 비전과 관련된 몇 가지 주요 요인입니다
            1. 증가하는 개인화 트렌드개인 맞춤형 서비스: 소비자들은 점점 더 자신만의
            스타일을 표현하고자 합니다. 염색 전문점은 개인 맞춤형 염색 서비스와 컨설팅을
            통해 고객의 개성을 반영하는 스타일을 제공할 수 있습니다 고급 염색 기술: 고급
            염색 기술과 제품을 사용하여 고객의 다양한 요구를 충족시킬 수 있습니다. 2.
            지속적인 미용 산업 성장미용 산업의 확장: 미용 산업은 지속적으로 성장하고
            있으며, 특히 헤어케어와 염색에 대한 수…
          </p>
        </div>
      </div>
  </div>
          <div className='md:hidden block flex flex-col h-[40px] justify-end'>
          <hr className="mt-1 h-0.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-full"/>
          <div className='md:mt-10 mt-3' />
          <div className='lg:text-end text-center text-[14px]' onClick={() => {onClickCategory("출장 요청전 필독 사항" ,"/map")}}>더보기 &nbsp;&gt;</div>
          </div>
        </div>  
       </section>
    </div>
  )
}

export default SisulNotice3
