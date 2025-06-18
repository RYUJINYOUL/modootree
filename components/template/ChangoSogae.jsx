"use client";

import { Phone, MapPin, Share2, MessageCircle, MessageSquare } from "lucide-react";
import useUIState from "@/hooks/useUIState";
import Image from "next/image";
import { useRouter } from "next/navigation";



const ChangoSogae = () => {
  const { homeCategory, setHomeCategory, setHeaderImageSrc, headerImageSrc} = useUIState();
  const { push } = useRouter();
  


  const onClickCategory = (item, src) => {
      setHomeCategory(item);
      push(src, {scroll: false})
  };
 

  return (
       <div className="w-full sm:w-auto">
      <div className='relative w-full md:h-[200px]'>
   

          <div className="absolute top-3/5 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center px-4">

           

              <div className="mt-2"></div>

               <div className="flex flex-row w-full md:w-[1100px]">
                <div className="md:w-2/10 flex flex-col">
                   <img
                      src="/Image/mainmiddle.jpeg"
                      alt=""
                      className="md:block hidden w-[80px] h-[80px] md:text-start rounded-full md:mx-0 mx-auto mb-4 border-1 border-[#dcd8d8]"
                    />
                   <div className="md:text-[15px] md:text-start w-[300px] font-bold md:text-[#333333] text-white">
                    남양주창고박사 
                   </div>
                  <p className="text-[15px] md:text-[13px] md:text-[#999999] md:text-start text-white">
                    남양주 창고,공장,토지 전문부동산
                  </p>
                </div>
                 <div className="md:divide-x-1 md:bg-[#bcbbbb] bg-white border-t-0 opacity-100 md:w-[0.1px] dark:opacity-50"/>
                
                <div className="flex flex-col items-start justify-start w-full">
                  <div className="text-[15px] text-[#001391] md:block hidden text-start pl-10">
                    남양주 창고 공장 전문부동산
                  </div>
                  <div className="text-[18px] text-[#333333] md:block hidden text-start pl-10 mt-5">
                    구리/토평, 사노동, 수석동, 일패동, 이패동, 삼패동,덕소리, 와부읍, 진건읍, 진접읍, 화도읍, 별내동 일대 창고 전문 부동산입니다. 성실하고 책임감 있는 마음가짐으로 귀사의 최고의 사업장을 찾는 맞춤형 중개를 추구합니다. *창고종류* 1. 근린생활시설창고 (1,2종, 제조업, 공장, 체육시설) 2. 동,식물관련시설창고 (종묘배양장/훼손지 정비대상창고) 3. 지식산업센터 (공장형아파트) 4. 창고부지 (농지,잡종지,대지) 5. 공공이축권(개발제한구역 전문)
                  </div>
                </div>
              </div>
            </div>
        </div>
    </div>
  );
}


export default ChangoSogae;