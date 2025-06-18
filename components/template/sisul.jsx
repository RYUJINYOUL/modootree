"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from "next/image";
import useUIState from "@/hooks/useUIState";
import { cn } from "@/lib/utils";



const Sisul = () => {
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
      <section className='md:hidden flex flex-col justify-center items-center'>
            
            <div className='flex flex-col'>
            <div className='flex md:flex-row flex-col md:justify-between items-start lg:w-[1100px] w-screen'>
                <div className='lg:px-0 px-3 flex flex-col h-[40px] justify-end'>
                  <div className='flex flex-row gap-2'>
                     <div className='lg:px-0 flex flex-col h-[40px] justify-end'>
                      <div className='md:text-start font-semibold text-center text-[20px] md:text-[#001391] text-[#000000]'>남양주 창고 공장 전문부동산</div>
                      <hr className="mt-1 h-0.5 md:block hidden bg-[#001391] border-t-0 opacity-100 w-[40px] dark:opacity-50"/>
                  </div>
                  </div>
                <hr className="mt-1 h-0.5 md:bg-[#001391] bg-white border-t-0 opacity-100 w-[70px] dark:opacity-50"/>
             </div>
             </div>
             </div>
            
             
             <div className='md:mt-7 mt-1' />
      
        
           <div className='flex md:p-0 p-3 flex-col md:w-[1100px] w-full'>
              <div className='md:mt-10' />
                <div className='text-[15px] text-[#222222] block md:hidden text-start'>
                 <p className="">
                    구리/토평, 사노동, 수석동, 일패동, 이패동, 삼패동,덕소리, 와부읍, 진건읍,
                    진접읍, 화도읍, 별내동 일대 창고 전문 부동산입니다. 성실하고 책임감 있는
                    마음가짐으로 귀사의 최고의 사업장을 찾는 맞춤형 중개를 추구합니다.
                    <br /></p>
                </div>    
                <div className={cn('hidden text-[15px] text-[#222222] md:hidden truncate text-start mt-5', widths&&"block")}>
                   <p>
                    *창고종류*
                    <br />
                    1. 근린생활시설창고 <br />
                    (1,2종, 제조업, 공장, 체육시설)
                    <br />
                    2. 동,식물관련시설창고
                    <br />
                    (종묘배양장/훼손지 정비대상창고)
                    <br />
                    3. 지식산업센터 (공장형아파트)
                    <br />
                    4. 창고부지 (농지,잡종지,대지)
                    <br />
                    5. 공공이축권(개발제한구역 전문)
                  </p> 
                  </div>
                <div className='md:mt-10 mt-5' />
                <div className='md:hidden flex flex-col h-[40px] justify-end'>
                <hr className="mt-1 h-0.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-full"/>
                <div className='md:mt-10 mt-3' />
                <div className='lg:text-end text-center text-[14px]' onClick={() => { widths ? setWidths(false) : setWidths(true)}}>{widths === false ? "열기" : "닫기"} &nbsp;</div>
                </div>
              </div>  
             </section>
    </div>
  )
}

export default Sisul
