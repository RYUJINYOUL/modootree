"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from "next/image";
import useUIState from "@/hooks/useUIState";


const Question = () => {
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
           <div className='md:mb-18 mb-4'></div>
   
    <section className='flex flex-col justify-center items-center'>
      
      <div className='flex flex-col'>
      <div className='flex md:flex-row flex-col md:justify-between items-start lg:w-[1100px] w-screen'>
          <div className='lg:px-0 px-3 pb-1 flex flex-col h-[40px] justify-end'>
            <div className='md:text-start font-semibold text-center text-[20px] md:text-[#001391] text-[#000000]'>자주묻는질문</div>
            <hr className="mt-1 h-0.5 md:bg-[#001391] bg-[#001391] border-t-0 opacity-100 w-[105px] dark:opacity-50"/>
          </div>
       <div className='flex flex-col md:h-[40px] h-[10px] justify-end'>
          <div className='lg:text-end md:block hidden text-center text-[14px]' onClick={() => {onClickCategory("자주묻는질문" ,"/so")}}>더보기 &nbsp;&gt;</div>
          <hr className="mt-1 h-0.5 hidden md:block border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-[990px]"/>
       </div>
       </div>
       </div>

       <div className='md:w-[1100px] w-full md:px-0 px-1 flex md:flex-col flex-row justify-center items-start md:gap-7 gap-1 rounded-md' onClick={() => {onClickCategory("자주묻는질문" ,"/so")}}>
           {/* pc */}
           <section className='md:block hidden flex flex-col justify-center items-center'>
                <div className='md:w-[1100px] w-full flex flex-col'>
                  {/* <hr className="my-1 h-0.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50"/> */}
                  <div className='md:mt-7' />
                  <div className='flex flex-row gap-30'>
                    <div className='flex flex-col gap-1.5 lg:text-start text-center text-[15px]'>
                  
                    <div className='text-[#001391] truncate text-[20px]'>현재 진행중인 할인 이벤트가 있나요?</div>
                    <div className='text-[#999999] truncate text-[15px]'>리뉴얼기념, 첫 달 15만원 이벤트 진행중입니다!</div>
                  </div>
                   
                 
                  </div>  
                  <div className='mt-7' />
                  <hr className="my-1 h-0.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50"/>
                </div>
             </section>
             <div className='md:mt-7' />
           <section className='md:block hidden flex flex-col justify-center items-center'>
                <div className='w-[1100px] flex flex-col'>
                  <div className='flex flex-row gap-30'>
                    <div className='flex flex-row gap-1.5 lg:text-start text-center text-[15px]'>
                  <div className='flex flex-col gap-1.5 lg:text-start text-center text-[15px]'>
                  
                    <div className='text-[#001391 truncate text-[20px]'>현재 입주가능한 방이 있나요?</div>
                    <div className='text-[#333333] truncate text-[15px]'>현재 입주가능한 방 목록은 전화주시거나 홈페이지에 입실문의를 남겨주시면 자세하게 안내해드리고 있습니다.</div>
                  </div>
                    </div>
                  </div>  
                  <div className='md:mt-7' />
                  <hr className="my-1 h-0.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50"/>
                </div>
             </section>
           {/* pc */}


           {/* 모바일 */}
            <section className='md:hidden block w-full'>
                <div className='w-full flex flex-col px-5'>
                    <div className='text-[#333333] truncate text-[17px]'>현재 진행중인 할인 이벤트가 있나요?</div>
                    <div className='mt-1' />
                    <div className='text-[#999999] truncate text-[16px]'>리뉴얼기념, 첫 달 15만원 이벤트 진행중입니다!</div>
                    <div className='mt-3' />
                    <div className='text-[#333333] truncate text-[17px]'>현재 입주가능한 방이 있나요?</div>
                    <div className='mt-1' />
                    <div className='text-[#999999] truncate text-[16px]'>현재 입주가능한 방 목록은 전화주시거나 홈페이지에 …</div>
                    <div className='mt-3' />
                    <div className='text-[#333333] truncate text-[17px]'>방 가격이 어떻게 되나요?</div>
                    <div className='mt-1' />
                    <div className='text-[#999999] truncate text-[16px]'>루틴그라운드의 방은 총 세 가지 타입으로 되어있으며…</div>
                    <div className='mt-3' />
                    <div className='text-[#333333] truncate text-[17px]'>방을 실제로 보고싶어요.</div>
                    <div className='mt-1' />
                    <div className='text-[#999999] truncate text-[16px]'>루틴그라운드는 현재 네이버 예약으로 방문투어 예약…</div>
                    <div className='mt-3' />
                    <div className='text-[#333333] truncate text-[17px]'>위치가 어떻게 되나요?</div>
                    <div className='mt-1' />
                    <div className='text-[#999999] truncate text-[16px]'>루틴그라운드는 구룡역 도보 5분에 위치해 강남권과 …</div>

                </div>
                   
             </section>
             </div>
           {/* 모바일 */}


             <div className='mt-7' />
              <div className='flex flex-col md:w-[530px] w-full px-3'>
                <div className='md:hidden flex flex-col h-[40px] justify-end'>
                <hr className="mt-1 h-0.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-full"/>
                <div className='md:mt-3 mt-3' />
                <div className='lg:text-end text-center text-[14px]' onClick={() => {onClickCategory("자주묻는질문" ,"/so")}}>더보기 &nbsp;&gt;</div>
              </div>
              </div>
          </section>      
    </div>
  )
}

export default Question
