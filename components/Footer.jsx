import Image from "next/image";
import PagePadding from '@/components/PagePadding';

const Footer = () => {


return (
     
    <section>
    
     <section className='md:hidden block'>
          <hr className="h-2.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 md:w-[1000px] w-screen"/>
     </section>       
     <PagePadding>     
     <div className='mt-7'/>
         <div className='md:mb-18 mb-4'>
         <div className='w-full flex flex-col justify-center items-center gap-3'>
   
          <Image
             alt="logo"
             className="object-cover rounded-full"
             width={70}
             height={70}
             src={"/Image/mainmiddle.jpeg"}
           />  
        
             <ul className="list_info flex flex-col items-center">
                 <li className='text-[#000000] text-[15px] font-semibold'>
                   <span className="item_description">강대리빙텔</span>
                 </li>
                 <li className='text-[#959595] text-[13px]'>
                   <span className="item_title">대표자 : </span>
                   <span className="item_description"> 전두석</span>
                 </li>
                 <li className='text-[#959595] text-[13px]'>
                   <span className="item_title">전화번호 : </span>
                   <span className="item_description"><a href="tel:010-3896-0696" className="_callTel">
                      033-251-4900
                    </a></span>
                 </li>
                 <li className='text-[#959595] text-[13px]'>
                   <span className="item_title">이메일 : </span>
                   <span className="item_description">jds90000@naver.com</span>
                 </li>
                <li className='text-[#959595] text-[13px]'>
                   <span className="item_title">주소 : </span>
                   <span className="item_description">강원도 춘천시 공지로280번길 22 (효자동 174-1)</span>
                 </li>
                <li className='text-[#959595] text-[13px]'>
                   <span className="item_title">사업자정보 : </span>
                   <span className="item_description">221-81-44720</span>
                 </li>
                 <li className='text-[#959595] text-[13px]'>
                   <span className="item_title">기타 : </span>
                   <span className="item_description">H.P 010-8799-5999</span>
                 </li>
                 <div className='mt-5'/>  
                 
                 <a href='https://m.search.naver.com/search.naver?query=%EA%B0%95%EB%8C%80%EB%A6%AC%EB%B9%99%ED%85%94+%EA%B0%95%EB%8C%80%EA%B3%A0%EC%8B%9C%ED%85%94+%EA%B3%A0%EC%8B%9C%EC%9B%90%40' target='_blank'>
                 <li className='text-[#959595] p-2 text-[13px] border-1 border-[#9d9d9d]'>
                   <span className="item_title">강대리빙텔 강대고시텔 고시원@ </span>
                 </li>
                 </a>
               </ul>
           </div>
         </div>
          </PagePadding> 
      <div className='mt-7'/>    
      <section className='md:hidden block'>
          <hr className="h-2.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 md:w-[1000px] w-screen"/>
      </section>   
     </section>
 )
}

export default Footer;