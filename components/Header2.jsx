"use client"
import React, { useEffect, useState, useRef } from 'react'
import Logo from './elements/Logo'
import Menu from '@/components/Menu'
import Menu2 from '@/components/Menu2'
import Navigator from './elements/Navigator'
import PagePadding from './PagePadding'
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
        <div className='bg-[#d6b79a] h-full'><Navigator /></div>
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
    "/Image/main1.jpeg"
     ,
    "/Image/main2.jpeg"
    ,
    "/Image/main3.jpeg"
     ,
     "/Image/main4.jpeg"
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
        <div className={cn('block sticky top-100 w-full', (pathname !== "/")&&"hidden")}><Gallery images={slides} /></div>
      </section>

       <PagePadding>  
   <section className={cn('absolute w-full top-0 left-0 flex h-[62px] z-10 items-start md:justify-center sm:justify-between', 
    isScrolled&&"md:bg-white bg-[#7f88e8]", 
    homeCategory === "시설둘러보기"&&"lg:h-[101px] h-[103px]",
    headerImageSrc !== "/"&&"md:bg-white bg-[#7f88e8]"
    )}>
      
   <div className='flex flex-col'>
      <div className='md:absolute sm:absolute lg:relative lg:w-[1100px] w-full items-center md:justify-between sm:justify-between'>
          <section className='flex flex-row items-center h-[60px]'>
            <HeaderDrawer>
              <article className='lg:hidden ml-2 sm:pr-10'>
            <GiHamburgerMenu className={"md:text-black text-white"} size={30} />
              </article>
              </HeaderDrawer>
            <div className='lg:block hidden ml-2 sm:pr-10'>
              <Logo total={isScrolled}/>
            </div>  

            <article>
            <Menu total={isScrolled} />
            </article>
        </section>
     </div> 

   

   {/* <div className='md:pt-1 mt-1 bg-[#fafafa]' /> */}

   <div className='flex w-full bg-[#fafafa] items-center justify-start'>
   <div className={cn('hidden h-[0px]', homeCategory === "시설둘러보기"&&"block h-[40px]")}>
     <article className={cn("md:relative sm:absolute lg:relative hidden md:top-10 lg:top-0 top-0 left-0 lg:w-[1100px]", 
      homeCategory === "시설둘러보기"&&"block")}>
          <Menu2 total={true} />
     </article>
     <div className='mt-0' />
      {/* <hr className="border-1 bg-neutral-100 opacity-100 dark:opacity-50 md:w-full w-[1100px]"/> */}
     </div>
    </div>
   </div>
   </section>
  </PagePadding>
 <section>{children}</section>

</header>
  )
}

export default Header2

