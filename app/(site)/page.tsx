"use client"
import React, { useState } from 'react'
import Image from "next/image";
import { HiPhone } from "react-icons/hi2";
import { useRouter } from 'next/navigation'
import { cn } from "@/lib/utils";
import Footer from '@/components/Footer';
import Mapping from '@/components/Mapping';
import useUIState from "@/hooks/useUIState";

const page = () => {
   const { push } = useRouter();
   const [ widths, setWidths ] = useState(false);
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
     
    <div>
  
      <section className='md:hidden block'>
          <hr className="h-2.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 md:w-[1000px] w-screen"/>
      </section>    

      <div className='md:mb-18 mb-4' />

     <section className='w-full flex flex-row items-center justify-center'>
      <div className="w-[1100px] md:block hidden items-center justify-center gap-1">
        <div className='flex flex-col'>
          <span className="text-[#7f88e8] text-center text-[15px]">010-8799-5999</span>
          <span className="text-[#333333] text-center text-[18px]" id="introText">
              강원대정문, 공대5분거리(법원뒤) 원룸,1.5룸,2룸, 풀옵션고시텔, 원룸.투룸텔
              춘천 최고의 최신시설과 보안시설 완비  
          </span>
           <span className="text-[#333333] text-center text-[18px]" id="introText">
            ** 밥. 김치 제공 (고시텔 - 101동)
          </span>
       </div>   
       <div className='mt-5'/>
      </div>
     </section> 
 

  {/* ---start--- */}
     <section className='md:hidden block flex flex-col justify-center items-center'>
      
      <div className='flex flex-col'>
      <div className='flex md:flex-row flex-col md:justify-between items-start lg:w-[1100px] w-screen'>
          <div className='lg:px-0 px-3 flex flex-col h-[40px] justify-end'>
            <div className='flex flex-row gap-2'>
              <HiPhone className='mt-1.5 text-[18px] text-[#000000]'/>
              <div className='lg:text-start font-semibold text-center text-[20px] text-[#000000]'>010-8799-5999</div>
            </div>
          <hr className="mt-1 h-0.5 md:bg-[#7f88e8] bg-white border-t-0 bg-neutral-700 opacity-100 w-[70px] dark:opacity-50"/>
       </div>
       </div>
       </div>
      
       
       <div className='md:mt-7 mt-2' />

       <div className='relative md:hidden block flex flex-row w-full px-3 py-1 justify-start items-start rounded-md gap-1'>
          <Image
            alt="mediaItem"
            className="w-[235px] h-[155px] rounded-md"
            width={235}
            height={155}
            src={"/Image/mosa0Dia0d.jpeg"}
          />
    
         <div className='flex flex-col gap-1'>
          <Image
            alt="mediaItem"
            className="w-[125px] h-[75px] rounded-md"
            width={125}
            height={75}
            src={"/Image/mosajs9fUJ.jpeg"}
          />  

          <Image
            alt="mediaItem"
              className="w-[125px] h-[75px] rounded-md"
            width={125}
            height={75}
            src={"/Image/mosaiMoiDM.jpeg"}
          />  
      
          <div className='absolute w-[30px] h-[30px] text-[16px] flex justify-center items-center text-white right-3.5 bottom-1.5 bg-black md:opacity-40 opacity-60'>68</div> 
  
          </div>
       </div>
     <div className='flex md:p-0 p-3 flex-col md:w-[1100px] w-full'>
        <div className='md:mt-10' />
          <div className='text-[15px] text-[#222222] block md:hidden truncate text-start'>
            강원대정문, 공대5분거리(법원뒤)</div>
          <div className='mt-1' />
          <div className='text-[15px] text-[#222222] md:hidden block truncate text-start'>
            원룸,1.5룸,2룸, 풀옵션고시텔, 원룸.투룸텔</div>
             <div className={cn('hidden text-[15px] text-[#222222] md:hidden truncate text-start', widths&&"block")}>
            춘천 최고의 최신시설과 보안시설 완비</div>
             <div className={cn('hidden text-[15px] text-[#222222] md:hidden truncate text-start', widths&&"block")}>
            ** 밥. 김치 제공 (고시텔 - 101동)</div>
          <div className='md:mt-10 mt-2' />
          <div className='md:hidden block flex flex-col h-[40px] justify-end'>
          <hr className="mt-1 h-0.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-full"/>
          <div className='md:mt-10 mt-3' />
          <div className='lg:text-end text-center text-[14px]' onClick={() => { widths ? setWidths(false) : setWidths(true)}}>{widths === false ? "열기" : "닫기"} &nbsp;</div>
          </div>
        </div>  
       </section>
    {/* ---end--- */}



    {/* ---start--- */}
      <section className='md:hidden block'>
      <div className='md:mb-18 mb-1'></div>
       <hr className="h-2.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 md:w-[1000px] w-screen"/>
       </section>
    {/* ---end--- */}
     
     
     
       <div className='md:mb-18 mb-4'></div>


   
    {/* ---start--- */}
    <section className='flex flex-col justify-center items-center'>
      
      <div className='flex flex-col'>
      <div className='flex md:flex-row flex-col md:justify-between items-start lg:w-[1100px] w-screen'>
          <div className='lg:px-0 px-3 flex flex-col h-[40px] justify-end'>
          <div className='lg:text-start font-semibold text-center text-[20px] md:text-[#7f88e8] text-[#000000]'>이용안내</div>
          <hr className="mt-1 h-0.5 md:bg-[#7f88e8] bg-white border-t-0 bg-neutral-700 opacity-100 w-[70px] dark:opacity-50"/>
       </div>
       <div className='flex flex-col md:h-[40px] h-[10px] justify-end'>
          <div className='lg:text-end md:block hidden text-center text-[14px]' onClick={() => {onClickCategory("내부시설" ,"/si")}}>더보기 &nbsp;&gt;</div>
          <hr className="mt-1 h-0.5 hidden md:block border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-[1030px]"/>
       </div>
       </div>
       </div>
      
       
       <div className='md:mt-7' />

      <div className='md:w-[1100px] w-full md:px-0 px-3 flex flex-row justify-start items-start md:gap-7 gap-1 rounded-md'>

       <Image
          alt="mediaItem"
        className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosawJnOJr.jpeg"}
        />
   

        <Image
          alt="mediaItem"
          className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosa37JnzD.jpeg"}
        />  

        <Image
          alt="mediaItem"
           className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosazD0onx.jpeg"}
        />   
      </div>

       <div className='md:mt-0 mt-1'/>

      <div className='md:hidden block md:w-[1100px] w-full md:px-0 px-3 flex flex-row justify-start items-start md:gap-7 gap-1 rounded-md'>
       <Image
          alt="mediaItem"
        className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosaXzIaZ6.jpeg"}
        />
   

        <Image
          alt="mediaItem"
          className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosau658pi.jpeg"}
        />  

        <Image
          alt="mediaItem"
           className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosaIYUwQ9.jpeg"}
        />   
      </div>

      <div className='md:mt-0 mt-1'/>

      <div className='md:hidden block md:w-[1100px] w-full md:px-0 px-3 flex flex-row justify-start items-start md:gap-7 gap-1 rounded-md'>
       <Image
          alt="mediaItem"
        className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosatpNBJw.jpeg"}
        />
   

        <Image
          alt="mediaItem"
          className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosap47im9.jpeg"}
        />  

        <Image
          alt="mediaItem"
           className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosaYkiage.jpeg"}
        />   
      </div>

      <div className='flex md:p-0 p-3 flex-col md:w-[1100px] w-full'>
        <div className='mt-5' />
        <div className='md:text-[20px] md:block hidden text-[#7f88e8] font-semibold text-[20px] text-start'>개인시설</div>
          <div className='md:mt-1 mt-0' />
          
          <div className='text-[15px] text-[#666] md:block hidden truncate text-start'>
            침대, 책상, 옷장, 냉장고, 세탁기, 에어컨 화장실, 샤워기, CCTV, 전자렌지, 도어락 인터넷, Wi-Fi</div>
          <div className='md:mt-3 mt-0' />
          <div className='md:text-[20px] md:block hidden text-[#7f88e8] font-semibold text-[20px] text-start'>공용시설</div>
          <div className='md:mt-1 mt-0' />
          <div className='text-[15px] text-[#666] md:block hidden text-start'>
            주방 냉장고, 전자렌지, 인덕션, 정수기, 식탁 엘리베이터, 도어락, CCTV, 화재감지기,경보기</div>
         
          <div className='md:mt-10 mt-0' />
          <div className='md:hidden block flex flex-col h-[40px] justify-end'>
          <hr className="mt-1 h-0.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-full"/>
          <div className='mt-3' />
          <div className='lg:text-end text-center text-[14px]' onClick={() => {onClickCategory("대표 상품 소개" ,"/dae")}}>더보기 &nbsp;&gt;</div>
          </div>
        </div>  
       </section>

    {/* ---end--- */}  

       <section className='md:hidden block'>
       <div className='md:mb-18 mb-1'></div>
       <hr className="h-2.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 md:w-[1000px] w-screen"/>
      </section>


       <div className='md:mb-18 mb-4'></div>
    

      {/* ---start--- */}  
       <section className='flex flex-col justify-center items-center'>
      
      <div className='flex flex-col'>
      <div className='flex md:flex-row flex-col md:justify-between items-start lg:w-[1100px] w-screen'>
          <div className='lg:px-0 px-3 flex flex-col h-[40px] justify-end'>
          <div className='lg:text-start font-semibold text-center text-[20px] md:text-[#7f88e8] text-[#000000]'>시설둘러보기</div>
          <hr className="mt-1 h-0.5 md:bg-[#7f88e8] bg-white border-t-0 bg-neutral-700 opacity-100 w-[110px] dark:opacity-50"/>
       </div>
       <div className='flex flex-col md:h-[40px] h-[10px] justify-end'>
          <div className='lg:text-end md:block hidden text-center text-[14px]' onClick={() => {onClickCategory("내부시설" ,"/si")}}>더보기 &nbsp;&gt;</div>
          <hr className="mt-1 h-0.5 hidden md:block border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-[990px]"/>
       </div>
       </div>
       </div>
      
       <div className='md:mt-7' />
        
       <div className='md:w-[1100px] w-full md:px-0 px-3 flex flex-row justify-start items-start md:gap-7 gap-1 rounded-md'>

        <Image
          alt="mediaItem"
        className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosapTi9lG.jpeg"}
        />
   

        <Image
          alt="mediaItem"
          className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosa0tPNd1.jpeg"}
        />  

        <Image
          alt="mediaItem"
           className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosazzlRst.jpeg"}
        />   
      </div>

       <div className='md:mt-0 mt-1'/>

      <div className='md:hidden block md:w-[1100px] w-full md:px-0 px-3 flex flex-row justify-start items-start md:gap-7 gap-1 rounded-md'>
        <Image
          alt="mediaItem"
        className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosad2oAnf.jpeg"}
        />
   

        <Image
          alt="mediaItem"
          className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosa8DNMqr.jpeg"}
        />  

        <Image
          alt="mediaItem"
           className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosaUg4MYi.jpeg"}
        />   
      </div>

      <div className='md:mt-0 mt-1'/>

      <div className='md:hidden block md:w-[1100px] w-full md:px-0 px-3 flex flex-row justify-start items-start md:gap-7 gap-1 rounded-md'>
         <Image
          alt="mediaItem"
        className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosazV1S1U.jpeg"}   
        />
   

        <Image
          alt="mediaItem"
          className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosaZppelt.jpeg"}
        />  

        <Image
          alt="mediaItem"
           className="md:w-[350px] md:h-[350px] w-[118px] h-[118px] rounded-md"
          width={350}
          height={350}
          src={"/Image/mosao63LFE.jpeg"}
        />   
        </div>

       <div className='md:mt-0 mt-7' />

       <div className='flex flex-col md:block hidden'>
          <div className='flex md:flex-row flex-col md:justify-between items-start lg:w-[1100px] w-screen'>
          <div className='lg:px-0 px-3 flex flex-col h-[40px] justify-end'>
          <div className='lg:text-start font-semibold text-center text-[20px] text-[#222222]'>[ 강원도 춘천시 효자동 174-1 ]</div>
       </div>
       </div>
       </div>

        
        <div className='flex flex-col md:w-[530px] w-full px-3'>
          <div className='md:hidden block flex flex-col h-[40px] justify-end'>
          <hr className="mt-1 h-0.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-full"/>
          <div className='mt-3' />
          <div className='lg:text-end text-center text-[14px]' onClick={() => {onClickCategory("내부시설" ,"/si")}}>더보기 &nbsp;&gt;</div>
       </div>
       </div>
        </section>
      {/* ---end--- */}  



        <section className='md:hidden block'>
        <div className='md:mb-18 mb-4'></div>
          <hr className="h-2.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 md:w-[1000px] w-screen"/>
      </section>    


         <Mapping/>

      <div className='md:h-[100px]' />
  
    
        <section className='md:hidden block'>
        <div className='md:mb-18 mb-1'></div>
          <hr className="h-2.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 md:w-[1000px] w-screen"/>
      </section>    

      <div className='md:mb-0 mb-4'></div>
    
     {/* 입실문의 시작 */}
     <section className='flex flex-col md:justify-center justify-start md:items-center items-start'>
         <div className='flex flex-col'>
      <div className='flex md:flex-row flex-col md:justify-between items-start lg:w-[1100px] w-screen'>
          <div className='lg:px-0 px-3 flex flex-col h-[40px] justify-end'>
          <div className='lg:text-start font-semibold text-center text-[20px] md:text-[#7f88e8] text-[#000000]'>입실문의</div>
          <hr className="mt-1 h-0.5 md:bg-[#7f88e8] bg-white border-t-0 bg-neutral-700 opacity-100 w-[70px] dark:opacity-50"/>
       </div>
       <div className='flex flex-col md:h-[40px] h-[20px] justify-end'>
          <div className='lg:text-end md:block hidden text-center text-[14px]' onClick={() => {onClickCategory("내부시설" ,"/si")}}>더보기 &nbsp;&gt;</div>
          <hr className="mt-1 h-0.5 hidden md:block border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-[1030px]"/>
       </div>
       </div>
       </div>
      
       <div className='md:mt-7'/>
        
        <div>
            <div className="p-5 md:w-[1100px] w-full flex md:flex-row flex-col md:justify-between justify-center md:items-center items-start md:gap-7 gap-1">
              
              <div className='md:[1100px] w-[350px]'>
                <span className="text-[#222222] font-semibold text-[16px]">
                  <a href="/?link=oknt2bfo&messageNo=524&mode=view">단기입실 문의드립니다.</a>
                  </span>
                <div className='mt-3 md:block hidden md:[1100px] w-full'/>
                  <p className="text-[#BBBBBB] text-[13px] md:h-[110px]">
                    <a href="/?link=oknt2bfo&messageNo=524&mode=view">비밀글입니다.</a>
                  </p>
                 <div className='mt-3 md:block hidden md:[1100px] w-full'/>
                  <span className="text-[#666666] text-[13px]">lsys****&nbsp;|&nbsp;</span>
                  <span className="text-[#AAAAAA] text-[13px]">2025.5.14</span>
              </div>

              <div className='mt-2' />
             <hr className="mt-1 h-0.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-full md:hidden block"/>
               <div className='mt-2' />

                <div className='md:[1100px] w-[350px]'>
                <span className="text-[#222222] font-semibold text-[16px]">
                  <a href="/?link=oknt2bfo&messageNo=524&mode=view">단기입실 문의드립니다.</a>
                  </span>
                <div className='mt-3 md:block hidden md:[1100px] w-full'/>
                  <p className="text-[#BBBBBB] text-[13px] md:h-[110px]">
                    <a href="/?link=oknt2bfo&messageNo=524&mode=view">비밀글입니다.</a>
                  </p>
                 <div className='mt-3 md:block hidden md:[1100px] w-full'/>
                  <span className="text-[#666666] text-[13px]">lsys****&nbsp;|&nbsp;</span>
                  <span className="text-[#AAAAAA] text-[13px]">2025.5.14</span>
              </div>

             <div className='mt-2' />
             <hr className="mt-1 h-0.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-full md:hidden block"/>
               <div className='mt-2' />

                <div className='md:[1100px] w-[350px]'>
                <span className="text-[#222222] font-semibold text-[16px]">
                  <a href="/?link=oknt2bfo&messageNo=524&mode=view">단기입실 문의드립니다.</a>
                  </span>
                <div className='mt-3 md:block hidden md:[1100px] w-full'/>
                  <p className="text-[#BBBBBB] text-[13px] md:h-[110px]">
                    <a href="/?link=oknt2bfo&messageNo=524&mode=view">비밀글입니다.</a>
                  </p>
                 <div className='mt-3 md:block hidden md:[1100px] w-full'/>
                  <span className="text-[#666666] text-[13px]">lsys****&nbsp;|&nbsp;</span>
                  <span className="text-[#AAAAAA] text-[13px]">2025.5.14</span>
              </div>
         </div>
        </div>

          <div className='flex flex-col'>
       </div>

        
        <div className='flex flex-col md:w-[530px] w-full px-3'>
          <div className='md:hidden block flex flex-col h-[40px] justify-end'>
          <hr className="mt-1 h-0.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-full"/>
          <div className='md:mt-3 mt-3' />
          <div className='lg:text-end text-center text-[14px]' onClick={() => {onClickCategory("내부시설" ,"/si")}}>더보기 &nbsp;&gt;</div>
       </div>
       </div>
     </section>
    {/* 입실문의 끝 */}




    <div className='md:h-[100px]' />
    <div className='md:mb-0 mb-4'></div>


      {/* 이미지 갤러리 시작 */}
      
    <section className='flex flex-col justify-center items-center'>
      
      <div className='flex flex-col'>
      <div className='flex md:flex-row flex-col md:justify-between items-start lg:w-[1100px] w-screen'>
          <div className='lg:px-0 px-3 flex flex-col md:h-[40px] h-[0px] justify-end'>
          <div className='lg:text-start md:block hidden font-semibold text-center text-[20px] text-[#7f88e8]'>이미지 갤러리</div>
          <hr className="mt-1 h-0.5 md:bg-[#7f88e8] bg-white border-t-0 bg-neutral-700 opacity-100 w-[110px] dark:opacity-50"/>
       </div>
       <div className='flex flex-col md:h-[40px] h-[0px] justify-end'>
          <div className='lg:text-end md:block hidden text-center text-[14px]' onClick={() => {onClickCategory("내부시설" ,"/si")}}>더보기 &nbsp;&gt;</div>
          <hr className="mt-1 h-0.5 hidden md:block border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-[990px]"/>
       </div>
       </div>
       </div>
      
       <div className='md:mt-7' />
    
        <div className='flex flex-col md:w-[530px] w-full'>
          <div className='md:hidden block flex flex-col md:h-[40px] h-[0px] justify-end'>
          <hr className="mt-1 h-0.5 md:block hidden border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-full"/>
          <div className='md:mt-3 mt-3' />
          <div className='lg:text-end text-center md:block hidden text-[14px]' onClick={() => {onClickCategory("내부시설" ,"/si")}}>더보기 &nbsp;&gt;</div>
       </div>
       </div>

       <div className='flex flex-col md:gap-5 gap-0'>
         <div className='md:w-[1100px] w-full md:px-0 px-3 flex md:flex-row flex-col justify-start items-start gap-5 rounded-md'>
              <Image
                  alt="mediaItem"
                  className="w-full h-[350px] hidden md:block rounded-md"
                  width={510}
                  height={350}
                  style={{ objectFit: "cover" }}
                  src={"/Image/mosa0Dia0d.jpeg"}
                />
                <Image
                  alt="mediaItem"
                  className="w-[350px] h-[350px] hidden md:block rounded-md"
                  width={350}
                  height={350}
                  src={"/Image/mosajs9fUJ.jpeg"}
                />  
                <div className='flex w-[350px] flex-col gap-3'>
                <Image
                  alt="mediaItem"
                  className="w-[170px] h-[170px] hidden md:block rounded-md"
                  width={170}
                  height={170}
                  src={"/Image/mosaiMoiDM.jpeg"}
                />   
                <Image
                  alt="mediaItem"
                  className="w-[170px] h-[170px] hidden md:block rounded-md"
                  width={170}
                  height={170}
                  src={"/Image/mosa0Dia0d.jpeg"}
                /> 
                </div>  
      </div>

      <div className='md:w-[1100px] w-full md:px-0 px-3 flex md:flex-row flex-col justify-start items-start gap-5 rounded-md'>
          <div className='flex w-[350px] flex-col gap-3'>
              <Image
                alt="mediaItem"
                className="w-[170px] h-[170px] hidden md:block rounded-md"
                width={170}
                height={170}
                src={"/Image/mosaiMoiDM.jpeg"}
              />   
              <Image
                alt="mediaItem"
                className="w-[170px] h-[170px] hidden md:block rounded-md"
                width={170}
                height={170}
                src={"/Image/mosa0Dia0d.jpeg"}
              />
          </div>
          <Image
            alt="mediaItem"
            className="w-full h-[350px] hidden md:block rounded-md"
            width={510}
            height={350}
            src={"/Image/mosajs9fUJ.jpeg"}
          />   
          <Image
            alt="mediaItem"
            className="w-[350px] h-[350px] hidden md:block rounded-md"
            width={350}
            height={350}
            style={{ objectFit: "cover" }}
            src={"/Image/mosa0Dia0d.jpeg"}
          />  
        </div>  
       
       <div className='md:w-[1100px] w-full md:px-0 px-3 flex md:flex-row flex-col justify-start items-start gap-5 rounded-md'>
              <Image
                  alt="mediaItem"
                  className="w-full h-[350px] hidden md:block rounded-md"
                  width={510}
                  height={350}
                  style={{ objectFit: "cover" }}
                  src={"/Image/mosa0Dia0d.jpeg"}
                />
                <Image
                  alt="mediaItem"
                  className="w-[350px] h-[350px] hidden md:block rounded-md"
                  width={350}
                  height={350}
                  src={"/Image/mosajs9fUJ.jpeg"}
                />  
                <div className='flex w-[350px] flex-col gap-3'>
                    <Image
                      alt="mediaItem"
                      className="w-[170px] h-[170px] hidden md:block rounded-md"
                      width={170}
                      height={170}
                      src={"/Image/mosaiMoiDM.jpeg"}
                    />   
                    <Image
                      alt="mediaItem"
                      className="w-[170px] h-[170px] hidden md:block rounded-md"
                      width={170}
                      height={170}
                      src={"/Image/mosa0Dia0d.jpeg"}
                    /> 
              </div>  
      </div>
       </div>

     </section>
    {/* 이미지 갤러리 끝 */}


   <div className='md:h-[100px]' />
      <Footer />
   </div>
   
 )
}

export default page;