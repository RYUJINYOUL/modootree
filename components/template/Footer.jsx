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
                  <span className="item_description">바른부동산 공인중개사무소</span>
                </li>
                 <li className='text-[#959595] text-[13px]'>
                  <span className="item_title">대표자 : </span>
                  <span className="item_description">차삼철</span>
                </li>
                 <li className='text-[#959595] text-[13px]'>
                  <span className="item_title">전화번호 : </span>
                  <span className="item_description">031-523-3044</span>
                </li>
                 <li className='text-[#959595] text-[13px]'>
                  <span className="item_title">이메일 : </span>
                  <span className="item_description">soft3722@naver.com</span>
                </li>
                 <li className='text-[#959595] text-[13px]'>
                  <span className="item_title">주소 : </span>
                  <span className="item_description">
                    경기도 남양주시 강변북로 664번길 2 (수석동)
                  </span>
                </li>
                 <li className='text-[#959595] text-[13px]'>
                  <span className="item_title">사업자정보 : </span>
                  <span className="item_description">695-36-00700</span>
                </li>
                 <li className='text-[#959595] text-[13px]'>
                  <span className="item_title">기타 :</span>
                  <span className="item_description">등록번호 제41360-2019-60141호</span>
                </li>

                 <div className='mt-5'/>  
                        
                        <a href='https://m.search.naver.com/search.naver?query=%EB%82%A8%EC%96%91%EC%A3%BC%EC%B0%BD%EA%B3%A0%EB%B0%95%EC%82%AC%40' target='_blank'>
                        <li className='text-[#959595] p-2 text-[13px] border-1 border-[#9d9d9d]'>
                          <span className="item_title">남양주창고박사</span>
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