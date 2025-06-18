"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from "next/image";
import useUIState from "@/hooks/useUIState";

const SisulNotice = () => {
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
          <div className='lg:text-start font-semibold text-center text-[20px]'>회사소개</div>
          <hr className="mt-1 h-0.5 md:block hidden border-t-0 bg-neutral-700 opacity-100 w-[70px] dark:opacity-50"/>
       </div>
          <div className='flex flex-col md:h-[40px] h-[20px] justify-end'>
          <div className='lg:text-end md:block hidden text-center text-[14px]' onClick={() => {onClickCategory("회사소개" ,"/so")}}>더보기 &nbsp;&gt;</div>
          <hr className="mt-1 h-0.5 hidden md:block border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-[1030px]"/>
       </div>
       </div>
       </div>
      
       <div className='md:mt-7' />
       <div className='md:w-[1100px] w-full md:px-0 px-3 flex flex-col justify-start items-start gap-10'>
        <div className='relative md:w-[1100px] w-full'>
       <Image
          alt="mediaItem"
          className="object-contain"
            width={1100}
            height={560}
          src={"/Image/mosaKj5QRH.jpeg"}
        />  
        </div>
       
        </div>
       </section>
    </div>
  )
}

export default SisulNotice
