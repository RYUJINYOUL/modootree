import {FloatButton} from "antd";
import { MessageFiled, PlusOutlined, UserAddOutlined, FileAddOutlined } from "@ant-design/icons"

export default function FloatingMenu() {

  function float () {
      console.log("gggg")
  }
 

   return <div className="fixed right-10 bottom-10 pb-4 flex flex-col gap-3">
           <a href="https://api.whatsapp.com/send?phone=337776655" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center w-12 h-12 xs:w-10 xs:h-10 bg-green-500 text-white rounded-full shadow-lg transition-transform hover:scale-110">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.52 3.48A11.92 11.92 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.12 1.6 5.91L0 24l6.27-1.62A11.93 11.93 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.19-1.24-6.18-3.48-8.52zM12 22a9.93 9.93 0 0 1-5.1-1.39l-.36-.21-3.72.96.99-3.63-.24-.37A9.93 9.93 0 0 1 2 12c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zm5.27-7.05c-.29-.14-1.72-.84-1.98-.94-.27-.1-.47-.14-.66.14-.2.29-.76.94-.93 1.13-.17.2-.34.22-.63.07-.29-.14-1.24-.46-2.37-1.47a8.77 8.77 0 0 1-1.63-2.03c-.17-.29-.02-.45.13-.59.13-.13.29-.34.43-.51.14-.17.2-.29.29-.48.1-.2.05-.37-.02-.51-.07-.14-.66-1.59-.9-2.18-.24-.57-.49-.49-.66-.5h-.56c-.2 0-.52.07-.8.37-.29.29-1.04 1.02-1.04 2.48 0 1.45 1.06 2.85 1.2 3.05.14.2 2.1 3.21 5.09 4.5.71.31 1.26.5 1.69.64.71.22 1.36.19 1.87.12.57-.08 1.72-.7 1.96-1.37.24-.67.24-1.24.17-1.37-.07-.14-.26-.2-.55-.34z" />
            </svg>
          </a>
        
          <a href="mailto:contat@exaple.com"
            className="flex items-center justify-center w-12 h-12 xs:w-10 xs:h-10 bg-blue-600 text-white rounded-full shadow-lg transition-transform hover:scale-110">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4C2.897 4 2 4.897 2 6v12c0 1.103.897 2 2 2h16c1.104 0 2-.897 2-2V6c0-1.103-.896-2-2-2zm0 2v.511l-8 5.333-8-5.333V6h16zM4 18V8.489l8 5.333 8-5.333V18H4z" />
            </svg>
          </a>
        
          <a href="http://localhost:3000/map"
            target="_self"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-12 h-12 xs:w-10 xs:h-10 bg-gradient-to-r from-pink-500 to-yellow-500 text-white rounded-full shadow-lg transition-transform hover:scale-110">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.2c3.2 0 3.584.012 4.85.07 1.17.054 1.97.24 2.43.403a4.92 4.92 0 0 1 1.78 1.045 4.92 4.92 0 0 1 1.045 1.78c.163.46.35 1.26.403 2.43.058 1.267.07 1.65.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.24 1.97-.403 2.43a4.92 4.92 0 0 1-1.045 1.78 4.92 4.92 0 0 1-1.78 1.045c-.46.163-1.26.35-2.43.403-1.267.058-1.65.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.97-.24-2.43-.403a4.92 4.92 0 0 1-1.78-1.045 4.92 4.92 0 0 1-1.045-1.78c-.163-.46-.35-1.26-.403-2.43C2.212 15.784 2.2 15.4 2.2 12s.012-3.584.07-4.85c.054-1.17.24-1.97.403-2.43A4.92 4.92 0 0 1 3.718 2.94 4.92 4.92 0 0 1 5.497 1.895c.46-.163 1.26-.35 2.43-.403C8.416 1.812 8.8 1.8 12 1.8zm0 1.8c-3.14 0-3.5.012-4.73.068-1.02.046-1.575.22-1.94.364a3.12 3.12 0 0 0-1.136.74 3.12 3.12 0 0 0-.74 1.136c-.144.365-.318.92-.364 1.94-.056 1.23-.068 1.59-.068 4.73s.012 3.5.068 4.73c.046 1.02.22 1.575.364 1.94.16.405.404.77.74 1.136.366.336.73.58 1.136.74.365.144.92.318 1.94.364 1.23.056 1.59.068 4.73.068s3.5-.012 4.73-.068c1.02-.046 1.575-.22 1.94-.364a3.12 3.12 0 0 0 1.136-.74 3.12 3.12 0 0 0 .74-1.136c.144-.365.318-.92.364-1.94.056-1.23.068-1.59.068-4.73s-.012-3.5-.068-4.73c-.046-1.02-.22-1.575-.364-1.94a3.12 3.12 0 0 0-.74-1.136 3.12 3.12 0 0 0-1.136-.74c-.365-.144-.92-.318-1.94-.364C15.5 4.012 15.14 4 12 4zm0 3.8a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4zm0 1.8a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8zm5.6-2.2a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
            </svg>
          </a>
          <button onClick={float()} className="bg-blue-500 hover:bg-blue-600 text-white rounded-full py-2 px-4 ">
            +
          </button>
        </div>

        
   
  //  <div className="absolute bottom-4 right-20 z-50">
      {/* <FloatButton />
      <FloatButton 
        icon={<MessageFiled />} 
        style={{right:80}} 
        tooltip="Chat"
        />

      <FloatButton 
        icon={<MessageFiled />} 
        style={{right:100, right: 80}}
        type="primary"
        description="SMS"
      />

      <FloatButton 
        icon={<MessageFiled />} 
        style={{right: 160}}
        shape="square"
      /> */}



      // <FloatButton.Group
      //   icon={<PlusOutlined />} 
      //   style={{right: 220}}
      //   shape="circle"
      //   trigger="click"
      // >

      //   <FloatButton 
      //     icon={<UserAddOutlined />} 
      //     shape="square"
      //     tooltip="Add User"
      //     onClick={()=>{

      //     }}
      //   />

      //   <FloatButton 
      //     icon={<FileAddOutlined />} 
      //     shape="square"
      //     tooltip="Add File"
      //   />
      // </FloatButton.Group>  





      {/* <FloatButton.Group
        icon={<UserAddOutlined />} 
        shape="square"
      >
      </FloatButton.Group>  

      <FloatButton.Group
        icon={<FileAddOutlined />} 
        shape="square"
      >
      </FloatButton.Group>   */}
  //  </div>

   //     return <div class = "group fixed bottom-10 right-10 p-2  flex items-end justify-end w-24 h-24 ">

  //     <div class = "text-white shadow-xl flex items-center justify-center p-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 z-50 absolute  ">
  //         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 group-hover:rotate-90 transition  transition-all duration-[0.6s]">
  //             <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
  //             <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  //         </svg>
  //     </div>
  
  //     <div class="absolute rounded-full transition-all duration-[0.2s] ease-out scale-y-0 group-hover:scale-y-100 group-hover:-translate-x-16   flex  p-2 hover:p-3 bg-green-300 scale-100 hover:bg-green-400 text-white">
  //         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
  //             <path stroke-linecap="round" stroke-linejoin="round" d="M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M3.75 18h15A2.25 2.25 0 0021 15.75v-6a2.25 2.25 0 00-2.25-2.25h-15A2.25 2.25 0 001.5 9.75v6A2.25 2.25 0 003.75 18z" />
  //         </svg>
  //     </div>

  //     <div class="absolute rounded-full transition-all duration-[0.2s] ease-out scale-x-0 group-hover:scale-x-100 group-hover:-translate-y-16  flex  p-2 hover:p-3 bg-blue-300 hover:bg-blue-400  text-white">
  //         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
  //             <path stroke-linecap="round" stroke-linejoin="round" d="M9.143 17.082a24.248 24.248 0 003.844.148m-3.844-.148a23.856 23.856 0 01-5.455-1.31 8.964 8.964 0 002.3-5.542m3.155 6.852a3 3 0 005.667 1.97m1.965-2.277L21 21m-4.225-4.225a23.81 23.81 0 003.536-1.003A8.967 8.967 0 0118 9.75V9A6 6 0 006.53 6.53m10.245 10.245L6.53 6.53M3 3l3.53 3.53" />
  //         </svg>
  //     </div>
 
  //     <div class="absolute rounded-full transition-all duration-[0.2s] ease-out scale-x-0 group-hover:scale-x-100 group-hover:-translate-y-14 group-hover:-translate-x-14   flex  p-2 hover:p-3 bg-yellow-300 hover:bg-yellow-400 text-white">
  //         <a href="http://localhost:3000/so" target="_blank"></a>
  //         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
  //             <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
  //         </svg>
  //     </div>
  // </div>
}