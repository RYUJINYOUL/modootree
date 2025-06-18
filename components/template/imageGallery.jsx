"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from "next/image";
import useUIState from "@/hooks/useUIState";

const ImageGallery = () => {
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
       <section className='flex flex-col justify-center items-center'>
          
          <div className='flex flex-col'>
          <div className='flex md:flex-row flex-col md:justify-between items-start lg:w-[1100px] w-screen'>
              <div className='lg:px-0 px-3 flex flex-col md:h-[40px] h-[0px] justify-end'>
              <div className='lg:text-start md:block hidden font-semibold text-center text-[20px] text-[#001391]'>이미지 갤러리</div>
              <hr className="mt-1 h-0.5 md:text-[#001391] bg-[#001391] border-t-0 opacity-100 w-[110px] dark:opacity-50"/>
           </div>
           <div className='flex flex-col md:h-[40px] h-[0px] justify-end'>
              <div className='lg:text-end md:block hidden text-center text-[14px]' ></div>
              <hr className="mt-1 h-0.5 hidden md:block border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-[990px]"/>
           </div>
           </div>
           </div>
          
           <div className='md:mt-7' />
        
            <div className='flex flex-col md:w-[530px] w-full'>
              <div className='md:hidden flex flex-col md:h-[40px] h-[0px] justify-end'>
              <hr className="mt-1 h-0.5 md:block hidden border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-full"/>
              <div className='md:mt-3 mt-3' />
              <div className='lg:text-end text-center md:block hidden text-[14px]'></div>
           </div>
           </div>
    
           <div className='flex flex-col md:gap-5 gap-0'>
             <div className='md:w-[1100px] w-full md:px-0 px-3 flex md:flex-row flex-col justify-center items-start gap-5 rounded-md'>
                  <Image
                      alt="mediaItem"
                      className="w-full h-[350px] hidden md:block rounded-md"
                      width={510}
                      height={350}
                      style={{ objectFit: "cover" }}
                      src={"/Image/mosavaDBzK.jpeg"}
                    />
                   <Image
                      alt="mediaItem"
                      className="w-full h-[350px] hidden md:block rounded-md"
                      width={510}
                      height={350}
                      style={{ objectFit: "cover" }}
                      src={"/Image/mosaFR4K8d.jpeg"}
                    />
                
          </div>
    
           
           <div className='md:w-[1100px] w-full md:px-0 px-3 flex md:flex-row flex-col justify-center items-start gap-5 rounded-md'>
                  <Image
                      alt="mediaItem"
                      className="w-[540px] h-[350px] hidden md:block rounded-md"
                      width={540}
                      height={350}
                      style={{ objectFit: "cover" }}
                      src={"/Image/mosaIM88Uk.jpeg"}
                    />
                    <Image
                      alt="mediaItem"
                      className="w-[350px] h-[350px] hidden md:block rounded-md"
                      width={350}
                      height={350}
                      src={"/Image/mosaLIGRXV.jpeg"}
                    />  
                    <div className='flex w-[350px] flex-col gap-3'>
                        <Image
                          alt="mediaItem"
                          className="w-[170px] h-[170px] hidden md:block rounded-md"
                          width={170}
                          height={170}
                          src={"/Image/mosahxUYLJ.jpeg"}
                        />   
                        <Image
                          alt="mediaItem"
                          className="w-[170px] h-[170px] hidden md:block rounded-md"
                          width={170}
                          height={170}
                          src={"/Image/mosa14XYZX.jpeg"}
                        /> 
                  </div>  
          </div>
           </div>
    
         </section>
  )
}

export default ImageGallery
