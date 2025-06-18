import React from 'react'
import { PiCoffeeThin } from "react-icons/pi";
import { CiMobile4 } from "react-icons/ci";
import { BsTelephone } from "react-icons/bs";
import { IoPersonOutline } from "react-icons/io5";

const phone = () => {
  return (
              <div className="w-full md:w-[1100px] flex flex-col items-center justify-center">
                
                  <a href="" className="bg-[#7f88e8] w-full md:w-[1100px] md:h-[70px] h-[45px] flex flex-row md:pl-0 pl-3 lg:px-8 items-center md:justify-center justify-start gap-2">
                      <BsTelephone className='text-white text-[23px]'/>
                      <div className="text-white md:text-[18px] text-[15px]">
                        밥.&nbsp;김치&nbsp;제공(고시텔&nbsp;-&nbsp;101동)
                      </div>
                  </a>   
            

                 <div className='md:mt-6 mt-3' />
              
                  <a href="tel:010-3896-0696" className="w-full md:w-[1100px] md:h-[70px] h-[45px] flex flex-row lg:px-8 md:pl-0 pl-3 items-center md:justify-center justify-start border-1 border-[#d9d8d8] gap-2">
                    <CiMobile4 className='text-[#7f88e8] text-[23px]' />
                    <span className="md:text-[18px] text-[15px] text-[#7f88e8]">
                      입실문의&nbsp;010-8799-5999&nbsp;[클릭연결]&nbsp;▶▶▶
                    </span>
                </a>   


                 <div className='md:mt-3 mt-0' />

                   <a href="tel:033-251-4900" className="w-full md:w-[1100px] md:h-[70px] h-[45px] flex flex-row lg:px-8 md:pl-0 pl-3 items-center md:justify-center justify-start border-1 border-[#d9d8d8] gap-2">
                    <CiMobile4 className='text-[#7f88e8] text-[23px]' />
                    <span className="md:text-[18px] text-[15px] text-[#7f88e8]">
                      입실문의&nbsp;033-251-4900&nbsp;[클릭연결]&nbsp;▶▶▶
                    </span>
                </a>   
              </div>
  )
}

export default phone
