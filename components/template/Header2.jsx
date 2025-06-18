"use client"
import React, { useEffect, useState, useRef } from 'react'
import Logo from '../elements/Logo'
import Menu from '@/components/Menu'
import Menu2 from '@/components/Menu2'
import Navigator from '../elements/Navigator'
import PagePadding from '../PagePadding'
import useUIState from "@/hooks/useUIState";
import Gallery from '@/components/Gallery3'
import { usePathname } from 'next/navigation'

import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { GiHamburgerMenu } from "react-icons/gi";
import { cn } from "@/lib/utils";


const HeaderDrawer = ({ children }) => {
  return (<Drawer direction='left'>
  <DrawerTrigger>{children}</DrawerTrigger>
  <DrawerContent className='w-[320px] h-full'>
  <nav className='w-[320px] h-full border-r-[1px] border-neutral-600 '>
        <div className='p-[24px]'><Logo total={true}/></div>
        <div className='bg-[#001391] h-full'><Navigator /></div>
      </nav>
  </DrawerContent>
</Drawer>
  );
}



const Header2 = ({children}) => {
   const pathname = usePathname()
   const [isScrolled, setIsScrolled] = useState(false);
   const { homeCategory, setHomeCategory, headerImageSrc, setHeaderImageSrc } = useUIState();
   const headRef = useRef();

     let slides = [
      "/Image/mosaaFt8g5.jpeg", 
      "/Image/mosa0msFcl.jpeg", 
      "/Image/mosaevHokF.jpeg"
   ]

     let slides2 = [
      "/Image/mosazVGMql.jpeg",
      "/Image/mosaUDiHWf.jpeg",
      "/Image/mosaIb3sFu.jpeg"
     ]

 

   useEffect(() => {
      const handleScroll = () => {
        const scrollValue = headRef?.current?.scrollTop;
        // console.log("-->scrollValue", scrollValue);
        setIsScrolled(scrollValue !== 0);
      };
  
      headRef?.current?.addEventListener("scroll", handleScroll);
      return () => {
        headRef?.current?.removeEventListener("scroll", handleScroll);
      }
    }, []);




  return (
    <header ref={headRef} className="overflow-y-auto w-full h-full">
      
     <section className="relative top-0 w-full">
        <div className={cn('block sticky top-100 w-full', (pathname !== "/")&&"hidden")}><Gallery /></div>
      </section>

       <PagePadding>  
   <section className={cn('absolute w-full top-0 left-0 flex md:h-[62px] h-[55px] z-10 items-start md:justify-center', 
    isScrolled&&"md:bg-white bg-[#001391]", 
    homeCategory === "시설안내"&&"lg:h-[101px] h-[100px]",
    pathname !== "/"&&"md:bg-white bg-[#001391]"
    )}>
      
   <div className='flex flex-col'>
      <div className='md:absolute sm:absolute lg:relative lg:w-[1100px] items-center w-full md:justify-between sm:justify-between'>
          <section className='flex flex-row items-center md:h-[62px] h-[50px] '>
            <HeaderDrawer>
              <article className='md:hidden ml-2 pr-10'>
            <GiHamburgerMenu className={"md:text-black text-white"} size={30} />
              </article>
              </HeaderDrawer>
            <div className='lg:block hidden ml-2 pr-10'>
              <Logo total={isScrolled}/>
            </div>  

            <article>
            <Menu total={isScrolled} />
            </article>
        </section>
     </div> 
  <hr className="h-[0.1px] border-t-0 hidden md:block bg-[#bcbbbb] opacity-100 dark:opacity-50"/>
   

   {/* <div className='md:pt-1 mt-1 bg-[#fafafa]' /> */}


   </div>
   </section>
  </PagePadding>
 <section>{children}</section>

</header>
  )
}

export default Header2

