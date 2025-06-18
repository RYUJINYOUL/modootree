"use client"
import React, { useRef } from "react"
// import Link from "next/link"
import { useState, useEffect } from 'react'
import useUIState from "@/hooks/useUIState";
import useUIState2 from "@/hooks/useUIState2";
import { cn } from "@/lib/utils"
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'



export default function Menu(props) {
  const { push } = useRouter();
  const pathname = usePathname()
  const { homeCategory, setHomeCategory, setHeaderImageSrc, headerImageSrc} = useUIState();
  const { homeCategory2, setHomeCategory2, setHeaderImageSrc2, headerImageSrc2} = useUIState2();
  let total = props
  const homeCategoryList = [
    {
      label: "강대리빙텔",
      src: "/",
    },
    {
      label: "이용안내",
      src: "/dastory",
    },
    {
      label: "시설둘러보기",
      src: "/dastory/pro",
    },
     {
      label: "오시는길",
      src: "/map",
    },
    {
      label: "입실문의",
      src: "/ta",
    },
  ];

 

  const onClickCategory = (item) => {
    if (homeCategory === item.label) {
      setHeaderImageSrc("");
      setHomeCategory(item.label);
    } else {
      setHeaderImageSrc(item.src);
      setHomeCategory(item.label);
      push(item.src, {scroll: false})
    }
  };

  useEffect(() => {
     if(pathname === "/") {
      setHomeCategory("강대리빙텔");
    } 
     if (pathname === "/dastory") {
      setHomeCategory("이용안내");
    }  
     if (pathname === "/dastory/pro") {
      setHomeCategory("시설둘러보기");
      setHomeCategory2("101동(고시텔)");
    }  
     if (pathname === "/map") {
      setHomeCategory("오시는길");
    } 
     if (pathname === "/ta") {
      setHomeCategory("입실문의");
    }  
     if (pathname === "/dastory/jun") {
      setHomeCategory("시설둘러보기");
      setHomeCategory2("103동(1.5룸,2룸)");
    }  
     if (pathname === "/dastory/reser") {
      setHomeCategory("시설둘러보기");
      setHomeCategory2("102동(1.5룸)");
    } 


    slideRight()
}, [pathname]);





const slideRight = () => {
  var slider = document.getElementById('nav');
    console.log(headerImageSrc)
  // console.log(slider.scrollWidth)
  // if (headerImageSrc === "/dastory") {
  //   slider.scroll(100, 200)
  // }
  if (headerImageSrc === "/ta") {
    slider.scroll(200, 400)
  }
  if (headerImageSrc === "/qu") {
    slider.scroll(300, 500)
  }
  if (headerImageSrc === "/map") {
    slider.scroll(500, 600)
  }
};
  
  return (
    <nav id="nav" className="md:m-0 ml-5 w-full+10 flex gap-3 overflow-x-auto md:pr-0 pr-4">
    {homeCategoryList.map((item, i) => {
      return (
        <div
          onClick={() => onClickCategory(item)}
          key={item.label}
          id={i}
          className={cn(
            "h-[62px] md:text-[16px] text-[15px] lg:text-white text-[#ffffff80] min-w-fit px-2 flex justify-center items-center hover:bg-gray-100",
            total.total&&"md:text-black text-[#ffffff80]",
            headerImageSrc !== "/"&&"lg:text-black",
            item.label === homeCategory &&
              "underline underline-offset-8 md:text-[17px] text-[16px] lg:text-[#7f88e8] text-white font-medium",
            headerImageSrc === "/"&&total.total&&"lg:text-black"
          )}
        >
            {item.label}
        </div>
        
      );
    })}
  </nav>
  )
}


