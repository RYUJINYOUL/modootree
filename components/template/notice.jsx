"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux';
import { getFirestore, collection, where, setDoc, onSnapshot, query, limit} from "firebase/firestore";
import app from '../../firebase';
import moment from 'moment';
import useUIState from "@/hooks/useUIState";

const Notice = () => {
  const db2 = getFirestore(app);
  const [message, setMessages] = useState([]);
  const { currentUser } = useSelector(state => state.user)
  const { push } = useRouter();
  const timeFromNow = timestamp => moment(timestamp).format('YYYY.MM.DD');
  const { homeCategory, setHomeCategory, setHeaderImageSrc } = useUIState();


  const TABLE_HEAD = ["번호", "글제목", "글쓴이", "작성일"];


  useEffect(() => {
    // addMessagesListener(new Map(categoryList2).get(homeCategory), reg)
    
    addMessagesListener()
 
    return () => {
    }
  }, [])


//   , orderBy('createdDate', 'desc'), limit(3)
  const addMessagesListener = async () => {

    const tweetsQuery = query(collection(db2, "reviews"), limit(3))

      await onSnapshot(tweetsQuery, (snapshot) => { // <---- 
        const tweetList = snapshot.docs.map((doc) => {
          const { name, description, url, 
            title, phoneNumber, createdDate, NumOfLikes, userKey,
          } = doc.data();
          const id = doc.id
          const date = doc.data().createdDate.toDate();
          return {
            name, description, url, 
            title, phoneNumber, date, NumOfLikes, userKey,
          };
        });
          setMessages(tweetList);
      });
  };


  const onClickCard = ({ title, name, description, date, id, password }) => {
      var enteredName=""
      if (currentUser.uid === "aRWcjBBQoHXE4qtZDJWzZ5P8hBE2" || password === "") {
        push(`/ta/playlist?id=${id}&title=${title}&name=${name}&des=${description}&date=${date}`)
      } else if (enteredName = prompt('비밀번호를 입력해주세요')) {
           if(enteredName === "12"){
               alert("방문해주셔서 감사합니다.")
              push(`/ta/playlist?id=${id}&title=${title}&name=${name}&des=${description}&date=${date}`)
           } else {
          alert("비밀번호가    fdfs틀립니다.")
          push("/ta");
           }      
      } else {
          alert("비밀번호가 틀립니다.")
          push("/ta");
      }
    // push(`/test/?name=${id}collection=${collection}`);
  };

 const onClickCategory = (item ,src) => {
    if (homeCategory === item) {
        console.log(src)
      setHeaderImageSrc("");
      setHomeCategory(item);
    } else {
      setHeaderImageSrc(src);
      setHomeCategory(item);
      push(src)
    }
  };



  return (
    <section className='flex flex-col md:justify-center justify-start md:items-center items-start mt-4'>
         <div className='flex flex-col'>
      <div className='flex md:flex-row flex-col md:justify-between items-start lg:w-[1100px] w-screen'>
          <div className='lg:px-0 px-3 flex flex-col h-[40px] justify-end'>
          <div className='lg:text-start font-semibold text-center text-[20px] md:text-[#001391] text-[#000000]'>게시판</div>
          <hr className="mt-1 h-0.5 md:text-[#001391] bg-[#001391] border-t-0 opacity-100 w-[60px] dark:opacity-50"/>
       </div>
       <div className='flex flex-col md:h-[40px] h-[20px] justify-end'>
          <div className='lg:text-end md:block hidden text-center text-[14px]' onClick={() => {onClickCategory("게시판" ,"/ta")}}>더보기 &nbsp;&gt;</div>
          <hr className="mt-1 h-0.5 hidden md:block border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-[1040px]"/>
       </div>
       </div>
       </div>
      
       <div className='md:mt-7'/>
        
        <div className='flex md:flex-row flex-col md:w-[1100px] w-full'> 
          
          {message.map(({ title, name, description, date }, index) => {
      
         return (
            <div key={index} className="p-5 md:w-[1100px] w-full flex flex-row">
              
              <div key={index} className='w-[330px] flex flex-col md:justify-between justify-center items-start md:gap-7 gap-1'
               onClick={()=> onClickCard({ title, name, description, date })}>
                
                <div className="text-[#222222] font-semibold text-[16px]">{title}</div>
                <div className="text-[#666666] text-[13px]">{description}</div>
                <div className='mt-3 flex flex-row w-[300px] items-start justify-start'>
                  <div className="text-[#666666] text-[13px]">{name}&nbsp;|&nbsp;</div>
                  <div className="text-[#AAAAAA] text-[13px]">{timeFromNow(date)}</div>
               </div>
             </div>
           </div>
           )})}
        </div>


          <div className='flex flex-col'>
       </div>

         <div className='md:mt-7 mt-3' />
        <div className='flex flex-col md:w-[530px] w-full px-3'>
          <div className='md:hidden flex flex-col h-[40px] justify-end'>
          <hr className="mt-1 h-0.5 border-t-0 bg-neutral-200 opacity-100 dark:opacity-50 w-full"/>
          <div className='md:mt-3 mt-3' />
          <div className='lg:text-end text-center text-[14px]' onClick={() => {onClickCategory("게시판" ,"/ta")}}>더보기 &nbsp;&gt;</div>
       </div>
       </div>
     </section>
  )
}

export default Notice
