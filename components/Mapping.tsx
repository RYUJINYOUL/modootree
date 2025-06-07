import React from 'react'
import { CiMap } from "react-icons/ci";
import { HiArrowTurnRightUp } from "react-icons/hi2";
import { useRouter } from 'next/navigation'
import { HiPhone } from "react-icons/hi2";
import { PiCalendarCheck } from "react-icons/pi";
import { AiOutlineCar } from "react-icons/ai";
import { IoWifiOutline } from "react-icons/io5";
import { FaCircleExclamation } from "react-icons/fa6";
import useUIState from "@/hooks/useUIState";
import Map from "@/components/map"

const Mapping = () => {
   const { push } = useRouter();
   const { homeCategory, setHomeCategory, setHeaderImageSrc } = useUIState();

   const onClickCategory = (item:any ,src:any) => {
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
    <div className='lg:my-10 p-3.5'>
    <section className='flex flex-col justify-center items-center'>
    <div className='lg:mt-13' />
      <div className='flex flex-col'>
      <div className='flex md:flex-row flex-col md:justify-between items-start lg:w-[1100px] w-screen'>
          <div className='lg:px-0 px-3 flex flex-col h-[40px] justify-end'>
          <div className='lg:text-start font-semibold text-center text-[20px] md:text-[#7f88e8] text-[#000000]'>오시는길</div>
          <hr className="mt-1 h-0.5 md:bg-[#7f88e8] bg-white border-t-0 bg-neutral-700 opacity-100 w-[70px] dark:opacity-50"/>
       </div>
       <div className='flex flex-col md:h-[40px] h-[20px] justify-end'>
          <div className='lg:text-end md:block hidden text-center text-[14px]' onClick={() => {onClickCategory("내부시설" ,"/si")}}>더보기 &nbsp;&gt;</div>
          <hr className="mt-1 h-0.5 hidden md:block border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-[1030px]"/>
       </div>
       </div>
       </div>
      </section>

      

        <section className='md:mt-7 mt-0 flex justify-center items-center'>
        <div className='md:w-[1100px] md:h-[500px] w-[390px] h-[250px]'>
          <Map />
        </div>
        </section>


        <div className='md:mt-8 mt-2' />
    
    <div className='md:block hidden'>
    <section className='flex flex-col justify-center items-center'>
      <div className='w-[1100px] flex flex-row justify-between items-center'>
        <div className='flex flex-col'>
          <div className='lg:text-start text-center text-[15px]'>강대리빙텔</div>
          <div className='mt-1' />
          <div className='lg:text-start font-semibold text-[#7f88e8] text-center text-[26px]'>강원도 춘천시 효자동 174-1 (공지로280번길 22)</div>
          <div className='mt-8' />
        </div>
        <div className='flex flex-row gap-2'>
          <div className='flex flex-row gap-1.5 lg:text-start text-center text-[15px] p-2 bg-[#7f88e8] text-white'>
          <HiArrowTurnRightUp className='text-[20px]'/>
          <div className='text-white' onClick={() => {window.open("https://map.naver.com/p/directions/-/14219435.142439893,4560752.362414806,%EA%B0%95%EB%8C%80%EB%A6%AC%EB%B9%99%ED%85%94,,/-/transit?c=15.00,0,0,0,dh")}}>길찾기</div>
          </div>
          <div className='flex flex-row gap-1.5 lg:text-start text-center text-[15px] p-2 bg-[#7f88e8] text-white'>
          <CiMap className='text-[20px]'/>
          <div className='text-white' onClick={() => {window.open("https://map.naver.com/p?title=%EA%B0%95%EB%8C%80%EB%A6%AC%EB%B9%99%ED%85%94&lng=127.7353592&lat=37.8676949&zoom=21&type=0&c=15.00,0,0,0,dh")}}>지도에서 보기</div>
          </div>
        </div>  
      </div>
    </section>

  

      <div className='mt-7' />
    
      <section className='flex flex-col justify-center items-center'>
      <div className='w-[1100px] flex flex-col'>
        <hr className="my-1 h-0.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50"/>
        <div className='mt-7' />
        <div className='flex flex-row gap-30'>
          <div className='flex flex-row gap-1.5 lg:text-start text-center text-[15px]'>
          <HiPhone className='text-[20px] text-gray-400'/>
          <div className=''>전화번호</div>
          </div>
          <div className='flex flex-col'>
           <div className='text-[15px] text-[#888] text-start'><a href="tel:010-8799-5999" className="_callTel">
            010-8799-5999
          </a></div>
          <div className='mt-2' />
          <div className='text-[15px] text-[#888] text-start'><a href="tel:033-251-4900" className="_callTel">
            033-251-4900
          </a></div>
          </div>
        </div>  
        <div className='mt-7' />
        <hr className="my-1 h-0.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50"/>
      </div>
      </section>



       <div className='mt-7' />
    
      <section className='flex flex-col justify-center items-center'>
      <div className='w-[1100px] flex flex-col'>
        <div className='flex flex-row gap-30'>
          <div className='flex flex-row gap-1.5 lg:text-start text-center text-[15px]'>
          <FaCircleExclamation className='text-[20px] text-gray-400'/>
          <div className=''>이용안내</div>
          </div>
           <div className='text-[15px] text-[#888] text-start'>
             <div className="flex flex-col">
            {" "}
            <span className="flex flex-row gap-12">
              <span className="flex flex-col gap-2">
                  <AiOutlineCar className='text-[30px] text-[#888]'/>
                  <span className="sub_title text-[15px] text-[#888]">주차</span>
              </span>
             <span className="flex flex-col items-center justify-center gap-2">
                  <IoWifiOutline className='text-[30px] text-[#888]'/>
                  <span className="sub_title text-[15px] text-[#888]">무선인터넷</span>
              </span>
            </span>{" "}
          
          </div>
          </div>
        </div>  
        <div className='mt-7' />
        <hr className="my-1 h-0.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50"/>
      </div>
      </section>
      </div>


      

    <section className='md:hidden block'>
    <div className='flex flex-row gap-2'>
          <div className='flex rounded-md flex-row gap-1.5 lg:text-start text-center text-[12px] p-2 bg-[#7f88e8] text-white'>
          <HiArrowTurnRightUp className='text-[15px]'/>
          <div className='text-white' onClick={() => {window.open("https://map.naver.com/p/directions/-/14068354.2887583,4501803.3341385,%EC%98%81%EC%A2%85%EB%8B%A4%ED%95%A8%EB%8B%A8%EC%8B%9D%ED%95%98%EC%9A%B0%EC%8A%A4,13492349,PLACE_POI/-/transit?c=14.00,0,0,0,dh")}}>길찾기</div>
          </div>
          <div className='flex flex-row gap-1.5 rounded-md lg:text-start text-center text-[12px] p-2 bg-[#7f88e8] text-white'>
          <CiMap className='text-[15px]'/>
          <div className='text-white' onClick={() => {window.open("https://map.naver.com/p/entry/place/13492349?c=13.00,0,0,0,dh")}}>지도에서 보기</div>
          </div>
        </div>  
    </section>

    <section className='md:hidden block flex justify-center items-center'>
    <div className='flex md:p-0 p-3 flex-col w-full'>
      <div className='md:mt-10 mt-2' />
      <div className='md:text-[15px] text-[#222] font-bold text-start'>강대리빙텔</div>
        <div className='mt-1' />
        <div className='text-[15px] text-[#888] text-start'>강원도 춘천시 효자동 174-1 (공지로280번길 22)</div>
        <div className='mt-5' />
         <div className='md:text-[15px] text-[#222] font-bold text-start'>전화번호</div>
        <div className='mt-1' />
        <div className='text-[15px] text-[#888] text-start'><a href="tel:010-8799-5999" className="_callTel">
            010-8799-5999
          </a></div>
           <div className='text-[15px] text-[#888] text-start'><a href="tel:033-251-4900" className="_callTel">
            033-251-4900
          </a></div>
        <div className='mt-5' />
      
         <div className='md:text-[15px] text-[#222] font-bold text-start'>이용안내</div>
        <div className='mt-1' />
        <div className='text-[15px] text-start'>

          <div className="flex flex-col">
            {" "}
            <span className="flex flex-row gap-8">
             
              <span className="flex flex-col gap-2">
                  <AiOutlineCar className='text-[25px] text-[#888]'/>
                  <span className="sub_title text-[12px] text-[#888]">주차</span>
              </span>
             <span className="flex flex-col items-center justify-center gap-2">
                  <IoWifiOutline className='text-[25px] text-[#888]'/>
                  <span className="sub_title text-[12px] text-[#888]">무선인터넷</span>
              </span>
            </span>{" "}
          </div>
          
        </div>
       

        <div className='mt-5' />
      </div>  
     </section>  

     <div className='flex flex-col md:w-[530px] w-full'>
          <div className='md:hidden block flex flex-col h-[40px] justify-end'>
          <hr className="mt-1 h-0.5 md:hidden block border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-full"/>
          <div className='md:mt-3 mt-3' />
          <div className='lg:text-end text-center md:hidden block text-[14px]' onClick={() => {onClickCategory("내부시설" ,"/si")}}>더보기 &nbsp;&gt;</div>
       </div>
       </div>
     </div>
  )
}

export default Mapping
