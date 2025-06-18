"use client"
import { useState } from "react";
import { CiPhone } from "react-icons/ci";
import { LuMapPin } from "react-icons/lu";
import { useRouter } from 'next/navigation'
import useUIState from "@/hooks/useUIState";

const FabButton = () => {
  const [openSubMenu, setOpenSubMenu] = useState(false);
  const { push } = useRouter()
  const { homeCategory, setHomeCategory, setHeaderImageSrc } = useUIState();
  const shownSubMenuHandler = () => {
    setOpenSubMenu((prev) => !prev);
  };
 
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
    <div className="fixed right-5 bottom-5 pb-4 flex flex-col gap-4">
      {/* <div className="gap-3"> */}
        {openSubMenu && (
          <ul>
           <a href="tel:010-9936-1642">
           <button className="bg-[#292e3b] flex items-center justify-center w-13 h-13 xs:w-11 xs:h-11 text-white rounded-full shadow-lg transition-transform hover:scale-110">
            <CiPhone className="w-6 h-6" />
           </button>
          </a>
  

          <button className="bg-[#292e3b] mt-3 flex items-center justify-center w-13 h-13 xs:w-11 xs:h-11 text-white rounded-full shadow-lg transition-transform hover:scale-110" 
          onClick={() => {onClickCategory("오시는 길" ,"/map")}}>
            <LuMapPin className="w-6 h-6" />
           </button>
             {/* <a href="mailto:contat@exaple.com"
            className="my-3 flex items-center justify-center w-12 h-12 xs:w-10 xs:h-10 bg-blue-600 text-white rounded-full shadow-lg transition-transform hover:scale-110">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4C2.897 4 2 4.897 2 6v12c0 1.103.897 2 2 2h16c1.104 0 2-.897 2-2V6c0-1.103-.896-2-2-2zm0 2v.511l-8 5.333-8-5.333V6h16zM4 18V8.489l8 5.333 8-5.333V18H4z" />
            </svg>
          </a> */}
        
            {/* <a href="http://localhost:3000/map"
            target="_self"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-12 h-12 xs:w-10 xs:h-10 bg-gradient-to-r from-pink-500 to-yellow-500 text-white rounded-full shadow-lg transition-transform hover:scale-110">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.2c3.2 0 3.584.012 4.85.07 1.17.054 1.97.24 2.43.403a4.92 4.92 0 0 1 1.78 1.045 4.92 4.92 0 0 1 1.045 1.78c.163.46.35 1.26.403 2.43.058 1.267.07 1.65.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.24 1.97-.403 2.43a4.92 4.92 0 0 1-1.045 1.78 4.92 4.92 0 0 1-1.78 1.045c-.46.163-1.26.35-2.43.403-1.267.058-1.65.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.97-.24-2.43-.403a4.92 4.92 0 0 1-1.78-1.045 4.92 4.92 0 0 1-1.045-1.78c-.163-.46-.35-1.26-.403-2.43C2.212 15.784 2.2 15.4 2.2 12s.012-3.584.07-4.85c.054-1.17.24-1.97.403-2.43A4.92 4.92 0 0 1 3.718 2.94 4.92 4.92 0 0 1 5.497 1.895c.46-.163 1.26-.35 2.43-.403C8.416 1.812 8.8 1.8 12 1.8zm0 1.8c-3.14 0-3.5.012-4.73.068-1.02.046-1.575.22-1.94.364a3.12 3.12 0 0 0-1.136.74 3.12 3.12 0 0 0-.74 1.136c-.144.365-.318.92-.364 1.94-.056 1.23-.068 1.59-.068 4.73s.012 3.5.068 4.73c.046 1.02.22 1.575.364 1.94.16.405.404.77.74 1.136.366.336.73.58 1.136.74.365.144.92.318 1.94.364 1.23.056 1.59.068 4.73.068s3.5-.012 4.73-.068c1.02-.046 1.575-.22 1.94-.364a3.12 3.12 0 0 0 1.136-.74 3.12 3.12 0 0 0 .74-1.136c.144-.365.318-.92.364-1.94.056-1.23.068-1.59.068-4.73s-.012-3.5-.068-4.73c-.046-1.02-.22-1.575-.364-1.94a3.12 3.12 0 0 0-.74-1.136 3.12 3.12 0 0 0-1.136-.74c-.365-.144-.92-.318-1.94-.364C15.5 4.012 15.14 4 12 4zm0 3.8a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4zm0 1.8a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8zm5.6-2.2a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
            </svg>
          </a>
          </ul>
        )} */}
         {/* <a href="http://localhost:3000/map"
            target="_self"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-12 h-12 xs:w-10 xs:h-10 bg-gradient-to-r from-pink-500 to-yellow-500 text-white rounded-full shadow-lg transition-transform hover:scale-110">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.2c3.2 0 3.584.012 4.85.07 1.17.054 1.97.24 2.43.403a4.92 4.92 0 0 1 1.78 1.045 4.92 4.92 0 0 1 1.045 1.78c.163.46.35 1.26.403 2.43.058 1.267.07 1.65.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.24 1.97-.403 2.43a4.92 4.92 0 0 1-1.045 1.78 4.92 4.92 0 0 1-1.78 1.045c-.46.163-1.26.35-2.43.403-1.267.058-1.65.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.97-.24-2.43-.403a4.92 4.92 0 0 1-1.78-1.045 4.92 4.92 0 0 1-1.045-1.78c-.163-.46-.35-1.26-.403-2.43C2.212 15.784 2.2 15.4 2.2 12s.012-3.584.07-4.85c.054-1.17.24-1.97.403-2.43A4.92 4.92 0 0 1 3.718 2.94 4.92 4.92 0 0 1 5.497 1.895c.46-.163 1.26-.35 2.43-.403C8.416 1.812 8.8 1.8 12 1.8zm0 1.8c-3.14 0-3.5.012-4.73.068-1.02.046-1.575.22-1.94.364a3.12 3.12 0 0 0-1.136.74 3.12 3.12 0 0 0-.74 1.136c-.144.365-.318.92-.364 1.94-.056 1.23-.068 1.59-.068 4.73s.012 3.5.068 4.73c.046 1.02.22 1.575.364 1.94.16.405.404.77.74 1.136.366.336.73.58 1.136.74.365.144.92.318 1.94.364 1.23.056 1.59.068 4.73.068s3.5-.012 4.73-.068c1.02-.046 1.575-.22 1.94-.364a3.12 3.12 0 0 0 1.136-.74 3.12 3.12 0 0 0 .74-1.136c.144-.365.318-.92.364-1.94.056-1.23.068-1.59.068-4.73s-.012-3.5-.068-4.73c-.046-1.02-.22-1.575-.364-1.94a3.12 3.12 0 0 0-.74-1.136 3.12 3.12 0 0 0-1.136-.74c-.365-.144-.92-.318-1.94-.364C15.5 4.012 15.14 4 12 4zm0 3.8a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4zm0 1.8a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8zm5.6-2.2a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
            </svg>
          </a> */}
          </ul>
        )}
      {/* </div> */}
      <button className="bg-[#292e3b] w-13 h-13 xs:w-11 xs:h-11 text-white rounded-full shadow-lg transition-transform hover:scale-110" onClick={shownSubMenuHandler}>
        {openSubMenu ? <h1>{"x"}</h1> : <h1>{"+"}</h1>}
      </button>

    </div>
  );
};
 
export default FabButton;